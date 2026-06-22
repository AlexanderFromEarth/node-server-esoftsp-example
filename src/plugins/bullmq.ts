import {createNodeRedisClient, Processor, Queue, Worker} from 'bullmq'
import fp from 'fastify-plugin'
import {createClient} from 'redis'

declare module 'fastify' {
  interface FastifyInstance {
    queues: Record<string, Queue>
    workers: Record<string, Array<Worker>>
    onJob<T = any, R = any>(this: FastifyInstance, title: string, worker: (instance: FastifyInstance, ...params: Parameters<Processor<T, R>>) => Promise<R>): this
  }
}

/**
 * Добавляет очередь задач на основе BullMQ с дополнительным
 * методом onJob для создания воркеров.
 */
export default fp(async(instance) => {
  const connection = createNodeRedisClient(createClient({url: instance.config.REDIS_URL}) as any);

  instance.decorate('queues', new Proxy({} as Record<string, Queue>, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && !(prop in target)) {
        target[prop] = new Queue(prop, {connection, defaultJobOptions: {
          attempts: 10,
          backoff: {type: 'exponential', delay: 5000, jitter: 0.5}
        }});
      }

      return target[String(prop)]
    }
  }))
  instance.decorate('workers', {})
  instance.decorate('onJob', function(title, worker) {
    if (!(title in this.workers)) {
      this.workers[title] = [];
    }

    this.workers[title].push(new Worker(title, async(...args) => worker(instance, ...args), {connection}));

    return this
  })
}, {name: 'bullmq'})
