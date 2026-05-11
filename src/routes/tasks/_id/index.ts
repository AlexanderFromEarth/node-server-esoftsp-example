import z from 'zod'
import {type FastifyPluginAsync} from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'

/**
 * Импортируем наши заготовленные zod-схемы.
 */
import {idSchema, taskSchema} from '../../../schemas/tasks'

/**
 * Расширяем тип запроса под наши данные.
 */
declare module 'fastify' {
  interface FastifyRequest {
    taskRow: FastifyInstance['tasks'][number] | null
    taskIdx: number
  }
}

/**
 * Определяет обработку данных по конкретной записи tasks.
 */
const task: FastifyPluginAsync = async(instance) => {
  instance
    /**
     * Устанавливаем обнаружение типов из zod.
     */
    .withTypeProvider<ZodTypeProvider>()
    /**
     * Устанавливаем валидацию запросов на основе схемы zod.
     */
    .setValidatorCompiler(validatorCompiler)
    /**
     * Устанавливаем сериализацию ответов на основе схемы zod.
     */
    .setSerializerCompiler(serializerCompiler)
    /**
     * Регистрируем новое поле taskRow в запросе со значением null по-умолчанию.
     */
    .decorateRequest('taskRow', null)
    /**
     * Регистрируем новое поле taskIdx в запросе со значением -1 по-умолчанию.
     */
    .decorateRequest('taskIdx', -1)
    /**
     * После валидации, но до обработки заполняем данные новых полей через хук preHandler
     * и кидаем ошибку, если таких данных нет.
     */
    .addHook('preHandler', async(req) => {
      req.taskIdx = instance.tasks.findIndex((task) => task.id === (req.params as {id?: number}).id)
      req.taskRow = instance.tasks[req.taskIdx] ?? null

      if (!req.taskRow) {
        /**
         * instance.httpErrors.notFound поставляется через @fastify/sensible
         * это удобный способ кидать ошибки вместо использования reply.
         */
        throw instance.httpErrors.notFound()
      }
      if (req.taskRow.userId !== req.user.id) {
        /**
         * instance.httpErrors.forbidden поставляется через @fastify/sensible
         * это удобный способ кидать ошибки вместо использования reply.
         */
        throw instance.httpErrors.forbidden()
      }
    })
    /**
     * Регистрируем путь на получение задачи.
     * В schema указываем для params zod-схему id, чтобы запрос валидировался, а для response task,
     * чтобы ответ эффективно сериализовался в JSON.
     */
    .get('/', {schema: {params: idSchema, response: {200: taskSchema}}}, async(req) => {
      return req.taskRow!;
    })
    /**
     * Регистрируем путь на изменение задачи.
     * В schema указываем для params zod-схему id и для body, чтобы запрос валидировался.
     */
    .patch('/', {
      schema: {
        params: idSchema,
        body: z.object({
          title: z.string().min(1
        )}).partial()
      }
    }, async(req) => {
      Object.assign(req.taskRow!, req.body)
    })
    /**
     * Регистрируем путь на удаление задачи.
     * В schema указываем для params zod-схему id, чтобы запрос валидировался.
     */
    .delete('/', {schema: {params: idSchema}}, async(req) => {
      instance.tasks.splice(req.taskIdx, 1);
    })
};

export default task;
