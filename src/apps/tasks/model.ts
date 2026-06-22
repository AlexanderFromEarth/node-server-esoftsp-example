import type {FromSchema} from 'json-schema-to-ts';

export const taskSchema = {
  $id: 'Task',
  type: 'object',
  required: ['id', 'title', 'assignee', 'status', 'statusHistory', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    id: {type: 'number'},
    title: {type: 'string'},
    assignee: {
      type: 'object',
      required: ['id', 'name', 'createdAt', 'updatedAt'],
      additionalProperties: false,
      nullable: true,
      properties: {
        id: {type: 'number'},
        name: {type: 'string'},
        createdAt: {type: 'string', format: 'date', nullable: false},
        updatedAt: {type: 'string', format: 'date', nullable: true}
      }
    },
    status: {
      type: 'object',
      required: ['id', 'title', 'resolved'],
      additionalProperties: false,
      nullable: true,
      properties: {
        id: {type: 'number'},
        title: {type: 'string'},
        resolved: {type: 'boolean'}
      }
    },
    statusHistory: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'resolved'],
        additionalProperties: false,
        properties: {
          id: {type: 'number'},
          title: {type: 'string'},
          resolved: {type: 'boolean'},
          createdAt: {type: 'string', format: 'date', nullable: false}
        }
      }
    },
    createdAt: {type: 'string', format: 'date', nullable: false},
    updatedAt: {type: 'string', format: 'date', nullable: true}
  }
} as const

export type Task = FromSchema<typeof taskSchema, {
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
}>

export interface TasksRepository {
  list(filter?: Partial<{userId: number, resolved: boolean}>): Promise<Array<Omit<Task, 'assignee'> & {assigneeId: number | null}>>
  get(id: Task['id']): Promise<Omit<Task, 'assignee'> & {assigneeId: number | null} | null>
  add(task: {
    title: Task['title']
    assigneeId: NonNullable<Task['assignee']>['id'] | null
    statusId: NonNullable<Task['status']>['id'] | null
    createdAt: Task['createdAt']
    updatedAt: Task['updatedAt']
  }): Promise<Task['id']>
  set(id: Task['id'], task: {
    title?: Task['title']
    assigneeId?: NonNullable<Task['assignee']>['id'] | null
    statusId?: NonNullable<Task['status']>['id'] | null
    updatedAt: NonNullable<Task['updatedAt']>
  }): Promise<void>
  delete(id: Task['id']): Promise<void>
}

interface Deps {
  tasksRepository: TasksRepository
  usersApi: {
    listUsers(): Promise<Array<NonNullable<Task['assignee']>>>
    getUser(id: number): Promise<NonNullable<Task['assignee']>>
  }
}

export async function listTasks(userId: number, reqFilter: {filter?: 'active' | 'done' | 'all'}, {usersApi, tasksRepository}: Deps) {
  const filter = {userId} as NonNullable<Parameters<typeof tasksRepository.list>[0]>

  if (reqFilter.filter === 'active') {
    filter.resolved = false
  } else if (reqFilter.filter === 'done') {
    filter.resolved = true
  }

  const result = await tasksRepository.list(filter)
  const users = await usersApi.listUsers().then((rows) => {
    const byId = new Map<number, NonNullable<Task['assignee']>>()

    for (const row of rows) {
      byId.set(row.id, row)
    }

    return byId
  })

  return result.map((row) => {
    if (row.assigneeId && !users.has(row.assigneeId)) {
      throw new Error('Not found')
    }

    return {
      ...row,
      assignee: row.assigneeId ? users.get(row.assigneeId)! : null
    };
  })
}

export async function getTask(userId: number, id: Task['id'], {usersApi, tasksRepository}: Deps) {
  const result = await tasksRepository.get(id)

  if (!result) {
    throw new Error('Not found')
  }
  if (result.assigneeId && result.assigneeId !== userId) {
    throw new Error('No access')
  }

  return {
    ...result,
    assignee: result.assigneeId ? await usersApi.getUser(result.assigneeId) : null
  }
}

export async function addTask(userId: number, task: {title: Task['title']}, {tasksRepository}: Deps) {
  return await tasksRepository.add({
    ...task,
    assigneeId: userId,
    statusId: 1,
    createdAt: new Date(),
    updatedAt: null
  })
}

export async function setTask(userId: number, id: Task['id'], task: Partial<Pick<Task, 'title'>>, deps: Deps) {
  const result = await getTask(userId, id, deps)
  await deps.tasksRepository.set(id, {...result, ...task, updatedAt: new Date()})
}

export async function deleteTask(userId: number, id: Task['id'], deps: Deps) {
  await getTask(userId, id, deps)
  await deps.tasksRepository.delete(id)
}
