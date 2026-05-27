import type { Knex } from 'knex'


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('statuses', (table) => {
    table.increments('id').notNullable()
    table.text('title').notNullable()
    table.boolean('resolved').notNullable()

    table.primary(['id'])
  })

  await knex.schema.createTable('task_statuses', (table) => {
    table.integer('task_id').notNullable()
    table.integer('status_id').notNullable()
    table.timestamp('created_at').notNullable()

    table.primary(['task_id', 'created_at'])
    table.foreign('task_id').references('id').inTable('tasks')
    table.foreign('status_id').references('id').inTable('statuses')
  })

  await knex.schema.alterTable('tasks', (table) => {
    table.integer('status_id').nullable()

    table.foreign('status_id').references('id').inTable('statuses')
  })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tasks', (table) => {
    table.dropColumn('status_id')
  })
  await knex.schema.dropTable('task_statuses')
  await knex.schema.dropTable('statuses')
}
