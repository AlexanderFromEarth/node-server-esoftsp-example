import {type FastifyPluginAsync} from 'fastify';

import {addUser, listUsers, userSchema} from '../model.js';

const users: FastifyPluginAsync = async(instance) => {
  instance
    .addTypedSchema([userSchema])
    .get('/', {schema: {response: {200: {type: 'array', items: {$ref: 'User#'}}}}}, async() => {
      return await listUsers(instance)
    })
    .post('/', {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {name: {$ref: 'User#/properties/name'}}
        },
        response: {200: {$ref: 'User#/properties/id'}}
      }
    }, async(req) => {
      return await addUser(req.body, instance)
    })
};

export default users;
