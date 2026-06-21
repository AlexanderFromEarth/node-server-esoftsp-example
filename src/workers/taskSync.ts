import {Job} from 'bullmq';
import {FastifyInstance} from 'fastify';

import {TaskView} from '../plugins/tasksRepository.js';

export default async(instance: FastifyInstance, job: Job<{id: number, data: TaskView | null}>) => {
  instance.log.debug(`start syncing ${job.data.id}`)

  const task = job.data.data;

  if (task) {
    await instance.prisma.task.upsert({
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
    await instance.prisma.task.update({
      where: {id: job.data.id},
      data: {deletedAt: new Date()},
    })
  }

  instance.log.debug(`finished syncing ${job.data.id}`)
}
