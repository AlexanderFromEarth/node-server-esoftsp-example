import fp from 'fastify-plugin';

import type {Task} from '../model.js';

export default fp(async(instance) => {
  instance.onJob<{id: number, data: Task | null}>('taskSync', async(_, job) => {
    instance.log.debug(`start syncing ${job.data.id}`)

    const task = job.data.data;

    if (task) {
      await instance.db.task.upsert({
        where: {id: task.id},
        create: {
          id: task.id,
          assigneeId: task.assignee?.id,
          title: task.title,
          statusId: task.status?.id,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          statusHistory: {
            connectOrCreate: task.statusHistory
              .map(({id, createdAt}: any) => (
                {
                  where: {taskId_createdAt: {taskId: task.id, createdAt}},
                  create: {statusId: id, createdAt}
                }
              ))
          }
        },
        update: {
          title: task.title,
          assigneeId: task.assignee?.id ?? null,
          statusId: task.status?.id ?? null,
          updatedAt: task.updatedAt,
          statusHistory: {
            connectOrCreate: task.statusHistory
              .map(({id, createdAt}: any) => (
                {
                  where: {taskId_createdAt: {taskId: task.id, createdAt}},
                  create: {statusId: id, createdAt}
                }
              ))
          }
        }
      })
    } else {
      await instance.db.task.update({
        where: {id: job.data.id},
        data: {deletedAt: new Date()},
      })
    }

    instance.log.debug(`finished syncing ${job.data.id}`)
  })
}, {name: 'taskSync:Worker', encapsulate: true})
