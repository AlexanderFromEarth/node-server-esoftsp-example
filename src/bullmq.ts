import fs from 'fs/promises'
import path from 'path'

import {createNodeRedisClient, Queue, Worker} from 'bullmq'
import {createBullBoard} from '@bull-board/api'
import {BullMQAdapter} from '@bull-board/api/bullMQAdapter'
import {FastifyAdapter} from '@bull-board/fastify'
import fp from 'fastify-plugin'

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    jobs: Record<string, {
      queue: Queue
      worker: Worker
    }>
  }
}

/**
 * Подключаем bullmq.
 */
export default fp<{dir: string, ui?: string}>(async(instance, {dir, ui}) => {
  const connection = createNodeRedisClient(instance.redis as any);

  instance.decorate('jobs', {})

  for await (const filepath of fs.glob(`${dir}/*.js`)) {
    const queue = path.basename(filepath, '.js')
    const {default: worker} = await import(filepath)

    instance.jobs[queue] = {
      queue: new Queue(queue, {connection, defaultJobOptions: {
        attempts: 10,
        backoff: {type: 'exponential', delay: 5000, jitter: 0.5}
      }}),
      worker: new Worker(queue, async(...args) => worker(instance, ...args), {connection})
    }
  }

  if (ui) {
    const adapter = new FastifyAdapter()

    createBullBoard({
      queues: Object.values(instance.jobs)
        .map(({queue}) => new BullMQAdapter(queue)),
      serverAdapter: adapter
    })
    adapter.setBasePath(ui)
    instance.register(adapter.registerPlugin(), {prefix: ui})
  }
}, {name: 'bullmq'})
