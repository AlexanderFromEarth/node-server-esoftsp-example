import fp from 'fastify-plugin'

import type {UsersRepository} from '../model.js';

declare module 'fastify' {
  interface FastifyInstance {
    usersRepository: UsersRepository
  }
}

export default fp((instance) => {
  instance.decorate('usersRepository', {
    async list() {
      return await instance.cache.namespace('users').getOrSetForever({
        key: 'list',
        factory: async() => instance.db.user.findMany({where: {deletedAt: null}})
      })
    },
    async get(id) {
      return await instance.cache.namespace('users').getOrSet({
        key: `${id}`,
        factory: async(ctx) => {
          const value = await instance.db.user.findUnique({where: {id, deletedAt: null}})

          if (!value) {
            ctx.setOptions({ttl: 5000 + Math.floor((Math.random() * 5000 * 0.5))})
          }

          return value;
        },
        ttl: '60s'
      })
    },
    async add(user) {
      const newUser = await instance.db.user.create({data: user})

      await Promise.all([
        instance.cache.namespace('users').expire({key: 'list'}),
        instance.cache.namespace('users').set({key: `${newUser.id}`, value: newUser, ttl: '60s'})
      ])

      return newUser.id
    },
    async set(id, user) {
      const newUser = await instance.db.user.update({where: {id, deletedAt: null}, data: user})

      await Promise.all([
        instance.cache.namespace('users').expire({key: 'list'}),
        instance.cache.namespace('users').set({key: `${id}`, value: newUser, ttl: '60s'})
      ])
    },
    async delete(id) {
      await instance.db.user.update({where: {id}, data: {deletedAt: new Date()}})
      await Promise.all([
        instance.cache.namespace('users').expire({key: 'list'}),
        instance.cache.namespace('users').set({key: `${id}`, value: null, ttl: '60s'})
      ])
    }
  })
}, {
  name: 'usersRepository',
  dependencies: ['prisma', 'bentocache', 'myip'],
  decorators: {fastify: ['db', 'cache', 'ip']}
})
