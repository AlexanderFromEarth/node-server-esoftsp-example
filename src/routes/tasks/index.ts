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
      if (req.query.filter === 'active') {
        return instance.tasks.filter((task) =>
          !task.state.resolved && task.userId === req.user.id)
      } else if (req.query.filter === 'done') {
        return instance.tasks.filter((task) =>
          task.state.resolved && task.userId === req.user.id)
      } else {
        return instance.tasks.filter((task) =>
          task.userId === req.user.id)
      }
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
      const task = {
        id: ++instance.taskLastId,
        userId: req.user.id,
        state: {
          id: 1,
          title: 'Новая',
          resolved: false,
          updatedAt: null
        },
        ...req.body,
        createdAt: new Date().toISOString()
      }

      instance.tasks.push(task)

      return task.id
    })
};

export default tasks;
