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
  assignee: z.object({
    id: z.number(),
    name: z.string(),
    createdAt: z.date()
  }).nullable(),
  status: z.object({
    id: z.number(),
    title: z.string(),
    resolved: z.boolean()
  }).nullable(),
  statusHistory: z.array(z.object({
    id: z.number(),
    title: z.string(),
    resolved: z.boolean(),
    createdAt: z.date()
  })),
  createdAt: z.date(),
  updatedAt: z.date().nullable()
})
