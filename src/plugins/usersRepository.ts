import fp from 'fastify-plugin'

interface User {
  id: number
  name: string
  createdAt: string
}

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    usersRepository: {
      list(): Promise<Array<User>>
      get(id: User['id']): Promise<User | null>
      add(user: Omit<User, 'id'>): Promise<User['id']>
      set(id: User['id'], user: Partial<Omit<User, 'id'>>): Promise<void>
      delete(id: User['id']): Promise<void>
    }
  }
}

const rows = [
  {
    id: 1,
    name: 'Саша',
    createdAt: new Date('2026-04-24T14:29:00Z').toISOString()
  }
];
let lastId = 1;

/**
 * Устанавливает данные пользователей.
 */
export default fp((instance) => {
  instance.decorate('usersRepository', {
    async list() {
      return rows.slice()
    },
    async get(id) {
      return rows.find((user) => user.id === id) ?? null
    },
    async add(user) {
      rows.push({...user, id: ++lastId})

      return lastId
    },
    async set(id, user) {
      const found = rows.find((user) => user.id === id)

      if (found) {
        Object.assign(found, user)
      }
    },
    async delete(id) {
      const foundIdx = rows.findIndex((user) => user.id === id)

      if (foundIdx !== -1) {
        rows.splice(foundIdx, 1)
      }
    }
  })
}, {name: 'usersRepository'})
