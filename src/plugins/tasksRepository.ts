import fp from 'fastify-plugin'

export interface TaskView {
  id: number
  title: string
  assignee: {
    id: number
    name: string
    createdAt: Date
  } | null;
  status: {
    id: number
    title: string
    resolved: boolean
  } | null
  statusHistory: {
    id: number
    title: string
    resolved: boolean
    createdAt: Date
  }[]
  createdAt: Date
  updatedAt: Date | null
}

interface Task {
  id: number
  title: string
  assigneeId: number | null
  statusId: number | null
  createdAt: Date
  updatedAt: Date | null
}

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    tasksRepository: {
      list(filter?: Partial<{userId: number, resolved: boolean}>): Promise<Array<TaskView>>
      get(id: Task['id']): Promise<TaskView | null>
      add(task: Omit<Task, 'id'>): Promise<Task['id']>
      set(id: Task['id'], task: Partial<Omit<Task, 'id' | 'createdAt'>> & {updatedAt: NonNullable<Task['updatedAt']>}): Promise<void>
      delete(id: Task['id']): Promise<void>
    }
  }
}

/**
 * Устанавливает данные задач.
 */
export default fp(async(instance) => {
  // Решение проблемы холодного старта с помощью прогрева кэша
  instance.log.debug('warmup cache')
  let lastId = null as number | null

  // Если нет ключа считаем, что кэш еще не заполнен и нужно заполнить его
  while(!(await instance.redis.get('tasks:warm'))) {
    // Используем cursor-based пагинацию, чтобы эффективно вытащить все данные
    const tasks = await instance.prisma.task.findMany({
      include: {
        status: true,
        assignee: {omit: {deletedAt: true}},
        statusHistory: {select: {status: true, createdAt: true}}
      },
      where: {deletedAt: null},
      omit: {deletedAt: true},
      take: 500,
      skip: lastId ? 1 : 0,
      cursor: lastId ? {id: lastId} : undefined,
      orderBy: {id: 'asc'}
    })

    if (!tasks.length) {
      // Обработали все и поставили ключ
      await instance.redis.set('tasks:warm', JSON.stringify(1))
      break
    }

    // С помощью multi минимизируем количество обращений сетевых
    const mult = instance.redis.multi()

    for (const task of tasks) {
      mult.set(`tasks:${task.id}`, JSON.stringify({
        ...task,
        statusHistory: task.statusHistory.map((statusChange) => ({
          ...statusChange.status,
          createdAt: statusChange.createdAt
        }))
      }))
    }

    await mult.exec();
    lastId = tasks.at(-1)!.id
  }
  instance.log.debug('cache is warmed up')

  instance.decorate('tasksRepository', {
    async list(filter) {
      return await instance.prisma.task.findMany({
        include: {
          status: true,
          assignee: {omit: {deletedAt: true}},
          statusHistory: {select: {status: true, createdAt: true}}
        },
        where: {
          deletedAt: null,
          assigneeId: filter?.userId,
          status: {resolved: filter?.resolved}
        },
        omit: {deletedAt: true}
      }).then((tasks) => tasks.map((task) => ({
        ...task,
        statusHistory: task.statusHistory.map((statusChange) => ({
          ...statusChange.status,
          createdAt: statusChange.createdAt
        }))
      })))
    },
    async get(id) {
      let rawTask = await instance.redis.get(`tasks:${id}`)
      let task = null as TaskView | null

      if (!rawTask) {
        instance.log.debug(`read task:${id} from db`)
        task = await instance.prisma.task.findUnique({
          include: {
            status: true,
            assignee: {omit: {deletedAt: true}},
            statusHistory: {select: {status: true, createdAt: true}}
          },
          where: {id, deletedAt: null},
          omit: {deletedAt: true}
        }).then((task) => task && ({
          ...task,
          statusHistory: task.statusHistory.map((statusChange) => ({
            ...statusChange.status,
            createdAt: statusChange.createdAt
          }))
        }))
        await instance.redis.set(`tasks:${id}`, JSON.stringify(task), {
          ...!task && {expiration: {type: 'EX', value: 60}}
        })
      } else {
        instance.log.debug(`read task:${id} from cache`)
        task = JSON.parse(rawTask) as TaskView | null
      }

      return task
    },

    /**
     * При операции записи на пользователях мы используем стратегию
     * Write-Behind/Write-Back для одиночных записей с пулом задач на обновление через Set.
     * Операции объединяем в Redis транзакцию, чтобы минимизировать гонки.
     */

    async add(task) {
      const [assignee, status, id] = await Promise.all([
        task.assigneeId ? instance.usersRepository.get(task.assigneeId) : null,
        task.statusId ? instance.prisma.status.findUnique({where: {id: task.statusId}}) : null,
        instance.redis.incr('tasksID')
      ])
      const newTask = {
        ...task,
        id,
        assignee,
        status,
        statusHistory: [{...status, createdAt: task.createdAt}]
      }

      // Обновляем данные в кэше и добавляем в пул
      await instance.redis.set(`tasks:${id}`, JSON.stringify(newTask))
      await instance.jobs.taskSync.queue.add(`task:${id}`, {id, data: newTask}, {
        delay: 1000,
        deduplication: {id: `task-${id}`, keepLastIfActive: true}
      })

      return id
    },
    async set(id, task) {
      const exist = await instance.tasksRepository.get(id)

      if (!exist) {
        return
      }

      const [assignee, status] = await Promise.all([
        task.assigneeId ? instance.usersRepository.get(task.assigneeId) : null,
        task.statusId ? instance.prisma.status.findUnique({where: {id: task.statusId}}) : null
      ])
      const newTask = {
        ...exist,
        ...task,
        ...task.assigneeId !== undefined ? {assignee} : {},
        ...task.statusId !== undefined ? {
          status,
          statusHistory: [...exist.statusHistory, {...status, createdAt: task.updatedAt}]
        } : {},
      }

      // Обновляем данные в кэше и добавляем в пул
      await instance.redis.set(`tasks:${id}`, JSON.stringify(newTask))
      await instance.jobs.taskSync.queue.add(`task:${id}`, {id, data: newTask}, {
        delay: 1000,
        deduplication: {id: `task-${id}`, keepLastIfActive: true}
      })
    },
    async delete(id) {
      // Обновляем данные в кэше и добавляем в пул
      await instance.redis.set(`tasks:${id}`, JSON.stringify(null), {
        expiration: {type: 'EX', value: 60}
      })
      await instance.jobs.taskSync.queue.add(`task:${id}`, {id, data: null}, {
        delay: 1000,
        deduplication: {id: `task-${id}`, keepLastIfActive: true}
      })
    }
  })
}, {name: 'tasksRepository', dependencies: ['prisma', 'redis', 'bullmq'], decorators: {fastify: ['prisma', 'redis', 'jobs']}})
