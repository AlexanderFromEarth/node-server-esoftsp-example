import fp from 'fastify-plugin'

interface User {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date | null
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
      set(id: User['id'], user: Partial<Omit<User, 'id' | 'createdAt'>> & {updatedAt: NonNullable<User['updatedAt']>}): Promise<void>
      delete(id: User['id']): Promise<void>
    }
  }
}

/**
 * Устанавливает данные пользователей.
 */
export default fp((instance) => {
  instance.decorate('usersRepository', {
    async list() {
      return await instance.pg.queryBuilder()
        .from('users')
        .whereNull('deleted_at')
        .select('id', 'name', 'created_at as createdAt');
    },
    async get(id) {
      return await instance.pg.queryBuilder()
        .from('users')
        .where('id', id)
        .whereNull('deleted_at')
        .first('id', 'name', 'created_at as createdAt');
    },
    async add(user) {
      return await instance.pg.queryBuilder()
        .into('users')
        .insert({name: user.name, created_at: user.createdAt})
        .returning('id')
        .then(([{id}]) => id)
    },
    async set(id, user) {
      await instance.pg.queryBuilder()
        .from('users')
        .where('id', id)
        .update(user)
    },
    async delete(id) {
      await instance.pg.queryBuilder()
        .from('users')
        .where('id', id)
        .update({deleted_at: new Date()})
    }
  })
}, {name: 'usersRepository', dependencies: ['pg'], decorators: {fastify: ['pg']}})
