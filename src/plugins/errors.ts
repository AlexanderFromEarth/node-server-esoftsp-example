import fp from 'fastify-plugin'
import {HttpError} from '@fastify/sensible';

/**
 * Обрабатывает ошибки по message приводя их к типу ошибок @fastify/sensible.
 */
export default fp(async(instance) => {
  /**
   * Добавляется обработчик.
   */
  instance.setErrorHandler(async(err) => {
    if (err instanceof Error && !(err instanceof HttpError)) {
      /**
       * Not found -> 404.
       */
      if (err.message === 'Not found') {
        throw instance.httpErrors.notFound()
      }
      /**
       * No access -> 403.
       */
      if (err.message === 'No access') {
        throw instance.httpErrors.forbidden()
      }
    }

    throw err
  })
}, {name: 'errors', dependencies: ['sensible']})
