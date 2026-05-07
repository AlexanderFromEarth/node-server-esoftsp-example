import * as http from 'node:http';

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
];

let lastId = 5;

http.createServer(async(req, res) => {
  let { pathname, searchParams: query } = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const match = pathname.match(/^\/tasks\/(\d+)$/);

  if (match && !Number(match[1])) {
    res.writeHead(400, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({message: 'taskId should be number'}));
    return;
  }

  const taskId = match ? Number(match[1]) : null;

  if (req.method === 'GET' && pathname === '/tasks') {
    const filter = query.get('filter');

    if (filter && filter !== 'all' && filter !== 'active' && filter !== 'done') {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({message: '#/filter should be all, active or done'}));
      return;
    }

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(tasks.filter((task) => {
      if (query.get('filter') === 'active') {
        return !task.state.resolved;
      }
      if (query.get('filter') === 'done') {
        return task.state.resolved;
      }

      return true;
    })));
    return;
  }
  if (req.method === 'POST' && pathname === '/tasks') {
    if (req.headers['content-type'] !== 'application/json') {
      res.writeHead(415, {'Accept': 'application/json'});
      res.end();
      return;
    }

    let bodyParts = [];

    for await (const part of req) {
      bodyParts.push(part);
    }

    const body = JSON.parse(bodyParts.join(''));

    if (!body.title) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({message: '#/title should not be empty'}));
      return;
    }

    const task = {
      id: ++lastId,
      state: {
        id: 1,
        title: 'Новая',
        resolved: false,
        updatedAt: null,
      },
      ...body,
      createdAt: new Date().toISOString(),
    }

    tasks.push(task)

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(task.id));
    return;
  }
  if (req.method === 'GET' && taskId) {
    const task = tasks.find((task) => task.id === taskId);

    if (!task) {
      res.writeHead(404);
      res.end();
      return;
    }

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(task));
    return;
  }
  if (req.method === 'PATCH' && taskId) {
    if (req.headers['content-type'] !== 'application/json') {
      res.writeHead(415, {'Accept': 'application/json'});
      res.end();
      return;
    }
    const task = tasks.find((task) => task.id === taskId);

    if (!task) {
      res.writeHead(404);
      res.end();
      return;
    }

    let bodyParts = [];

    for await (const part of req) {
      bodyParts.push(part);
    }

    const body = JSON.parse(bodyParts.join(''));

    if (!body.title) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({message: '#/title should not be empty'}));
      return;
    }

    Object.assign(task, {title: body.title});

    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === 'DELETE' && taskId) {
    const idx = tasks.findIndex((task) => task.id === taskId);

    if (idx !== -1) {
      tasks.splice(idx, 1);
    }

    res.writeHead(200);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end();
  return;
}).listen(8080);
