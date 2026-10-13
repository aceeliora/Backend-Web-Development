const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
process.env.DATABASE_URL ||= 'postgresql://user:password@localhost:5432/community_test?schema=public';
const app = require('../src/app');
const prisma = require('../src/db/prisma');
const { toSafeDatabaseError } = require('../src/errors/databaseError');

const originalMethods = {
  findMany: prisma.post.findMany,
  findUnique: prisma.post.findUnique,
  create: prisma.post.create,
  update: prisma.post.update,
  deleteMany: prisma.post.deleteMany,
};
let records;
let nextId;
let server;
let baseUrl;

function copy(record) {
  if (!record) return null;
  return { id: record.id, title: record.title, body: record.body, authorId: record.authorId };
}

before(async () => {
  prisma.post.findMany = async ({ orderBy }) => {
    const rows = [...records.values()].sort((a, b) => orderBy.id === 'asc' ? a.id - b.id : b.id - a.id);
    return rows.map(copy);
  };
  prisma.post.findUnique = async ({ where }) => copy(records.get(Number(where.id)));
  prisma.post.create = async ({ data }) => {
    if (data.authorId !== 1) throw Object.assign(new Error('private database details'), { code: 'P2003' });
    const record = { id: nextId++, ...data };
    records.set(record.id, record);
    return copy(record);
  };
  prisma.post.update = async ({ where, data }) => {
    const record = records.get(Number(where.id));
    if (!record) throw Object.assign(new Error('private database details'), { code: 'P2025' });
    Object.assign(record, data);
    return copy(record);
  };
  prisma.post.deleteMany = async ({ where }) => ({ count: records.delete(Number(where.id)) ? 1 : 0 });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  Object.assign(prisma.post, originalMethods);
  await prisma.$disconnect();
});

test('preserves the posts API CRUD, missing-record, validation, and safe FK behavior', async () => {
  records = new Map([[1, { id: 1, title: 'First post', body: 'Original body', authorId: 1 }]]);
  nextId = 2;

  let response = await fetch(`${baseUrl}/posts`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [{ id: 1, title: 'First post', body: 'Original body', authorId: 1 }] });

  response = await fetch(`${baseUrl}/posts/1`);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, { id: 1, title: 'First post', body: 'Original body', authorId: 1 });

  response = await fetch(`${baseUrl}/posts/999`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Post not found' });

  response = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Created post', authorId: 1 }),
  });
  assert.equal(response.status, 201);
  const created = (await response.json()).data;
  assert.deepEqual(created, { id: 2, title: 'Created post', body: '', authorId: 1 });

  response = await fetch(`${baseUrl}/posts/2`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Updated post', ignoredField: 'not persisted' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, { id: 2, title: 'Updated post', body: '', authorId: 1 });

  response = await fetch(`${baseUrl}/posts/999`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Missing' }),
  });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Post not found' });

  response = await fetch(`${baseUrl}/posts/2`, { method: 'DELETE' });
  assert.equal(response.status, 204);
  response = await fetch(`${baseUrl}/posts/2`, { method: 'DELETE' });
  assert.equal(response.status, 404);

  response = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Invalid author', authorId: 404 }),
  });
  assert.equal(response.status, 422);
  const safeError = await response.json();
  assert.deepEqual(safeError, { error: 'Related record does not exist or the submitted data is invalid' });
  assert.equal(JSON.stringify(safeError).includes('private database details'), false);

  response = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body: 'No title', authorId: 1 }),
  });
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: 'Title is required' });
});

test('translates duplicate constraints without exposing Prisma details', () => {
  const error = toSafeDatabaseError(Object.assign(new Error('private database details'), { code: 'P2002' }));
  assert.equal(error.statusCode, 409);
  assert.equal(error.expose, true);
  assert.equal(error.message, 'A record with those details already exists');
  assert.equal(error.message.includes('private database details'), false);
});
