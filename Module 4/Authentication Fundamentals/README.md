# Authentication Fundamentals

## Setup

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env
npm run db:push
npm start
```

The default SQLite database is local to `prisma/dev.db`. Do not commit `.env` or the database file. `.env.example` contains only safe development defaults.

## Endpoints

### `POST /auth/register`

Request:

```json
{ "name": "Sam", "email": "sam@example.com", "password": "correct horse battery staple" }
```

A successful registration returns `201` with only the safe identity fields:

```json
{ "id": 1, "name": "Sam", "email": "sam@example.com" }
```

Email is trimmed and lowercased before lookup and persistence. The password is hashed asynchronously with bcryptjs, and only `passwordHash` is stored. An already-registered normalized email returns `409`; invalid input returns `400`.

### `POST /auth/login`

Request:

```json
{ "email": "sam@example.com", "password": "correct horse battery staple" }
```

Valid credentials return `200` with only `id`, `name`, and `email`. Missing or malformed input returns `400`. Unknown email and incorrect password both return the identical `401` response:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

The unknown-account path also performs a bcrypt comparison against a valid dummy hash to reduce account-enumeration timing differences. Internal failures return a controlled `500` response without exposing raw database or bcrypt errors. This assignment does not implement sessions or JWTs.

## Tests

```bash
npm test
```

The test command synchronizes the local Prisma schema and exercises registration, hash persistence, duplicate handling, successful login, generic credential failures, validation, malformed JSON, and safe response fields.
