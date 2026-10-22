# Session Authentication API

A small Express and Prisma API demonstrating server-side sessions transported by a signed, opaque `sid` cookie.

## Requirements

- Node.js 20 or newer
- npm

## Setup and run

Run these commands from this project directory:

```bash
cp .env.example .env
npm install
```

Replace the placeholder `COOKIE_SECRET` in `.env` with a fresh secret of at least 32 characters. Generate one locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Then create the local SQLite database, generate Prisma Client, seed the demo account, and start the API:

```bash
npm run setup
npm run dev
```

The server listens on `http://localhost:3000` by default. The seeded demo credentials are `sam@example.com` / `SessionDemo!48`.

`COOKIE_SECURE=false` is for local plain-HTTP development only. Set `COOKIE_SECURE=true` behind HTTPS in production. `SESSION_TTL_MS` controls both the browser cookie's `Max-Age` and the server-side session lifetime; it must be a positive integer. Never commit `.env` or a real signing secret.

## Endpoints

- `POST /auth/login` — accepts `{ "email": "sam@example.com", "password": "SessionDemo!48" }`; normalizes email, verifies the password asynchronously, creates a fresh session, and returns only `{ id, name, email }`.
- `GET /auth/me` — resolves the verified signed cookie through the live server-side store and returns the same safe identity fields.
- `POST /auth/logout` — revokes the server-side session, clears the cookie, and returns `204`. It is safe to repeat.

Invalid credentials receive the same generic `401` response whether an email is unknown or its password is incorrect. Missing, modified, expired, or orphaned session cookies receive the generic `401 AUTH_REQUIRED` response.

## Verify with curl

Start the server in one terminal. In another terminal, from this project directory:

```bash
# Login; curl saves the sid cookie in cookies.txt.
curl -i -c cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"sam@example.com","password":"SessionDemo!48"}' \
  http://localhost:3000/auth/login

# Confirm the signed-in identity.
curl -i -b cookies.txt http://localhost:3000/auth/me

# A request without a cookie is rejected.
curl -i http://localhost:3000/auth/me

# Logout revokes the server record and clears the browser cookie.
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/auth/logout

# The old cookie no longer authenticates.
curl -i -b cookies.txt http://localhost:3000/auth/me
```

The login response's `Set-Cookie` should include `sid`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and a deliberate `Max-Age`. With `COOKIE_SECURE=true`, it also includes `Secure`; use HTTPS when testing that setting because clients should not send Secure cookies over plain HTTP. `cookies.txt` is local test output and should not be committed.

Run the automated API and session-store checks after setup and seeding:

```bash
npm test
```

## Session storage and production

This project intentionally uses an in-memory `Map` so the session lifecycle is easy to inspect. It is appropriate only for learning and local execution: sessions disappear when the process restarts, and multiple API processes do not share sessions. Production should use a shared expiring store such as Redis, with server-side TTLs and a deliberate strategy for expiry, revocation, HTTPS, CSRF protection, and rate limiting. The API contract remains the same: create a random opaque ID, resolve it on protected requests, and destroy it on logout.
