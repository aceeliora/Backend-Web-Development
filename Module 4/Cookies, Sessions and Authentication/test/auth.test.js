const test = require('node:test');
const assert = require('node:assert/strict');

process.env.COOKIE_SECRET ||= 'test-only-cookie-secret-at-least-32-chars';
process.env.COOKIE_SECURE ||= 'false';
process.env.SESSION_TTL_MS ||= '3600000';

const app = require('../src/app');
const sessionStore = require('../src/session/sessionStore');
const { getCookieOptions } = require('../src/config/sessionCookie');

const DEMO_EMAIL = 'sam@example.com';
const DEMO_PASSWORD = 'SessionDemo!48';
let server;
let baseUrl;

test('session authentication lifecycle and security boundaries', async (t) => {
  sessionStore.clear();
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    sessionStore.clear();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const anonymous = await fetch(`${baseUrl}/auth/me`);
  assert.equal(anonymous.status, 401);
  assert.deepEqual(await anonymous.json(), {
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  });

  const unknownEmail = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: DEMO_PASSWORD }),
  });
  const wrongPassword = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: DEMO_EMAIL, password: 'wrong password' }),
  });
  assert.equal(unknownEmail.status, 401);
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(await unknownEmail.json(), await wrongPassword.json());

  const invalidInput = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: DEMO_PASSWORD }),
  });
  assert.equal(invalidInput.status, 400);

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ` ${DEMO_EMAIL.toUpperCase()} `, password: DEMO_PASSWORD }),
  });
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), {
    data: { id: 1, name: 'Sam', email: DEMO_EMAIL },
  });

  const setCookie = login.headers.get('set-cookie');
  assert.ok(setCookie, 'login must set the session cookie');
  assert.match(setCookie, /^sid=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Path=\//i);
  assert.match(setCookie, /Max-Age=/i);
  assert.doesNotMatch(setCookie, /; Secure(?:;|$)/i);

  const cookiePair = setCookie.split(';', 1)[0];
  const cookieValue = cookiePair.slice('sid='.length);
  assert.ok(cookieValue.length > 40, 'cookie should carry a random opaque ID and signature');
  assert.equal(decodeURIComponent(cookieValue).includes(DEMO_EMAIL), false);
  assert.equal(decodeURIComponent(cookieValue).includes('SessionDemo!48'), false);

  const identityResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: { cookie: cookiePair },
  });
  assert.equal(identityResponse.status, 200);
  assert.deepEqual(await identityResponse.json(), {
    data: { id: 1, name: 'Sam', email: DEMO_EMAIL },
  });

  const alteredCookie = `sid=${cookieValue}tampered`;
  const alteredIdentity = await fetch(`${baseUrl}/auth/me`, {
    headers: { cookie: alteredCookie },
  });
  assert.equal(alteredIdentity.status, 401);

  const secureBefore = process.env.COOKIE_SECURE;
  process.env.COOKIE_SECURE = 'true';
  assert.equal(getCookieOptions().secure, true);
  process.env.COOKIE_SECURE = secureBefore;
  const clearOptions = getCookieOptions({ clear: true });
  assert.deepEqual(
    {
      httpOnly: clearOptions.httpOnly,
      secure: clearOptions.secure,
      sameSite: clearOptions.sameSite,
      path: clearOptions.path,
      signed: clearOptions.signed,
    },
    { httpOnly: true, secure: false, sameSite: 'lax', path: '/', signed: true },
  );
  assert.equal('maxAge' in clearOptions, false);

  const logout = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { cookie: cookiePair },
  });
  assert.equal(logout.status, 204);
  const clearCookie = logout.headers.get('set-cookie');
  assert.match(clearCookie, /^sid=/);
  assert.match(clearCookie, /HttpOnly/i);
  assert.match(clearCookie, /SameSite=Lax/i);
  assert.match(clearCookie, /Path=\//i);
  assert.match(clearCookie, /Expires=/i);

  const replay = await fetch(`${baseUrl}/auth/me`, {
    headers: { cookie: cookiePair },
  });
  assert.equal(replay.status, 401);

  const repeatedLogout = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { cookie: cookiePair },
  });
  assert.equal(repeatedLogout.status, 204);

  const session = sessionStore.create(999, 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(sessionStore.get(session.id), null, 'expired sessions must be removed during reads');
});
