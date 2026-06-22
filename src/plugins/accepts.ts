import fp from 'fastify-plugin'
import acceptsSerializer, {FastifyAcceptsSerializerPluginOptions} from '@fastify/accepts-serializer'

/**
 * Добавляет обработку заголовка запроса Accept.
 * В случае отсутствия заголовка возвращает ошибку 406.
 */
export default fp<FastifyAcceptsSerializerPluginOptions>(async(instance) => {
  instance.register(acceptsSerializer, {
    /**
     * Здесь прописываются дополнительные сериализиторы помимо application/json.
     */
    serializers: []
  })
}, {name: 'accepts-serializer'})
