import {type FastifyPluginAsync} from 'fastify'

import {deleteTask, getTask, setTask, taskSchema} from '../../model.js'

const task: FastifyPluginAsync = async(instance) => {
  instance
    .addTypedSchema([taskSchema, {
      $id: 'Id',
      type: 'object',
      required: ['id'],
      properties: {id: {$ref: 'Task#/properties/id'}}
    } as const])
    .get('/', {schema: {params: {$ref: 'Id#'}, response: {200: {$ref: 'Task#'}}}}, async(req) => {
      return await getTask(req.user.id, req.params.id, instance);
    })
    .patch('/', {
      schema: {
        params: {$ref: 'Id#'},
        body: {type: 'object', properties: {title: {$ref: 'Task#/properties/title'}}}
      }
    }, async(req) => {
      return await setTask(req.user.id, req.params.id, req.body, instance);
    })
    /**
     * Регистрируем путь на удаление задачи.
     * В schema указываем для params zod-схему id, чтобы запрос валидировался.
     */
    .delete('/', {schema: {params: {$ref: 'Id#'}}}, async(req) => {
      return await deleteTask(req.user.id, req.params.id, instance);
    })
};

export default task;
