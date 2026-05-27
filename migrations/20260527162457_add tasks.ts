import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasks', (table) => {
    table.increments('id').notNullable()
    table.text('title').notNullable()
    table.integer('assignee_id').nullable()
    table.timestamp('created_at', {useTz: false}).notNullable()
    table.timestamp('updated_at', {useTz: false}).nullable()
    table.timestamp('deleted_at', {useTz: false}).nullable()

    table.primary(['id'])
    table.foreign('assignee_id').references('id').inTable('users')
  })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('tasks')
}
