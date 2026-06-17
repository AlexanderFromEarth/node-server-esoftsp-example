import {createClient, RedisClientType} from 'redis'
import fp from 'fastify-plugin'

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientType
    redisSub: RedisClientType
  }
}

/**
 * Подключаем redis.
 */
export default fp(async(instance) => {
  instance.decorate('redis', await createClient({url: 'redis://localhost:6379'}).connect())
  instance.decorate('redisSub', await createClient({url: 'redis://localhost:6379'}).connect())
}, {name: 'redis'})
