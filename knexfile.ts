const config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {min: 3, max: 10}
}

export const development = config
export const production = config
