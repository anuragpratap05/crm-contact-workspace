# CRM Contact Workspace

A simplified CRM contact workspace: browse, search, filter, view and update
contacts, and manage their tags.

> **Status:** in progress — backend foundation complete (Phase 1).
> This README is filled in as the project is built; the submission version
> covers setup, tech stack, data model, technical decisions, the concurrent
> update approach, and scale considerations.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript (Vite) — *not yet started* |
| Backend | Node.js + Express 5 + TypeScript |
| Database | MongoDB (Mongoose) |
| Validation | Zod |
| Logging | pino |
| Tests | Vitest + Supertest |

---

## Repository layout

```
.
├── server/          Backend API
└── client/          Frontend app (Phase 7+)
```

`server/` and `client/` are independent packages with their own
`package.json` — they are deployed separately but version-controlled together,
so a change to the API and the frontend that consumes it lands in one commit.

---

## Running the backend

**Prerequisites:** Node 20+, and MongoDB running locally (or a MongoDB Atlas
connection string).

```bash
cd server
npm install
cp .env.example .env     # defaults work against a local MongoDB
npm run dev
```

The API starts on `http://localhost:4000`.

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/health/ready
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | Type check without emitting |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run seed` | Load 250 sample contacts (`-- --force` to replace existing) |

### Tests

```bash
cd server
npm test
```

55 integration tests covering the highest-risk paths: optimistic locking,
email uniqueness, tag idempotency, pagination stability, search, filtering and
input validation.

Tests run against a real MongoDB started in memory by `mongodb-memory-server` —
**you do not need MongoDB installed or running** to execute them, and they
never touch your development data. The MongoDB version is pinned in
`package.json` (`config.mongodbMemoryServer.version`) because the latest builds
require macOS 14+.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `NODE_ENV` | `development` | Environment |
| `MONGODB_URI` | — | **Required.** MongoDB connection string |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` | pino log level |

Validated at startup — the server refuses to boot on invalid config rather than
failing later at request time.

---

## API

### `GET /api/contacts`

Search, filtering, sorting and pagination are all performed by the backend.

| Query param | Values | Default | Notes |
|---|---|---|---|
| `search` | string | — | Prefix match on first name, last name, email or phone |
| `tags` | comma-separated | — | e.g. `tags=VIP,Lead` |
| `tagMatch` | `any` \| `all` | `any` | Whether a contact must match any or all of `tags` |
| `company` | string | — | Exact match, case-insensitive |
| `createdFrom` | ISO date | — | Inclusive lower bound |
| `createdTo` | ISO date | — | Inclusive upper bound |
| `sortBy` | `name` \| `createdAt` \| `updatedAt` | `createdAt` | |
| `sortOrder` | `asc` \| `desc` | `desc` | |
| `page` | integer ≥ 1 | `1` | |
| `limit` | 1–100 | `20` | Capped server-side |

```json
{
  "items": [
    {
      "id": "6ad36a9f056b3ff2b05514ec",
      "firstName": "Laura",
      "lastName": "Wilson",
      "email": "laura.wilson249@lumen.com",
      "phone": "+1-797-5769",
      "company": "Lumen Analytics",
      "tags": ["Customer", "Prospect"],
      "version": 0,
      "createdAt": "2026-10-17T05:21:00.000Z",
      "updatedAt": "2026-10-17T05:21:00.000Z"
    }
  ],
  "pagination": {
    "page": 1, "limit": 20, "total": 250, "totalPages": 13,
    "hasNextPage": true, "hasPreviousPage": false
  }
}
```

### `GET /api/contacts/:id`

Returns `{ "data": Contact }`, or `404` with code `NOT_FOUND`.

### `PUT /api/contacts/:id`

Updates a contact. The request **must** include the `version` the client last
read — this is how stale writes are detected.

```json
{
  "firstName": "Laura",
  "lastName": "Wilson",
  "email": "laura.wilson@lumen.com",
  "phone": "+1-797-5769",
  "company": "Lumen Analytics",
  "version": 3
}
```

`firstName` and `lastName` are required. `email`, `phone` and `company` are
optional — omitting one clears it. On success the contact is returned with
`version` incremented.

| Status | Code | Meaning |
|---|---|---|
| `200` | — | Updated |
| `400` | `VALIDATION_ERROR` | Invalid body |
| `404` | `NOT_FOUND` | No such contact |
| `409` | `VERSION_CONFLICT` | Someone else saved first. `details.current` holds the current server state |
| `409` | `DUPLICATE_EMAIL` | Another contact already uses that email |

### `POST /api/contacts/:id/tags`

Adds a tag. Body: `{ "tag": "VIP" }`. Idempotent — adding a tag the contact
already has succeeds and changes nothing.

### `DELETE /api/contacts/:id/tags/:tag`

Removes a tag. Also idempotent. URL-encode the tag if it contains spaces
(`Hot%20Lead`).

### `POST /api/contacts/tags/bulk`

Adds or removes one tag across many contacts in a single request.

```json
{
  "contactIds": ["6ad36a9f...", "6ad36a9f..."],
  "tag": "Roadshow",
  "action": "add"
}
```

Returns how many contacts matched and how many actually changed:

```json
{ "data": { "matched": 5, "modified": 5, "tag": "Roadshow", "action": "add" } }
```

Limited to 500 contacts per request.

### `GET /api/contacts/:id/activities`

Recent activity for a contact, newest first. `?limit=` (1–100, default 20).

```json
{
  "data": [
    {
      "id": "6ad386eaaec55485b2535e98",
      "contactId": "6ad36a9f056b3ff2b05514ec",
      "type": "CONTACT_UPDATED",
      "metadata": { "fields": ["company"] },
      "createdAt": "2026-10-17T14:32:10.508Z"
    }
  ]
}
```

### `GET /api/tags`

Returns `{ "data": string[] }` — the distinct tags in use, for populating filter controls.

### `GET /api/health` · `GET /api/health/ready`

Liveness and readiness. `/health` does not touch the database; `/health/ready`
reports database connectivity and returns `503` when not connected.

---

## Concurrent updates

Every contact carries a `version` number. Clients send back the version they
read, and the update only applies if it still matches:

```js
findOneAndUpdate(
  { _id: id, version: clientVersion },
  { $set: changes, $inc: { version: 1 } },
)
```

Because MongoDB applies a single-document update atomically, the match and the
increment cannot interleave. If two users both read version 3 and both save,
exactly one succeeds; the other matches nothing and receives `409
VERSION_CONFLICT` with the current server state attached, so the UI can show
what changed rather than silently discarding the edit.

Verified with 8 simultaneous writers sending the same version: 1 succeeded, 7
were rejected.

**Tag operations do not use the version check.** They are managed through their
own endpoints and never overlap with the fields `PUT` writes, so there is no
lost update to prevent. `$addToSet` and `$pull` are atomic and idempotent on
their own — verified with 10 concurrent adds of the same tag, which produced
one tag and one activity entry. Keeping tags out of the version check also
avoids false conflicts: someone tagging a contact does not invalidate an edit
form another user already has open.

---

## API error format

Every error uses one envelope, with a stable machine-readable `code`:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This contact was modified by someone else.",
    "details": { }
  }
}
```

Clients branch on `code`, never on `message`.

---

## AI usage

Per the assignment's AI usage section — tool used, what for, and a suggestion
that was changed or rejected — documented in the submission version of this
README.
