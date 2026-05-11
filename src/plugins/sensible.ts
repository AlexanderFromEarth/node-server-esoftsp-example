import fp from 'fastify-plugin'
import sensible, {FastifySensibleOptions} from '@fastify/sensible'

/**
 * Добавляет дополнительные утилитарные функции к reply такие, как
 *   - Статус коды: reply.notFound(), reply.unauthorized(), etc.
 *   - Заголовки ответа для кэширования: reply.cacheControl(), reply.revalidate(), reply.stale(), etc.
 *   - Заголовок X-Forwarded-For: reply.forwarded().
 */
export default fp<FastifySensibleOptions>(async(instance) => {
  instance.register(sensible, {
    /**
     * ID схемы для указания в качестве схемы ответа.
     */
    sharedSchemaId: 'HttpError'
  })
})
