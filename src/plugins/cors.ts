import fp from 'fastify-plugin'
import cors, {FastifyCorsOptions} from '@fastify/cors'

/**
 * Включает работу CORS, возможность ее настройки и возможность
 * браузеру узнавать разрешенные действия.
 */
export default fp<FastifyCorsOptions>(async(instance) => {
  instance.register(cors, {
    /**
     * Устанавливает заголовок Access-Control-Allow-Origin,
     * который сообщает браузеру какие хосты имеют доступ к ответу от сервера.
     */
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    /**
     * Устанавливает заголовок Access-Control-Allow-Methods,
     * который сообщает браузеру доступные для запроса HTTP методы.
     */
    methods: [
      'GET',
      'HEAD',
      'POST',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],
    /**
     * Устанавливает заголовок Access-Control-Allow-Headers,
     * который сообщает браузеру заголовки доступные для использования в запросе.
     */
    allowedHeaders: [
      'Accept',
      'Accept-Encoding',
      'Authorization',
      'Content-Type',
      'Content-Encoding',
      'Content-Range'
    ],
    /**
     * Устанавливает заголовок Access-Control-Allow-Credentials,
     * который сообщает браузеру, что можно отправлять cookies, заголовки авторизации и тд в запросе.
     */
    credentials: true,
    /**
     * Устанавливает заголовок Access-Control-Max-Age,
     * который сообщает браузеру как долго можно хранить данные preflight-запроса.
     */
    maxAge: 3600
  })
}, {name: 'cors'})
