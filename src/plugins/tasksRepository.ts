import fp from 'fastify-plugin'

interface Task {
  id: number
  userId: number
  title: string
  status: {
    id: number
    title: string
    resolved: boolean
  }
  updatedAt: string | null
  createdAt: string
}

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    tasksRepository: {
      list(filter?: Partial<{userId: number, resolved: boolean}>): Promise<Array<Task>>
      get(id: Task['id']): Promise<Task | null>
      add(task: Omit<Task, 'id' | 'status'> & {statusId: Task['status']['id']}): Promise<Task['id']>
      set(id: Task['id'], task: Partial<Omit<Task, 'id' | 'status'> & {statusId: Task['status']['id']}>): Promise<void>
      delete(id: Task['id']): Promise<void>
    }
  }
}

const statuses: Record<number, Task['status']> = {
  1: {
    id: 1,
    title: 'Новая',
    resolved: false
  },
  2: {
    id: 2,
    title: 'В работе',
    resolved: false
  },
  3: {
    id: 3,
    title: 'Выполнено',
    resolved: true
  }
};

const rows: Array<Task> = [
  {
    id: 1,
    title: 'Подготовить презентацию',
    userId: 1,
    status: {
      id: 3,
      title: 'Выполнено',
      resolved: true
    },
    updatedAt: new Date('2026-04-24T14:29:59Z').toISOString(),
    createdAt: new Date('2026-04-24T14:29:00Z').toISOString()
  },
  {
    id: 2,
    userId: 1,
    title: 'Созвониться с заказчиком',
    status: {
      id: 1,
      title: 'Новая',
      resolved: false
    },
    updatedAt: new Date('2026-04-24T14:29:59Z').toISOString(),
    createdAt: new Date('2026-04-24T15:05:00Z').toISOString()
  },
  {
    id: 3,
    userId: 1,
    title: 'Проверить pull request',
    status: {
      id: 2,
      title: 'В работе',
      resolved: false
    },
    updatedAt: new Date('2026-04-24T14:29:59Z').toISOString(),
    createdAt: new Date('2026-04-24T15:20:00Z').toISOString()
  },
  {
    id: 4,
    userId: 1,
    title: 'Обновить документацию',
    status: {
      id: 3,
      title: 'Выполнено',
      resolved: true
    },
    updatedAt: new Date('2026-04-24T16:30:00Z').toISOString(),
    createdAt: new Date('2026-04-24T16:00:00Z').toISOString()
  },
  {
    id: 5,
    userId: 1,
    title: 'Составить список задач на спринт',
    status: {
      id: 2,
      title: 'В работе',
      resolved: false
    },
    updatedAt: new Date('2026-04-24T17:00:00Z').toISOString(),
    createdAt: new Date('2026-04-24T16:40:00Z').toISOString()
  }
];
let lastId = 5;

/**
 * Устанавливает данные задач.
 */
export default fp((instance) => {
  instance.decorate('tasksRepository', {
    async list(filter) {
      return rows.filter((row) =>
        (!filter || !('resolved' in filter) || row.status.resolved === filter.resolved) ||
        (!filter || !('userId' in filter) || row.userId === filter.userId))
    },
    async get(id) {
      return rows.find((task) => task.id === id) ?? null
    },
    async add({statusId, ...task}) {
      rows.push({...task, status: statuses[statusId], id: ++lastId})

      return lastId
    },
    async set(id, {statusId, ...task}) {
      const found = rows.find((task) => task.id === id)

      if (found) {
        Object.assign(found, {...task, status: statusId ? statuses[statusId] : found.status})
      }
    },
    async delete(id) {
      const foundIdx = rows.findIndex((task) => task.id === id)

      if (foundIdx !== -1) {
        rows.splice(foundIdx, 1)
      }
    }
  })
}, {name: 'tasksRepository'})
