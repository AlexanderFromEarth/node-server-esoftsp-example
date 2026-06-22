import fp from 'fastify-plugin'
import circuitBreaker, {FastifyCircuitBreakerOptions} from '@fastify/circuit-breaker'

const kRouteAlreadyProcessed = Symbol('route-already-processed')

declare module 'fastify' {
  interface RouteOptions {
    cbCustom?: {[kRouteAlreadyProcessed]?: boolean}
  }
}

/**
 * Добавляет паттерн "Размыкатель цепи" на маршруты,
 * который запоминает тайм-аут.
 */
export default fp<FastifyCircuitBreakerOptions>(async(instance) => {
  instance
    .register(circuitBreaker, {
      /**
       * Количество ошибок, после которого разомкнется цепь.
       */
      threshold: 5,
      /**
       * Тайм-аут на обработку запроса.
       */
      timeout: 1000,
      /**
       * Тайм-аут ожидания в разомкнутом состоянии,
       * после которого происходит переход в полуразомкнутое.
       */
      resetTimeout: 2000
    })
    .after(() => {
      /**
       * Хук на разымкатель к маршрутам.
       */
      instance.addHook('preHandler', instance.circuitBreaker())
    })
}, {name: 'circuit-breaker'})
