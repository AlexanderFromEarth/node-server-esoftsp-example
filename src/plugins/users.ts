import fp from 'fastify-plugin'

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    users: Array<{
      id: number
      name: string
      createdAt: string
    }>
    userLastId: number
  }
}

/**
 * Устанавливает данные пользователей.
 */
export default fp((instance) => {
  instance
    /**
     * Регистрируем новое поле users с массивом пользователей.
     */
    .decorate('users', [
      {
        id: 1,
        name: 'Саша',
        createdAt: new Date('2026-04-24T14:29:00Z').toISOString()
      }
    ])
    /**
     * Регистрируем новое поле userLastId с последним id пользователя.
     */
    .decorate('userLastId', 1)
}, {name: 'users'})
