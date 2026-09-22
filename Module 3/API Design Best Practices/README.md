# API Design Best Practices

This Express API exposes an in-memory posts resource with a predictable, resource-oriented contract.

## Setup

```bash
npm install
npm start
```

The server listens on port `3000`.

## Public API

| Method | Route | Purpose | Success status |
| --- | --- | --- | --- |
| `GET` | `/posts?page=1&limit=2` | List posts with pagination metadata | `200` |
| `GET` | `/posts/:id` | Fetch one post | `200` |
| `POST` | `/posts` | Create a post from `{ "title": "...", "author": "..." }` | `201` |
| `POST` | `/posts/:id/likes` | Like one post | `200` |
| `GET` | `/explode` | Demonstrate a safe internal failure response | `500` |

All successful responses use a `data` envelope. List responses also include `meta`:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 2,
    "total": 5,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

The default page size is `2`; client-supplied limits are capped at `5`. Missing resources, unknown routes, validation failures, and internal failures use the same safe error shape:

```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post not found"
  }
}
```

Internal logs may contain implementation details for debugging, but those details are never returned to the client.
