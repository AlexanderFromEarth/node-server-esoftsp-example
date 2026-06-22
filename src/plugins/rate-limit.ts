import fp from 'fastify-plugin'
import rateLimit, {FastifyRateLimitOptions} from '@fastify/rate-limit'

const kRouteAlreadyProcessed = Symbol('route-already-processed')

declare module 'fastify' {
  interface RouteOptions {
    rlCustom?: {[kRouteAlreadyProcessed]?: boolean}
  }
}

/**
 * Добавляет паттерн "Частотный ограничитель" на маршруты,
 * который ограничивает частоту запросов в секунду.
 */
export default fp<FastifyRateLimitOptions>(async(instance) => {
  instance.register(rateLimit, {
    /**
     * Активация глобально на приложение.
     */
    global: true,
    /**
     * Максимальное разрешенное количество запросов за timeWindow для одного клиента.
     */
    max: 15,
    /**
     * Окно времени, в котором считаются запросы на клиента.
     */
    timeWindow: '30s',
    /**
     * Размер кэша по клиентам (максимум клиентов, за которыми следим).
     */
    cache: 1024
  })
}, {name: 'rate-limit'})
