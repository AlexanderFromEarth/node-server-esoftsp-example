import z from 'zod'

/**
 * zod-схема для params с id.
 */
export const idSchema = z.object({
  id: z.coerce.number()
})
/**
 * zod-схема задачи для response.
 */
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  userId: z.number().nullable(),
  status: z.object({
    id: z.number(),
    title: z.string(),
    resolved: z.boolean()
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable()
})
