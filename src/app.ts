import {glob} from 'node:fs/promises'
import {basename, dirname, join} from 'node:path'

import {FastifyPluginAsync, FastifyServerOptions} from 'fastify'
import autoload, {AutoloadPluginOptions} from '@fastify/autoload'
import env from '@fastify/env'

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      COOKIE_SECRET: string
      DATABASE_URL: string
      REDIS_URL: string
    }
  }
}

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {
}

const options: AppOptions = {}

const app: FastifyPluginAsync<AppOptions> = async(fastify, opts): Promise<void> => {
  fastify
    /**
     * Загружает переменные окружения в качестве конфига доступного в инстансе.
     * Нужно загружать отдельно, чтобы избежать гонки.
     */
    .register(env, {
      /**
       * Объявляется схема для используемых переменных окружения.
       */
      schema: {
        type: 'object',
        required: ['COOKIE_SECRET', 'DATABASE_URL', 'REDIS_URL'],
        properties: {
          COOKIE_SECRET: {type: 'string', default: 'test'},
          DATABASE_URL: {type: 'string', default: 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'},
          REDIS_URL: {type: 'string', default: 'redis://localhost:6379'}
        }
      }
    })
    /**
     * Загружает плагины, которые предоставляют дополнительную функциональность приложению.
     */
    .register(autoload, {dir: join(import.meta.dirname, 'plugins'), options: opts, encapsulate: false})
    /**
     * Загружает модули.
     */
    .register(async function(instance, {dir}) {
      for await (const filename of glob(`${dir}/*/app.js`)) {
        const {default: app} = await import(filename)

        instance.register(app, {prefix: `/${basename(dirname(filename))}`})
      }
    }, {dir: join(import.meta.dirname, 'apps')})
}

export default app
export {app, options}
