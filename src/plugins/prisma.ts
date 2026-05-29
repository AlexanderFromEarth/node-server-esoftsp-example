import fp from 'fastify-plugin'
import {PrismaPg} from '@prisma/adapter-pg'

import {PrismaClient} from '../generated/prisma/client.js'

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export default fp(async(instance) => {
  instance.decorate('prisma', new PrismaClient({
    log: [{emit: 'stdout', level: 'query'}],
    adapter: new PrismaPg({connectionString: instance.config.DATABASE_URL})
  }))
}, {name: 'prisma'})
