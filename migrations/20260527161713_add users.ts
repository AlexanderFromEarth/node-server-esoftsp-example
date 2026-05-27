import type {Knex} from 'knex'


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').notNullable()
    table.text('name').notNullable()
    table.timestamp('created_at', {useTz: false}).notNullable()
    table.timestamp('updated_at', {useTz: false}).nullable()
    table.timestamp('deleted_at', {useTz: false}).nullable()

    table.primary(['id'])
  })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}
