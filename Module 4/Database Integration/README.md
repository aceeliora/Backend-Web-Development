# Database Integration Assignment

The posts API keeps its existing controller/service/repository boundary while persisting data in PostgreSQL through Prisma. Prisma types and error codes are confined to the database client and repository/error-translation layers.

## Requirements

- Node.js 20+ (Node 22 recommended)
- PostgreSQL 14+

## Local setup

```bash
cp .env.example .env
# Set DATABASE_URL in .env to a local PostgreSQL database you control.
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm test
npm start
```

`.env` is ignored and must never be committed. `.env.example` contains placeholders only. Migrations are committed under `prisma/migrations`; `npm run db:migrate` applies them without resetting existing data. To create a later development migration after editing the schema, use `npx prisma migrate dev --name describe_the_change`.

`npm run db:seed` is safe to rerun: it inserts the sample user/posts only when their IDs are not already present and synchronizes generated ID sequences. It does not delete or reset application data.

## API contract

- `GET /posts` returns `{ "data": [...] }` ordered by ID.
- `GET /posts/:id` returns the post or `404 { "error": "Post not found" }`.
- `POST /posts` creates a post; `title` is required and the author must exist.
- `PATCH /posts/:id` updates only `title` and `body`; a missing post returns 404.
- `DELETE /posts/:id` returns 204 when deleted and 404 when missing.

The post response remains `{ id, title, body, authorId }`; database timestamps and relations are intentionally not exposed by the existing API. Database uniqueness and relation errors map to safe 409/422 messages, connectivity errors to 503, and unexpected errors to a generic 500 response. Raw Prisma/database details are never returned to clients.

## Database model

The schema includes users, posts, comments, votes, follows, tags, and an explicit `PostTag` join table. Foreign keys use explicit cascade behavior, votes and follows prevent duplicate relationships, tag names are unique, and indexes support author, post-comment, vote, follow, and tag lookups.
