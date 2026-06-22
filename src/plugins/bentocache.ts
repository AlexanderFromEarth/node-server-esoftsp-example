import {BentoCache, BentoStore, bentostore} from 'bentocache'
import {memoryDriver} from 'bentocache/drivers/memory'
import {redisDriver, redisBusDriver} from 'bentocache/drivers/redis'
import {createNodeRedisClient} from 'bullmq'
import fp from 'fastify-plugin'
import {createClient} from 'redis';

declare module 'fastify' {
  interface FastifyInstance {
    cache: BentoCache<{cache: BentoStore, l1: BentoStore, l2: BentoStore}>
  }
}

/**
 * Добавляет очередь задач на основе BullMQ с дополнительным
 * методом onJob для создания воркеров.
 */
export default fp(async(instance) => {
  const l1Cache = memoryDriver({
    serialize: false,
    maxItems: 1024
  })
  const l2Cache = redisDriver({
    connection: createNodeRedisClient(createClient({url: instance.config.REDIS_URL}) as any) as any
  })

  instance.decorate('cache', new BentoCache({
    default: 'cache',
    grace: '1h',
    graceBackoff: '30s',
    timeout: '1s',
    logger: instance.log.child({module: 'cache'}),
    stores: {
      cache: bentostore()
        .useL1Layer(l1Cache)
        .useL2Layer(l2Cache)
        .useBus(redisBusDriver({
          connection: createNodeRedisClient(createClient({url: instance.config.REDIS_URL}) as any) as any
        })),
      l1: bentostore().useL1Layer(l1Cache),
      l2: bentostore().useL2Layer(l2Cache)
    }
  }))
}, {name: 'bentocache'})
