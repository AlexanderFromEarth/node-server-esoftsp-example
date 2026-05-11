import fp from 'fastify-plugin'
import compress, {FastifyCompressOptions} from '@fastify/compress'

/**
 * Добавляет сжатие тела ответа, если клиент поддерживает таковое
 * и разжатия тела запроса, если оно сжато.
 *
 * Поддерживает ли клиент сжатие и можно ли его применять определяется заголовком Accept-Encoding.
 * Сжато ли тело запроса и каким образом определяется по заголовку Content-Encoding.
 *
 * Поддерживаются алгоритмы zstd, br, gzip и deflate.
 */
export default fp<FastifyCompressOptions>(async(instance) => {
  instance.register(compress, {
    /**
     * Устанавливаем минимальный размер тела ответа для применения сжатия в 2KB.
     */
    threshold: 2048,
    /**
     * Если контент передаваемый клиенту уже является сжатым, то разжимать его, если клиент
     * не поддерживает сжатие.
     */
    inflateIfDeflated: true
  })
})
