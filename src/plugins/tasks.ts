import fp from 'fastify-plugin'

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    tasks: Array<{
      id: number
      userId: number
      title: string
      state: {
        id: number
        title: string
        resolved: boolean
        updatedAt: string | null
      }
      createdAt: string
    }>
    taskLastId: number
  }
}

/**
 * Устанавливает данные задач.
 */
export default fp((instance) => {
  instance
    /**
     * Регистрируем новое поле tasks с массивом задач.
     */
    .decorate('tasks', [
      {
        id: 1,
        title: 'Подготовить презентацию',
        userId: 1,
        state: {
          id: 3,
          title: 'Выполнено',
          resolved: true,
          updatedAt: new Date('2026-04-24T14:29:59Z').toISOString()
        },
        createdAt: new Date('2026-04-24T14:29:00Z').toISOString()
      },
      {
        id: 2,
        userId: 1,
        title: 'Созвониться с заказчиком',
        state: {
          id: 1,
          title: 'Новая',
          resolved: false,
          updatedAt: null
        },
        createdAt: new Date('2026-04-24T15:05:00Z').toISOString()
      },
      {
        id: 3,
        userId: 1,
        title: 'Проверить pull request',
        state: {
          id: 2,
          title: 'В работе',
          resolved: false,
          updatedAt: new Date('2026-04-24T15:45:00Z').toISOString()
        },
        createdAt: new Date('2026-04-24T15:20:00Z').toISOString()
      },
      {
        id: 4,
        userId: 1,
        title: 'Обновить документацию',
        state: {
          id: 3,
          title: 'Выполнено',
          resolved: true,
          updatedAt: new Date('2026-04-24T16:30:00Z').toISOString()
        },
        createdAt: new Date('2026-04-24T16:00:00Z').toISOString()
      },
      {
        id: 5,
        userId: 1,
        title: 'Составить список задач на спринт',
        state: {
          id: 2,
          title: 'В работе',
          resolved: false,
          updatedAt: new Date('2026-04-24T17:00:00Z').toISOString()
        },
        createdAt: new Date('2026-04-24T16:40:00Z').toISOString()
      }
    ])
    /**
     * Регистрируем новое поле taskLastId с последним id задачи.
     */
    .decorate('taskLastId', 5)
})
