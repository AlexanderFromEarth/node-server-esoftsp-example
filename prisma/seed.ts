import 'dotenv/config'
import {PrismaPg} from '@prisma/adapter-pg'

import {PrismaClient} from '../src/generated/prisma/client.js'

const db = new PrismaClient({
  adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})
})

await db.status.createMany({
  data: [
    {title: 'К выполнению'},
    {title: 'В работе'},
    {title: 'Завершена', resolved: true}
  ]
})

await db.$disconnect()
