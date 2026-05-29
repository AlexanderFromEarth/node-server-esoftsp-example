import {type FastifyPluginAsync} from 'fastify';
import {type JsonSchemaToTsProvider} from '@fastify/type-provider-json-schema-to-ts';

import {userSchema} from '../../schemas/users.js';

const users: FastifyPluginAsync = async(instance) => {
  instance
    /**
     * Устанавливаем обнаружение типов из JSON Schema.
     */
    .withTypeProvider<JsonSchemaToTsProvider<{
      /**
       * Ссылки на входные типы.
       */
      ValidatorSchemaOptions: {references: [typeof userSchema]}
      /**
       * Ссылки на выходные типы.
       */
      SerializerSchemaOptions: {references: [typeof userSchema]}
    }>>()
    /**
     * Добавляем в реестр схем схему User.
     */
    .addSchema(userSchema)
    /**
     * Регистрируем путь на получение пользователей.
     * В schema указываем для response массив ссылок на User, чтобы ответ
     * эффективно сериализовался в JSON и схема эффективно переиспользовалась.
     */
    .get('/', {schema: {response: {200: {type: 'array', items: {$ref: 'User#'}}}}}, async() => {
      return await instance.usersRepository.list()
        .then((users) => users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt?.toISOString() ?? null
        })))
    })
    /**
     * Регистрируем путь на создание пользователя.
     * В schema указываем для body JSON-schema, чтобы запрос валидировался,
     * а для response, чтобы ответ эффективно сериализовался в JSON.
     */
    .post('/', {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {name: {type: 'string', minLength: 1}}
        },
        response: {200: {type: 'number'}}
      }
    }, async(req) => {
      return await instance.usersRepository.add({
        ...req.body,
        createdAt: new Date(),
        updatedAt: null
      });
    })
};

export default users;
