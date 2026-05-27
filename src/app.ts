import {join} from 'node:path'
import {FastifyPluginAsync, FastifyServerOptions} from 'fastify'
import autoload, {AutoloadPluginOptions} from '@fastify/autoload'
import env from '@fastify/env'

/**
 * Расширяем тип сервера под конфиг для @fastify/env.
 */
declare module 'fastify' {
  interface FastifyInstance {
    config: {
      COOKIE_SECRET: string
      DATABASE_URL: string
    }
  }
}

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {
}

/**
 * Здесь можно указать доп. опции сервера, но при запуске нужно будет передать --options.
 */
const options: AppOptions = {
}

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
        required: ['COOKIE_SECRET', 'DATABASE_URL'],
        properties: {
          COOKIE_SECRET: {type: 'string', default: 'test'},
          DATABASE_URL: {type: 'string', default: 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'}
        }
      }
    })
    /**
     * Загружает плагины, которые предоставляют дополнительную функциональность приложению.
     */
    .register(autoload, {dir: join(__dirname, 'plugins'), options: opts})
    /**
     * Загружает плагины, которые объявляют пути.
     * routeParams позволяет сделать имена директориями параметризованными с помощью _.
     */
    .register(autoload, {dir: join(__dirname, 'routes'), options: opts, routeParams: true})
}

export default app
export {app, options}
