/**
 * JSON-схема для params с id.
 */
export const idSchema = {
  $id: 'Id',
  type: 'object',
  required: ['id'],
  properties: {
    id: {type: 'number'}
  }
} as const
/**
 * JSON-схема пользователя для response.
 */
export const userSchema = {
  $id: 'User',
  type: 'object',
  required: ['id', 'name', 'createdAt'],
  properties: {
    id: {type: 'number'},
    name: {type: 'string'},
    createdAt: {type: 'string', format: 'date'}
  }
} as const
