import {type FastifyPluginAsync} from 'fastify';
import {type JsonSchemaToTsProvider} from '@fastify/type-provider-json-schema-to-ts';

/**
 * Импортируем наши заготовленные JSON-схемы.
 */
import {idSchema, userSchema} from '../../../schemas/users';

/**
 * Расширяем тип запроса под наши данные.
 */
declare module 'fastify' {
  interface FastifyRequest {
    userRow: FastifyInstance['users'][number] | null
    userIdx: number
  }
}

/**
 * Определяет обработку данных по конкретной записи users.
 */
const user: FastifyPluginAsync = async(instance) => {
  instance
    /**
     * Устанавливаем обнаружение типов из JSON Schema.
     */
    .withTypeProvider<JsonSchemaToTsProvider<{
      /**
       * Ссылки на входные типы.
       */
      ValidatorSchemaOptions: {references: [typeof idSchema]
      /**
       * Ссылки на выходные типы.
       */
      SerializerSchemaOptions: {references: [typeof userSchema]}
    }}>>()
    /**
     * Добавляем в реестр схем схему Id.
     */
    .addSchema(idSchema)
    /**
     * Добавляем в реестр схем схему User.
     */
    .addSchema(userSchema)
    /**
     * Регистрируем новое поле userRow в запросе со значением null по-умолчанию.
     */
    .decorateRequest('userRow', null)
    /**
     * Регистрируем новое поле userUdx в запросе со значением -1 по-умолчанию.
     */
    .decorateRequest('userIdx', -1)
    /**
     * После валидации, но до обработки заполняем данные новых полей через хук preHandler
     * и кидаем ошибку, если таких данных нет.
     */
    .addHook('preHandler', async(req) => {
      req.userIdx = instance.users.findIndex((user) => user.id === (req.params as {id?: number}).id)
      req.userRow = instance.users[req.userIdx] ?? null

      if (!req.userRow) {
        /**
         * instance.httpErrors.notFound поставляется через @fastify/sensible
         * это удобный способ кидать ошибки вместо использования reply.
         */
        throw instance.httpErrors.notFound()
      }
    })
    /**
     * Регистрируем путь на получение пользователя.
     * В schema указываем для params ссылку на существующую схему Id, чтобы запрос валидировался и
     * эффективно использовались существующие схемы, а для response User, чтобы ответ
     * эффективно сериализовался в JSON.
     */
    .get('/', {schema: {params: {$ref: 'Id#'}, response: {200: {$ref: 'User#'}}}}, async(req) => {
      return req.userRow!
    })
    /**
     * Регистрируем путь на изменение пользователя.
     * В schema указываем для params ссылку на существующую схему Id, чтобы запрос валидировался и
     * эффективно использовались существующие схемы, а для body напрямую, так как она не используется
     * больше нигде.
     */
    .patch('/', {
      schema: {
        params: {$ref: 'Id#'},
        body: {type: 'object', properties: {name: {type: 'string', minLength: 1}}}
      }
    }, async(req) => {
      Object.assign(req.userRow!, req.body)
    })
    /**
     * Регистрируем путь на удаление пользователя.
     * В schema указываем для params ссылку на существующую схему Id, чтобы запрос валидировался и
     * эффективно использовались существующие схемы.
     */
    .delete('/', {schema: {params: {$ref: 'Id#'}}}, async(req) => {
      instance.users.splice(req.userIdx, 1)
    })
};

export default user;
