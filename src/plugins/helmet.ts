import fp from 'fastify-plugin'
import helmet, {FastifyHelmetOptions} from '@fastify/helmet'

/**
 * Подключает дополнительные заголовки для обеспечения безопасности в веб-среде.
 * Заголовки настроены согласно https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers.
 */
export default fp<FastifyHelmetOptions>(async(instance) => {
  instance.register(helmet, {
    /**
     * Устанавливает Strict-Transport-Security заголовок,
     * который сообщает браузеру, что обращаться нужно через HTTPs,
     * а не HTTP даже в случае использования последнего в URL.
     * Для предотвращения MITM.
     */
    hsts: true,
    /**
     * Устанавливает Content-Security-Policy заголовок,
     * который сообщает браузеру откуда можно загружать контент.
     * Для предотвращения Clickjacking и XSS.
     *
     * Для REST API стоит установить две директивы:
     *   1. default-src 'none' - из соображений эволюции API.
     *   2. frame-ancestors 'none' - для блокировки встраивания через iframe.
     */
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {'default-src': '"none"', 'frame-ancestors': '"none"'}
    },
    /**
     * Устанавливает X-Frame-Options заголовок,
     * который является старым аналогом для Content-Security-Policy: frame-ancestors, предназначенным
     * для ограничения встраивания в iframe.
     * Для предотвращения Clickjacking.
     */
    frameguard: {action: 'deny'},
    /**
     * Устанавливает X-Content-Type-Options заголовок,
     * который сообщает браузеру ориентироваться только на Content-Type для разбора
     * ответа сервера и игнорировать содержимое тела, если указано значение noshiff.
     * Для предотвращения XSS.
     */
    noSniff: true,
    /**
     * Устанавливает Referrer-Policy заголовок,
     * который сообщает браузеру когда нужно передавать заголовок Referrer.
     * Для REST API не имеет смысла, но стоит установить в no-referrer из соображений эволюции.
     */
    referrerPolicy: {policy: 'no-referrer'},
    /**
     * Остальные заголовки выключены за не надобностью в REST API.
     */
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
    dnsPrefetchControl: false,
    ieNoOpen: false,
    permittedCrossDomainPolicies: false,
    xssFilter: false
  })
})
