import {type FastifyPluginAsync} from 'fastify';
import {type JsonSchemaToTsProvider} from '@fastify/type-provider-json-schema-to-ts';

/**
 * Импортируем наши заготовленные JSON-схемы.
 */
import {idSchema, userSchema} from '../../../schemas/users.js';

/**
 * Расширяем тип запроса под наши данные.
 */
declare module 'fastify' {
  interface FastifyRequest {
    userRow: Awaited<ReturnType<FastifyInstance['usersRepository']['get']>>
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
     * После валидации, но до обработки заполняем данные новых полей через хук preHandler
     * и кидаем ошибку, если таких данных нет.
     */
    .addHook('preHandler', async(req) => {
      req.userRow = await instance.usersRepository.get((req.params as {id: number}).id)

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
      return {
        ...req.userRow!,
        createdAt: req.userRow!.createdAt.toISOString(),
        updatedAt: req.userRow!.updatedAt?.toISOString() ?? null
      }
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
      await instance.usersRepository.set(req.params.id, {
        ...req.body,
        updatedAt: new Date()
      })
    })
    /**
     * Регистрируем путь на удаление пользователя.
     * В schema указываем для params ссылку на существующую схему Id, чтобы запрос валидировался и
     * эффективно использовались существующие схемы.
     */
    .delete('/', {schema: {params: {$ref: 'Id#'}}}, async(req) => {
      await instance.usersRepository.delete(req.params.id)
    })
};

export default user;
