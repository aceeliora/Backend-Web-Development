const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp, resetData } = require('./src/app');

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const address = server.address();
    const req = http.request({ port: address.port, method, path, headers: payload ? { 'Content-Type': 'application/json' } : {} }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  resetData();
  const server = createApp().listen(0);
  try {
    let response = await request(server, 'GET', '/posts?limit=999');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 5);
    assert.equal(response.body.meta.limit, 5);
    assert.equal(response.body.meta.total, 5);
    assert.equal(response.body.meta.hasNextPage, false);

    response = await request(server, 'GET', '/posts?page=2&limit=2');
    assert.equal(response.body.data[0].id, 3);
    assert.equal(response.body.meta.hasPreviousPage, true);

    response = await request(server, 'GET', '/posts/1');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.title, 'Caching 101');

    response = await request(server, 'POST', '/posts', { title: 'API contracts', author: 'lee' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.title, 'API contracts');

    response = await request(server, 'POST', '/posts/1/likes');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.likes, 1);

    response = await request(server, 'GET', '/posts/999');
    assert.equal(response.status, 404);
    assert.deepEqual(Object.keys(response.body), ['error']);

    response = await request(server, 'GET', '/explode');
    assert.equal(response.status, 500);
    assert.equal(response.body.error.code, 'INTERNAL_ERROR');
    assert.equal(response.body.error.message, 'Internal server error');
    assert.equal(JSON.stringify(response.body).includes('SQLITE'), false);
    assert.equal(JSON.stringify(response.body).includes('stack'), false);

    response = await request(server, 'GET', '/getPosts');
    assert.equal(response.status, 404);

    console.log('All API contract smoke tests passed.');
  } finally {
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
