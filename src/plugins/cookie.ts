import fp from 'fastify-plugin'
import cookie, {FastifyCookieOptions} from '@fastify/cookie'

/**
 * Добавляет работу с куками (заголовок Cookie):
 *   - req.cookies
 *   - rep.cookie/rep.setCookie(name, val, opts?)
 *   - rep.clearCookie(name, opts?)
 */
export default fp<FastifyCookieOptions>(async(instance) => {
  instance.register(cookie, {
    /**
     * Секрет используемый при создании подписанных кук.
     * Читаем переменную COOKIE_SECRET из конфига от @fastify/env.
     */
    secret: instance.config.COOKIE_SECRET,
    /**
     * Общие настройки парсинга кук.
     */
    parseOptions: {
      /**
       * Атрибут Domain у кук.
       */
      domain: 'http://localhost:8080'
    }
  })
}, {name: 'cookie'})
