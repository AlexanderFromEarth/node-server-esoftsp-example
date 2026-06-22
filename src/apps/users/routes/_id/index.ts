import {type FastifyPluginAsync} from 'fastify';

import {deleteUser, getUser, setUser, userSchema} from '../../model.js';

const user: FastifyPluginAsync = async(instance) => {
  instance
    .addTypedSchema([userSchema, {
      $id: 'Id',
      type: 'object',
      required: ['id'],
      properties: {id: {$ref: 'User#/properties/id'}}
    } as const])
    .get('/', {schema: {params: {$ref: 'Id#'}, response: {200: {$ref: 'User#'}}}}, async(req) => {
      return await getUser(req.params.id, instance);
    })
    .patch('/', {
      schema: {
        params: {$ref: 'Id#'},
        body: {type: 'object', properties: {name: {$ref: 'User#/properties/name'}}}
      }
    }, async(req) => {
      await setUser(req.params.id, req.body, instance);
    })
    .delete('/', {schema: {params: {$ref: 'Id#'}}}, async(req) => {
      await deleteUser(req.params.id, instance);
    })
};

export default user;
