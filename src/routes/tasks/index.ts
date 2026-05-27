import z from 'zod'
import {type FastifyPluginAsync} from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'

/**
 * Импортируем наши заготовленную zod-схему.
 */
import {taskSchema} from '../../schemas/tasks'

/**
 * Определяет обработку данных по коллекции tasks.
 */
const tasks: FastifyPluginAsync = async(instance) => {
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
     * Регистрируем путь на получение задач.
     * В schema указываем для querystring zod-схему, чтобы запрос валидировался,
     * а для response массив task, чтобы ответ эффективно сериализовался в JSON.
     */
    .get('/', {
      schema: {
        querystring: z.object({filter: z.optional(z.literal(['active', 'done', 'all']))}),
        response: {200: z.array(taskSchema)}
      }
    }, async(req) => {
      const filter = {userId: req.user.id} as NonNullable<Parameters<typeof instance.tasksRepository.list>[0]>

      if (req.query.filter === 'active') {
        filter.resolved = false
      } else if (req.query.filter === 'done') {
        filter.resolved = true
      }

      return await instance.tasksRepository.list(filter)
        .then((tasks) => tasks.map((task) => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt?.toISOString() ?? null
        })))
    })
    /**
     * Регистрируем путь на создание задачи.
     * В schema указываем для body zod-схему, чтобы запрос валидировался,
     * а для response, чтобы ответ эффективно сериализовался в JSON.
     */
    .post('/', {
      schema: {
        body: z.object({
          title: z.string().min(1)
        }),
        response: {200: z.number()}
      }
    }, async(req) => {
      return await instance.tasksRepository.add({
        ...req.body,
        userId: req.user.id,
        statusId: 1,
        createdAt: new Date(),
        updatedAt: null
      })
    })
};

export default tasks;
