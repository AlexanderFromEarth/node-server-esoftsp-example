import timers from 'node:timers/promises'
import fp from 'fastify-plugin'

interface User {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date | null
}

/**
 * Расширяем тип сервера под наши данные.
 */
declare module 'fastify' {
  interface FastifyInstance {
    usersRepository: {
      list(): Promise<Array<User>>
      get(id: User['id']): Promise<User | null>
      add(user: Omit<User, 'id'>): Promise<User['id']>
      set(id: User['id'], user: Partial<Omit<User, 'id' | 'createdAt'>> & {updatedAt: NonNullable<User['updatedAt']>}): Promise<void>
      delete(id: User['id']): Promise<void>
    }
  }
}

/**
 * Устанавливает данные пользователей.
 */
export default fp((instance) => {
  instance.decorate('usersRepository', {
    /**
     * Здесь показан пример как решать Cache Stampede проблему
     * с помощью блокировки
     */
    async list() {
      let users = await instance.redis.get('users')
        .then((val) => val !== null ? JSON.parse(val) as Array<User> : null)

      if (!users) {
        // Лочим для обновления, чтобы только мы шли в БД
        const res = await instance.redis.set('lock:users', instance.ip, {condition: 'NX'})

        if (!res) {
          const {promise, resolve, reject} = Promise.withResolvers()
          // Если не мы обновляем, то ждем сигнала 1 секунду, потому что вечно ждать не вариант
          await instance.redisSub.subscribe('notify:users', resolve)
          timers.setTimeout(1000).then(reject)

          try {
            await promise
          } catch (error) {
            await instance.redisSub.unsubscribe('notify:users', resolve)
          }

          // Получив сигнал или упав по тайм-ауту снова идем в кэш
          users = await instance.redis.get('users')
            .then((val) => val !== null ? JSON.parse(val) as Array<User> : null)

          // Если данные есть ура, если нет идем все же в БД
          if (users) {
            return users
          }
        }

        instance.log.debug('read users from db')
        users = await instance.prisma.user.findMany({where: {deletedAt: null}})

        if (res) {
          // Если мы обновлятор, то ставим данные в кэше, убираем лок и отправляем сигнла
          await instance.redis.multi()
            .set('users', JSON.stringify(users))
            .del('lock:users')
            .publish('notify:users', JSON.stringify(1))
            .exec()
        }
      } else {
        instance.log.debug('read users from cache')
      }

      return users
    },
    /**
     * Здесь показан пример как уменьшать Cache Stampede и Cache Avalanche проблемы
     * с помощью jitter у ttl
     */
    async get(id) {
      let rawUser = await instance.redis.get(`users:${id}`)
      let user = null as User | null

      if (!rawUser) {
        instance.log.debug(`read user:${id} from db`)
        user = await instance.prisma.user.findUnique({where: {id, deletedAt: null}})
        // Кэшируем на пять секунд несуществующие записи, а существующие на минуту
        // конечно тут надо рассматривать еще как бы вытеснять управляемо эти ключи,
        // но для простоты опустим это, дополнительно добавляем от 0 до 15 секунд рандомно
        await instance.redis.set(`users:${id}`, JSON.stringify(user), {
          expiration: {type: 'EX', value: (user ? 60 : 5) + Math.floor(Math.random() * 15)}
        })
      } else {
        instance.log.debug(`read user:${id} from cache`)
        user = JSON.parse(rawUser) as User | null
        // Продлеваем, если использовался ключ
        await instance.redis.expire(`users:${id}`, (user ? 60 : 5) + Math.floor(Math.random() * 15))
      }

      return user
    },

    /**
     * При операции записи на пользователях мы используем стратегии
     * Write-Around со сбросом для кэша списка и Write-Through с TTL для одиночных записей.
     * Операции объединяем в Redis транзакцию, чтобы минимизировать гонки.
     */

    async add(user) {
      const newUser = await instance.prisma.user.create({data: user})

      await instance.redis.multi()
        .set(`users:${newUser.id}`, JSON.stringify(newUser), {
          expiration: {type: 'EX', value: 60 + Math.floor(Math.random() * 15)}
        })
        .del('users')
        .exec()

      return newUser.id
    },
    async set(id, user) {
      const newUser = await instance.prisma.user.update({where: {id, deletedAt: null}, data: user})

      await instance.redis.multi()
        .set(`users:${newUser.id}`, JSON.stringify(newUser), {
          expiration: {type: 'EX', value: 60 + Math.floor(Math.random() * 15)}
        })
        .del('users')
        .exec()
    },
    async delete(id) {
      await instance.prisma.user.update({where: {id}, data: {deletedAt: new Date()}})
      await instance.redis.multi()
        .set(`users:${id}`, JSON.stringify(null), {
          expiration: {type: 'EX', value: 60 + Math.floor(Math.random() * 15)}
        })
        .del('users')
        .exec()
    }
  })
}, {name: 'usersRepository', dependencies: ['prisma', 'redis'], decorators: {fastify: ['prisma', 'redis', 'ip']}})
