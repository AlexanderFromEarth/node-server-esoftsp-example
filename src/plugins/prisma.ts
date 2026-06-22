import fp from 'fastify-plugin'
import {PrismaPg} from '@prisma/adapter-pg'

import {PrismaClient} from '../generated/prisma/client.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient
  }
}

/**
 * Добавляет работу с базой данной через ORM Prisma.
 */
export default fp(async(instance) => {
  instance.decorate('db', new PrismaClient({
    log: [{emit: 'stdout', level: 'query'}],
    adapter: new PrismaPg({connectionString: instance.config.DATABASE_URL})
  }))
}, {name: 'prisma'})
