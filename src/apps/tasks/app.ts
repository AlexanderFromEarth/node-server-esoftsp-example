import {join} from 'node:path'

import fp from 'fastify-plugin'
import autoload from '@fastify/autoload'

export default fp(async(fastify, opts) => {
  fastify
    /**
     * Загружает плагины, которые предоставляют дополнительную функциональность приложению.
     * Плагины попадают в корень.
     */
    .register(autoload, {dir: join(import.meta.dirname, 'plugins'), options: {encapsulate: false}})
    /**
     * Загружает плагины, которые объявляют воркеры.
     */
    .register(autoload, {dir: join(import.meta.dirname, 'workers')})
    /**
     * Загружает плагины, которые объявляют пути.
     * routeParams позволяет сделать имена директориями параметризованными с помощью _.
     */
    .register(autoload, {dir: join(import.meta.dirname, 'routes'), options: opts, routeParams: true})
}, {name: 'tasks'})
