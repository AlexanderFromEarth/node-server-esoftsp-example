import fp from 'fastify-plugin'

import {getUser, listUsers, type User} from '../model.js';

declare module 'fastify' {
  interface FastifyInstance {
    usersApi: {
      listUsers(): Promise<Array<User>>
      getUser(id: number): Promise<User>
    }
  }
}

export default fp((instance) => {
  instance.decorate('usersApi', {
    listUsers() {
      return listUsers(instance)
    },
    getUser(id: number) {
      return getUser(id, instance)
    }
  })
}, {
  name: 'usersApi',
  dependencies: ['usersRepository'],
  decorators: {fastify: ['usersRepository']}
})
