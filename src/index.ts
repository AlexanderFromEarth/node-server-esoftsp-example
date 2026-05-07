import fastify from 'fastify'

const tasks = [
  {
    id: 1,
    title: 'Подготовить презентацию',
    state: {
      id: 3,
      title: 'Выполнено',
      resolved: true,
      updatedAt: new Date('2026-04-24T14:29:59Z').toISOString(),
    },
    createdAt: new Date('2026-04-24T14:29:00Z').toISOString(),
  },
  {
    id: 2,
    title: 'Созвониться с заказчиком',
    state: {
      id: 1,
      title: 'Новая',
      resolved: false,
      updatedAt: null,
    },
    createdAt: new Date('2026-04-24T15:05:00Z').toISOString(),
  },
  {
    id: 3,
    title: 'Проверить pull request',
    state: {
      id: 2,
      title: 'В работе',
      resolved: false,
      updatedAt: new Date('2026-04-24T15:45:00Z').toISOString(),
    },
    createdAt: new Date('2026-04-24T15:20:00Z').toISOString(),
  },
  {
    id: 4,
    title: 'Обновить документацию',
    state: {
      id: 3,
      title: 'Выполнено',
      resolved: true,
      updatedAt: new Date('2026-04-24T16:30:00Z').toISOString(),
    },
    createdAt: new Date('2026-04-24T16:00:00Z').toISOString(),
  },
  {
    id: 5,
    title: 'Составить список задач на спринт',
    state: {
      id: 2,
      title: 'В работе',
      resolved: false,
      updatedAt: new Date('2026-04-24T17:00:00Z').toISOString(),
    },
    createdAt: new Date('2026-04-24T16:40:00Z').toISOString(),
  },
]
let lastId = 5

fastify({
  ajv: {customOptions: {removeAdditional: 'all'}},
  logger: true,
  routerOptions: {
    ignoreTrailingSlash: true,
  },
})
  .get<{Querystring: {filter?: 'all' | 'active' | 'done'}}>('/tasks', {
    schema: {querystring: {type: 'object', properties: {filter: {type: 'string', enum: ['all', 'active', 'done']}}}}
  }, async(req) => {
    if (req.query.filter === 'active') {
      return tasks.filter((task) => !task.state.resolved);
    }
    if (req.query.filter === 'done') {
      return tasks.filter((task) => task.state.resolved);
    }
    return tasks;
  })
  .get<{Params: {id: number}}>('/tasks/:id', {
    schema: {params: {type: 'object', properties: {id: { type: 'number' }}}}
  }, async(req, rep) => {
    const task = tasks.find((task) => task.id === Number(req.params.id));

    if (!task) {
      rep.code(404).send({})
      return
    }

    return task;
  })
  .post<{Body: {title: string}}>('/tasks', {
    schema: {body: {type: 'object', required: ['title'], properties: {title: {type: 'string', minLength: 1}}}}
  }, async(req) => {
    const task = {
      id: ++lastId,
      state: {
        id: 1,
        title: 'Новая',
        resolved: false,
        updatedAt: null,
      },
      ...req.body,
      createdAt: new Date().toISOString(),
    }

    tasks.push(task)

    return task.id;
  })
  .patch<{Params: {id: number}, Body: {title?: string}}>('/tasks/:id', {
    schema: {
      params: {type: 'object', properties: {id: { type: 'number' }}},
      body: {type: 'object', properties: {title: {type: 'string', minLength: 1}}}
    }
  }, async(req, rep) => {
    const task = tasks.find((task) => task.id === Number(req.params.id));

    if (!task) {
      rep.code(404).send({})
      return
    }

    Object.assign(task, req.body)
  })
  .delete<{Params: {id: number}}>('/tasks/:id', {
    schema: {params: {type: 'object', properties: {id: { type: 'number' }}}}
  }, async(req) => {
    const idx = tasks.findIndex((task) => task.id === Number(req.params.id));

    if (idx !== -1) {
      tasks.splice(idx, 1);
    }
  })
  .listen({port: 8080})
