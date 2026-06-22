import {type FastifyPluginAsync} from 'fastify';

import {addTask, listTasks, taskSchema} from '../model.js'

const tasks: FastifyPluginAsync = async(instance) => {
  instance
    .addTypedSchema([taskSchema])
    .get('/', {
      schema: {
        querystring: {
          type: 'object',
          properties: {filter: {type: 'string', enum: ['active', 'done', 'all']}}
        },
        response: {200: {type: 'array', items: {$ref: 'Task#'}}}
      }
    }, async(req) => {
      return await listTasks(req.user.id, req.query, instance)
    })
    .post('/', {
      schema: {
        body: {
          type: 'object',
          required: ['title'],
          properties: {title: {$ref: 'Task#/properties/title'}}
        },
        response: {200: {$ref: 'Task#/properties/id'}}
      }
    }, async(req) => {
      return await addTask(req.user.id, req.body, instance)
    })
};

export default tasks;
