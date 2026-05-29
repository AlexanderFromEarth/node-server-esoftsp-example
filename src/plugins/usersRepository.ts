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
      return await instance.prisma.user.findMany({where: {deletedAt: null}})
    },
    async get(id) {
      return await instance.prisma.user.findUnique({where: {id, deletedAt: null}})
    },
    async add(user) {
      return await instance.prisma.user.create({data: user})
        .then((result) => result.id)
    },
    async set(id, user) {
      await instance.prisma.user.update({where: {id, deletedAt: null}, data: user})
    },
    async delete(id) {
      await instance.prisma.user.update({where: {id}, data: {deletedAt: new Date()}})
    }
  })
}, {name: 'usersRepository', dependencies: ['prisma'], decorators: {fastify: ['prisma']}})
