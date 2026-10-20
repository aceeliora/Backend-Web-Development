const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/db/prisma');
const userRepository = require('../src/repositories/userRepository');

let server;
let baseUrl;
let registeredIdentity;

before(async () => {
  await prisma.user.deleteMany();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await prisma.$disconnect();
});

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function assertSafeIdentity(body) {
  assert.deepEqual(Object.keys(body).sort(), ['email', 'id', 'name']);
  assert.equal('password' in body, false);
  assert.equal('passwordHash' in body, false);
}

test('registration normalizes email, persists a bcrypt hash, and returns safe fields', async () => {
  const response = await post('/auth/register', {
    name: ' Sam ',
    email: ' Sam@Example.COM ',
    password: 'correct horse battery staple',
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assertSafeIdentity(body);
  assert.equal(typeof body.id, 'number');
  assert.deepEqual({ name: body.name, email: body.email }, { name: 'Sam', email: 'sam@example.com' });
  registeredIdentity = body;

  const storedUser = await prisma.user.findUnique({ where: { email: 'sam@example.com' } });
  assert.ok(storedUser.passwordHash);
  assert.notEqual(storedUser.passwordHash, 'correct horse battery staple');
  assert.equal(await bcrypt.compare('correct horse battery staple', storedUser.passwordHash), true);
  assert.equal(Object.hasOwn(storedUser, 'password'), false);
});

test('duplicate normalized email returns 409 without creating another user', async () => {
  const response = await post('/auth/register', {
    name: 'Another Sam',
    email: 'SAM@example.com',
    password: 'another password',
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
  });
  assert.equal(await prisma.user.count(), 1);
});

test('valid login returns only safe identity fields', async () => {
  const response = await post('/auth/login', {
    email: ' SAM@EXAMPLE.COM ',
    password: 'correct horse battery staple',
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assertSafeIdentity(body);
  assert.deepEqual(body, registeredIdentity);
});

test('unknown email and wrong password return byte-identical generic 401 bodies', async () => {
  const wrongPassword = await post('/auth/login', {
    email: 'sam@example.com',
    password: 'incorrect password',
  });
  const unknownEmail = await post('/auth/login', {
    email: 'nobody@example.com',
    password: 'incorrect password',
  });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  const wrongBody = await wrongPassword.text();
  const unknownBody = await unknownEmail.text();
  assert.equal(unknownBody, wrongBody);
  assert.deepEqual(JSON.parse(wrongBody), {
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  });
});

test('unexpected internal errors return a controlled 500 response', async () => {
  const originalFindByEmail = userRepository.findByEmail;
  userRepository.findByEmail = async () => {
    throw new Error('sensitive database failure detail');
  };

  try {
    const response = await post('/auth/login', {
      email: 'sam@example.com',
      password: 'correct horse battery staple',
    });
    assert.equal(response.status, 500);
    const body = await response.text();
    assert.equal(body.includes('sensitive database failure detail'), false);
    assert.deepEqual(JSON.parse(body), {
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  } finally {
    userRepository.findByEmail = originalFindByEmail;
  }
});

test('missing fields and malformed JSON return 400', async () => {
  const missing = await post('/auth/register', { name: 'Sam', email: 'sam@example.com' });
  assert.equal(missing.status, 400);
  assert.deepEqual(await missing.json(), {
    error: { code: 'INVALID_INPUT', message: 'Name, email, and password are required' },
  });

  const malformed = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ invalid json',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), {
    error: { code: 'INVALID_INPUT', message: 'Malformed JSON request' },
  });
  assert.equal(await prisma.user.count(), 1);
});
