import {FastifyInstance} from 'fastify';
import fp from 'fastify-plugin'
import type {JsonSchemaToTsProvider} from '@fastify/type-provider-json-schema-to-ts';

function addTypedSchema<T extends any[]>(this: FastifyInstance, schemas: T) {
  for (const schema of schemas) {
    /**
     * Добавляем переданную схему в регистри.
     */
    this.addSchema(schema);
  }

  /**
   * Устанавливаем обнаружение типов из JSON Schema.
   */
  return this.withTypeProvider<JsonSchemaToTsProvider<{
    ValidatorSchemaOptions: {
      /**
       * Помогаем TS'у понять каких типов референсы.
       */
      references: T
      /**
       * Помогаем TS'у понять как нужно воспринимать некоторые схемы.
       */
      deserialize: [
        {
          pattern: {type: 'string', format: 'date', nullable: true}
          output: Date | null
        },
        {
          pattern: {type: 'string', format: 'date', nullable: false}
          output: Date
        }
      ]
    }
    SerializerSchemaOptions: {
      /**
       * Помогаем TS'у понять каких типов референсы.
       */
      references: T
      /**
       * Помогаем TS'у понять как нужно воспринимать некоторые схемы.
       */
      deserialize: [
        {
          pattern: {type: 'string', format: 'date', nullable: true}
          output: Date | null
        },
        {
          pattern: {type: 'string', format: 'date', nullable: false}
          output: Date
        }
      ]
    }
  }>>();
}

declare module 'fastify' {
  interface FastifyInstance {
    addTypedSchema: typeof addTypedSchema;
  }
}

/**
 * Добавляет доп. функцию для типизированного добавения схем.
 */
export default fp(async(instance) => {
  instance.decorate('addTypedSchema', addTypedSchema)
}, {name: 'typed-schema'})
