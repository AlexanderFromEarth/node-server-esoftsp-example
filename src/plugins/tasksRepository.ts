import fp from 'fastify-plugin'

interface TaskView {
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
      get(id: Task['id']): Promise<Task | null>
      add(task: Omit<Task, 'id'>): Promise<Task['id']>
      set(id: Task['id'], task: Partial<Omit<Task, 'id' | 'createdAt'>> & {updatedAt: NonNullable<Task['updatedAt']>}): Promise<void>
      delete(id: Task['id']): Promise<void>
    }
  }
}

/**
 * Устанавливает данные задач.
 */
export default fp((instance) => {
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
      return await instance.prisma.task.findUnique({
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
    },
    async add(task) {
      return await instance.prisma.task.create({
        data: {
          assigneeId: task.assigneeId,
          title: task.title,
          statusId: task.statusId,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          ...task.statusId && {
            statusHistory: {create: [{statusId: task.statusId, createdAt: task.createdAt}]},
          }
        }
      }).then((task) => task.id)
    },
    async set(id, task) {
      await instance.prisma.task.update({
        where: {id, deletedAt: null},
        data: {
          title: task.title,
          assigneeId: task.assigneeId,
          statusId: task.statusId,
          updatedAt: task.updatedAt,
          ...task.statusId && {
            statusHistory: {create: [{statusId: task.statusId, createdAt: task.updatedAt}]}
          }
        }
      })
    },
    async delete(id) {
      await instance.prisma.task.update({
        where: {id},
        data: {deletedAt: new Date()},
      })
    }
  })
}, {name: 'tasksRepository', dependencies: ['prisma'], decorators: {fastify: ['prisma']}})
