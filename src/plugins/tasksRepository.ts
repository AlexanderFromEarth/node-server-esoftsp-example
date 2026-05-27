import fp from 'fastify-plugin'

interface TaskView {
  id: number
  title: string
  userId: number | null
  status: {
    id: number
    title: string
    resolved: boolean
  } | null
  createdAt: Date
  updatedAt: Date | null
}

interface Task {
  id: number
  title: string
  userId: number | null
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
export default fp((instance) => {
  instance.decorate('tasksRepository', {
    async list(filter) {
      const query = instance.pg.queryBuilder()
        .from('tasks as t')
        .join('statuses as s', (join) => join
          .on('t.status_id', 's.id'))
        .whereNull('deleted_at')
        .select(
          't.id as id',
          't.assignee_id as userId',
          't.title as title',
          instance.pg.raw('row_to_json(s) as status'),
          't.created_at as createdAt',
          't.updated_at as updatedAt'
        )
        .orderBy('createdAt', 'desc');

      if (filter && 'resolved' in filter) {
        query.where('s.resolved', filter.resolved)
      }
      if (filter && 'userId' in filter) {
        query.where('t.assignee_id', filter.userId)
      }

      return await query;
    },
    async get(id) {
      return await instance.pg.queryBuilder()
        .from('tasks as t')
        .join('statuses as s', (join) => join
          .on('t.status_id', 's.id'))
        .where('t.id', id)
        .whereNull('deleted_at')
        .first(
          't.id as id',
          't.assignee_id as userId',
          't.title as title',
          instance.pg.raw('row_to_json(s) as status'),
          't.created_at as createdAt',
          't.updated_at as updatedAt'
        );
    },
    async add(task) {
      return await instance.pg.transaction(async(trx) => {
        const [{id}] = await instance.pg.queryBuilder()
          .transacting(trx)
          .into('tasks')
          .insert({
            assignee_id: task.userId,
            title: task.title,
            status_id: task.statusId,
            created_at: task.createdAt,
            updated_at: task.updatedAt,
          })
          .returning('id')

        await instance.pg.queryBuilder()
          .transacting(trx)
          .into('task_statuses')
          .insert({task_id: id, status_id: task.statusId, created_at: task.createdAt})

        return id
      })
    },
    async set(id, task) {
      await instance.pg.transaction(async(trx) => {
        await instance.pg.queryBuilder()
          .transacting(trx)
          .from('tasks')
          .where('id', id)
          .update({
            title: task.title,
            assignee_id: task.userId,
            status_id: task.statusId,
            updated_at: task.updatedAt
          })

        if (task.statusId) {
          await instance.pg.queryBuilder()
            .transacting(trx)
            .into('task_statuses')
            .insert({task_id: id, status_id: task.statusId, created_at: task.updatedAt})
        }
      })
    },
    async delete(id) {
      await instance.pg.transaction(async(trx) => {
        await instance.pg.queryBuilder()
          .transacting(trx)
          .from('tasks')
          .where('id', id)
          .update({deleted_at: new Date().toISOString()})
      })
    }
  })
}, {name: 'tasksRepository', dependencies: ['pg'], decorators: {fastify: ['pg']}})
