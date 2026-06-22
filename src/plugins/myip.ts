import os from 'node:os'

import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    ip: string
  }
}

/**
 * Добавляет IP сервера.
 */
export default fp(async(instance) => {
  instance.decorate('ip', Object.values(os.networkInterfaces()).flat()
    .find((iface) => iface?.family === 'IPv4' && !iface?.internal)
    ?.address ?? '127.0.0.1')
}, {name: 'myip'})
