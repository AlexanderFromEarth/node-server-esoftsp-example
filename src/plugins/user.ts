import fp from 'fastify-plugin'

/**
 * Модифицируем тип реквеста, чтобы TypeScript позволил нам обращаться к полю user.
 * _user не добавляем, так как это условно приватные данные.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user: {id: number}
  }
}

/**
 * Устанавливает поле user "текущим пользователем" из заголовка, если передан заголовок User-Id.
 */
export default fp((instance) => {
  instance
    /**
     * Добавляем поле для хранения распаршеного результата.
     */
    .decorateRequest('_user', null)
    /**
     * Добавляем вычисляемый геттер, который проверяет наверняка данные.
     * Если нам нужно для выполнения запроса знать текущего пользователя, то это проверяется здесь
     * инкапсулировано.
     */
    .decorateRequest('user', {
      getter() {
        /**
         * getDecorator, чтобы получить типизированный вариант без публикации для всех через
         * аугументацию.
         */
        const _user = this.getDecorator<typeof this.user | null>('_user')

        if (!_user?.id) {
          /**
           * instance.httpErrors.unauthorized поставляется через @fastify/sensible
           * это удобный способ кидать ошибки вместо использования reply.
           */
          throw instance.httpErrors.unauthorized()
        }

        return _user
      }
    })
    /**
     * Добавляем хук preHandler, который перед обработкой проверяет заголовок и тянет по нему данные.
     */
    .addHook('preHandler', async(req) => {
      /**
       * Парсим кастомный заголовок User-Id для идентификации.
       */
      if (req.headers['user-id']) {
        const userId = Number(req.headers['user-id'])

        req.setDecorator<typeof req.user | null>('_user', await instance.usersRepository.get(userId))
      }
    })
}, {name: 'user', dependencies: ['usersRepository'], decorators: {fastify: ['usersRepository']}})
