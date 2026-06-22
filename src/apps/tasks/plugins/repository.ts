import fp from 'fastify-plugin'

import type {TasksRepository} from '../model.js';

declare module 'fastify' {
  interface FastifyInstance {
    tasksRepository: TasksRepository
  }
}

export default fp(async(instance) => {
  instance.log.debug('warmup cache')
  let lastId = 0 as number | null

  while(!(await instance.cache.use('l2').has({key: 'tasks.warm'}))) {
    const tasks = await instance.db.task.findMany({
      include: {
        status: true,
        statusHistory: {select: {status: true, createdAt: true}}
      },
      where: {deletedAt: null},
      omit: {deletedAt: true},
      take: 500,
      skip: lastId ? 1 : 0,
      cursor: lastId ? {id: lastId} : undefined,
      orderBy: {id: 'asc'}
    })

    for (const task of tasks) {
      await instance.cache.namespace('tasks').set({
        key: `${task.id}`,
        value: {
          ...task,
          statusHistory: task.statusHistory.map((statusChange) => ({
            ...statusChange.status,
            createdAt: statusChange.createdAt
          }))
        }
      })
    }

    lastId = tasks.at(-1)?.id ?? null

    if (!lastId) {
      await instance.cache.use('l2').set({key: 'tasks.warm', value: 1})
    }
  }
  instance.log.debug('cache is warmed up')

  instance.decorate('tasksRepository', {
    async list(filter) {
      return await instance.db.task.findMany({
        include: {
          status: true,
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
      return await instance.cache.namespace('tasks').getOrSet({
        key: `${id}`,
        factory: async(ctx) => {
          const value = await instance.db.task.findUnique({
            include: {
              status: true,
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
          }));

          if (!value) {
            ctx.setOptions({ttl: '1m'})
          }

          return value
        }
      })
    },
    async add(task) {
      const [assignee, status, [{id: rawId}]] = await Promise.all([
        task.assigneeId ? instance.usersApi.getUser(task.assigneeId) : null,
        task.statusId ? instance.db.status.findUnique({where: {id: task.statusId}}) : null,
        instance.db.$queryRaw<{id: number}[]>`select nextval('tasks_id_seq') as id`
      ])
      const id = Number(rawId)
      const newTask = {
        ...task,
        id,
        assignee,
        status,
        statusHistory: [{...status, createdAt: task.createdAt}]
      }

      await instance.cache.namespace('tasks').setForever({key: `${id}`, value: newTask})
      await instance.queues.taskSync.add(`task:${id}`, {id, data: newTask}, {
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
        task.assigneeId ? instance.usersApi.getUser(task.assigneeId) : null,
        task.statusId ? instance.db.status.findUnique({where: {id: task.statusId}}) : null
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

      await instance.cache.namespace('tasks').setForever({key: `${id}`, value: newTask})
      await instance.queues.taskSync.add(`task:${id}`, {id, data: newTask}, {
        delay: 1000,
        deduplication: {id: `task-${id}`, keepLastIfActive: true}
      })
    },
    async delete(id) {
      await instance.cache.namespace('tasks').set({key: `${id}`, value: null, ttl: '1m'})
      await instance.queues.taskSync.add(`task:${id}`, {id, data: null}, {
        delay: 1000,
        deduplication: {id: `task-${id}`, keepLastIfActive: true}
      })
    }
  })
}, {
  name: 'tasksRepository',
  dependencies: ['prisma', 'bentocache', 'bullmq', 'myip', 'usersApi'],
  decorators: {fastify: ['db', 'cache', 'queues', 'ip', 'usersApi']}
})
