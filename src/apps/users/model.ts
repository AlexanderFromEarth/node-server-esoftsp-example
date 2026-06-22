import type {FromSchema} from 'json-schema-to-ts'

export const userSchema = {
  $id: 'User',
  type: 'object',
  required: ['id', 'name', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    id: {type: 'number'},
    name: {type: 'string'},
    createdAt: {type: 'string', format: 'date', nullable: false},
    updatedAt: {type: 'string', format: 'date', nullable: true}
  }
} as const

export type User = FromSchema<typeof userSchema, {
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

export interface UsersRepository {
  list(): Promise<Array<User>>
  get(id: User['id']): Promise<User | null>
  add(user: Omit<User, 'id'>): Promise<User['id']>
  set(id: User['id'], user: {name?: User['name'], updatedAt: NonNullable<User['updatedAt']>}): Promise<void>
  delete(id: User['id']): Promise<void>
}

export async function listUsers({usersRepository: repository}: {usersRepository: UsersRepository}) {
  return await repository.list()
}

export async function getUser(id: User['id'], {usersRepository: repository}: {usersRepository: UsersRepository}) {
  const result = await repository.get(id)

  if (!result) {
    throw new Error('Not found')
  }

  return result
}

export async function addUser(user: Pick<User, 'name'>, {usersRepository: repository}: {usersRepository: UsersRepository}) {
  return await repository.add({...user, createdAt: new Date(), updatedAt: null})
}

export async function setUser(id: User['id'], user: Partial<Pick<User, 'name'>>, {usersRepository: repository}: {usersRepository: UsersRepository}) {
  const result = await getUser(id, {usersRepository: repository})
  await repository.set(id, {...result, ...user, updatedAt: new Date()})
}

export async function deleteUser(id: User['id'], {usersRepository: repository}: {usersRepository: UsersRepository}) {
  await getUser(id, {usersRepository: repository})
  await repository.delete(id)
}
