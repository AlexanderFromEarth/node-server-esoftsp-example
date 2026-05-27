import knex from 'knex'
import fp from 'fastify-plugin'

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    pg: knex.Knex
  }
}

export default fp(async(instance) => {
  instance.decorate('pg', knex({
    client: 'pg',
    connection: instance.config.DATABASE_URL,
    pool: {min: 3, max: 10}
  }))
}, {name: 'pg'})
