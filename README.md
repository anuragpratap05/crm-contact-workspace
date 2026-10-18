# CRM Contact Workspace

A simplified CRM contact workspace: browse, search, filter, view and update
contacts, and manage their tags.

**Live app:** https://crm-contact-workspace.vercel.app
**Live API:** https://crm-contact-workspace.onrender.com/api/health

> The API runs on a free tier and sleeps after 15 minutes of inactivity. The
> first request wakes it, which takes 30–60 seconds — measured at 22s. If the
> app looks stuck on first load, that is why; opening the API health check
> above first warms it.

---

## Contents

Mapping the brief's submission requirements to where each is answered.

| Requirement | Section |
|---|---|
| How to run the frontend and backend | [Running it](#running-it) |
| Tech stack used | [Tech stack](#tech-stack) |
| Important technical decisions | [Important technical decisions](#important-technical-decisions) |
| Data model | [Data model](#data-model) |
| Concurrent update approach | [Concurrent updates](#concurrent-updates) |
| Known issues / incomplete functionality | [Known issues](#known-issues) |
| Scale considerations | [Scale considerations](#scale-considerations) |
| AI usage | [AI usage](#ai-usage) |

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind, TanStack Query, React Hook Form, Zod |
| Backend | Node 22, Express 5, TypeScript (ESM), Mongoose 8, Zod, pino |
| Database | MongoDB (Atlas in production) |
| Tests | Vitest — Supertest + mongodb-memory-server on the API, Testing Library + MSW on the client |
| Hosting | Render (API), Vercel (frontend), MongoDB Atlas |

TypeScript is `strict` with `noUncheckedIndexedAccess` in both packages.

---

## Repository layout

```
.
├── render.yaml      Deployment config for the API
├── server/          Backend API
└── client/          Frontend app
```

Two independent packages with their own `package.json`, deployed separately
but version-controlled together, so an API change and the UI consuming it land
in one commit.

---

## Running it

**Prerequisites:** Node 20+, and MongoDB running locally (or an Atlas URI).

```bash
cd server
npm install
cp .env.example .env     # defaults work against a local MongoDB
npm run seed             # 250 sample contacts
npm run dev              # http://localhost:4000
```

```bash
cd client
npm install
cp .env.example .env     # defaults to http://localhost:4000/api
npm run dev              # http://localhost:5173
```

`http://localhost:5173` is the origin the backend's `CORS_ORIGIN` allows by
default. Requests go straight to the API rather than through a dev proxy, so
local and deployed behaviour match.

### Scripts

Both packages: `dev`, `build`, `typecheck`, `test`, `test:watch`.
Additionally `start` and `seed` on the server, `preview` and `lint` on the
client.

### Tests

```bash
cd server && npm test     # 62 tests
cd client && npm test     # 49 tests
```

The API tests run against a real MongoDB started in memory, so **no local
MongoDB is needed** and they never touch development data. The version is
pinned in `package.json` because the latest builds require macOS 14+.

The client tests run components against a mock HTTP layer (MSW) rather than
mocked modules, so the Axios instance, the error interceptor and TanStack
Query all execute for real.

Both suites are risk-targeted rather than coverage-targeted: optimistic
locking, email uniqueness, tag idempotency and pagination stability on the
API; the version-conflict resolution flow, error parsing, URL state and bulk
selection on the client.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | — | **Required.** MongoDB connection string |
| `PORT` | `4000` | HTTP port |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` | pino log level |
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | Client → API base URL |

Server config is validated with Zod at startup; the server refuses to boot on
invalid config rather than failing later at request time.

---

## Data model

Two collections.

### `contacts`

```js
{
  _id, firstName, lastName,
  email,    // optional, lowercased, unique when present
  phone,    // optional
  company,  // optional
  tags: ["Customer", "Prospect"],

  firstNameLower, lastNameLower, companyLower,  // denormalised for indexed search
  phoneDigits,                                  // digits only: formatting never matters

  version,  // optimistic locking
  createdAt, updatedAt
}
```

**The denormalised lowercase fields exist for one reason:** MongoDB uses an
index for a regex only when it is anchored *and* case-sensitive. The `i` flag
disables the prefix optimisation, so `/^laura/i` degrades to a collection
scan. Storing a lowercase copy and querying it with an anchored case-sensitive
regex keeps the index in play.

**Tags are embedded** rather than a separate collection: a small bounded list,
always read with the contact, and a single multikey index serves both match-any
and match-all. The cost is that tags are strings rather than entities, so a
global rename is a multi-document update and `"VIP"` and `"vip"` differ.

### `activities`

```js
{ _id, contactId, type, metadata, createdAt }
// type: CONTACT_UPDATED | TAG_ADDED | TAG_REMOVED
// metadata: { fields?: [...], tag?: "VIP", bulk?: true }
```

A separate collection because history grows without bound while the contact
does not — embedding would make every contact read carry its whole history and
eventually meet the 16 MB document limit.

### Indexes

| Name | Fields | Serves |
|---|---|---|
| `uniq_email_when_present` | `{ email }`, unique, partial on `$type: "string"` | Email uniqueness |
| `sort_by_name` | `{ lastNameLower, firstNameLower, _id }` | `sortBy=name` |
| `sort_by_created` | `{ createdAt: -1, _id: -1 }` | Default sort |
| `search_first_name` | `{ firstNameLower }` | Name prefix search |
| `search_phone` | `{ phoneDigits }` | Phone search |
| `filter_tags` | `{ tags }` multikey | Tag filter, `GET /api/tags` |
| `filter_company` | `{ companyLower }` | Company filter |
| `list_companies` | `{ company }` | `GET /api/companies` |
| `activity_by_contact` | `{ contactId, createdAt: -1, _id: -1 }` | Activity list |

**The email index is partial** because the brief says email is unique *when
present*. A plain unique index treats a missing field as `null` and would allow
only one contact without an email. Enforcing it in the database also removes
the race a `findOne`-then-`insert` check would have.

**Every sort ends with `_id`** because documents with equal sort keys have no
defined relative order — without it, pagination repeats some rows and never
shows others.

---

## API

Base path `/api`. Search, filtering, sorting and pagination are all performed
by the backend.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/contacts` | List with search, filter, sort, pagination |
| `GET` | `/contacts/:id` | One contact |
| `PUT` | `/contacts/:id` | Update — **requires `version`** |
| `POST` | `/contacts/:id/tags` | Add a tag — `{ tag }` |
| `DELETE` | `/contacts/:id/tags/:tag` | Remove a tag |
| `POST` | `/contacts/tags/bulk` | `{ contactIds, tag, action }`, max 500 |
| `GET` | `/contacts/:id/activities` | History, newest first, `?limit=` 1–100 |
| `GET` | `/tags`, `/companies` | Distinct values, for filter dropdowns |
| `GET` | `/health`, `/health/ready` | Liveness, readiness |

**List query parameters:** `search`, `tags` (comma-separated), `tagMatch`
(`any`\|`all`), `company`, `createdFrom`, `createdTo`, `sortBy`
(`name`\|`createdAt`\|`updatedAt`), `sortOrder`, `page`, `limit` (max 100).

`GET /contacts` returns `{ items, pagination }`; everything else returns
`{ data }`. Optional fields are **omitted** when absent, never `null`.

```json
{
  "items": [{
    "id": "6ad36a9f056b3ff2b05514ec",
    "firstName": "Laura", "lastName": "Wilson",
    "email": "laura.wilson@lumen.com", "phone": "+1-797-5769",
    "company": "Lumen Analytics",
    "tags": ["Customer", "Prospect"],
    "version": 0,
    "createdAt": "2026-10-17T05:21:00.000Z",
    "updatedAt": "2026-10-17T05:21:00.000Z"
  }],
  "pagination": {
    "page": 1, "limit": 25, "total": 250, "totalPages": 10,
    "hasNextPage": true, "hasPreviousPage": false
  }
}
```

**`PUT` replaces rather than patches.** `firstName` and `lastName` are
required; omitting an optional field clears it. The body must carry the
`version` the client last read.

### Errors

Every error uses one envelope with a stable machine-readable code. Clients
branch on `code`, never on `message`.

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "…", "details": { } } }
```

| Code | Status | `details` |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `[{ field, message }]` — attaches to form inputs |
| `NOT_FOUND` | 404 | — |
| `DUPLICATE_EMAIL` | 409 | `{ field: "email" }` |
| `VERSION_CONFLICT` | 409 | `{ current: Contact }` — the full server-side contact |
| `INTERNAL_ERROR` | 500 | — |

---

## Concurrent updates

Every contact carries a `version`. Clients send back the version they read, and
the update applies only if it still matches:

```js
findOneAndUpdate(
  { _id: id, version: clientVersion },
  { $set: changes, $inc: { version: 1 } },
)
```

MongoDB applies a single-document update atomically, so the match and the
increment cannot interleave — there is no check-then-write gap. If two users
both read version 3 and both save, exactly one succeeds; the other matches
nothing and receives `409 VERSION_CONFLICT` with the current server state
attached.

Verified with 8 simultaneous writers sending the same version: 1 succeeded, 7
were rejected.

**The frontend uses that attached state rather than discarding the edit.** The
conflict dialog lists only the fields that actually differ, offers the user's
value or the server's per field, and resubmits with the version from
`details.current`. If someone saves again mid-resolution, the same dialog
reopens against the newer version.

**Tag operations deliberately skip the version check.** They write fields `PUT`
never touches, so there is no lost update to prevent, and `$addToSet`/`$pull`
are atomic and idempotent on their own — verified with 10 concurrent adds of
the same tag producing one tag and one activity entry. Keeping tags out of the
check also avoids throwing false conflicts at someone with an edit form open
while a colleague tags the contact.

---

## Important technical decisions

| Decision | Alternative rejected | Why |
|---|---|---|
| Optimistic locking via an explicit `version` | A timestamp, or Mongoose's `__v` | A timestamp collides within a millisecond; `__v` does not increment on `findOneAndUpdate` |
| Tag writes outside the version check | Bumping `version` on every write | No lost update to prevent, and bumping throws false conflicts at open edit forms |
| Email uniqueness via a unique partial index | `findOne` before `insert` | A database constraint has no race window |
| Prefix search over denormalised lowercase fields | Case-insensitive regex `/^joh/i` | The `i` flag disables index prefix optimisation — a collection scan per keystroke |
| `$type: "string"` guard on the email search branch | Leaving it out | The email index is partial; without the guard that branch is unindexable, and one unindexable `$or` branch makes MongoDB abandon indexes for the whole query. Found with `explain()` |
| `_id` as the final sort key, always | Sorting on the chosen field alone | Equal sort keys otherwise make pagination repeat and skip rows |
| Offset pagination | Keyset cursors | Offset produces "page 7 of 13" and jump-to-page, which a records UI needs. Its cost is covered below |
| Activity in its own collection, best-effort | Embedding, or a transaction | Unbounded growth, and atomicity needs a replica set |
| Express 5 | Express 4 | Async errors forward to the error handler without per-route try/catch |
| `createApp()` separate from `listen()` | A single entry point | Tests drive the real app over HTTP without binding a port |
| The URL as the frontend's source of truth | Component state or a store | Filtered views become shareable links, the back button works, and the cache key cannot disagree with the request |
| Pessimistic save, optimistic tagging | One policy for both | A save can return a conflict needing resolution; tag writes are idempotent with nothing to roll back to |
| A typed error union discriminated on `code` | One shape with optional fields | The server sends four different `details` shapes; narrowing gives the right payload with no casts |
| React, despite the brief preferring Vue | Vue | The brief permits any modern framework; defensibility under questioning mattered more |
| Render for the API, Vercel for the frontend | Vercel for both | Vercel runs serverless functions. This API holds a connection pool, handles `SIGTERM` and exposes a readiness probe — all of which assume a long-lived process |

---

## Scale considerations

What would change at the scale the brief describes. None of it is implemented;
these are the things in *this* codebase that break first.

**Millions of contacts.** `skip(n)` is O(n) — MongoDB walks and discards every
skipped document, so deep pages degrade linearly. Replace offset with keyset
pagination; every sort already ends in `_id`, which is the precondition.
`countDocuments` on every list request is a second full index scan, so drop
the exact total for "has more". Prefix-only search needs Atlas Search or
Elasticsearch for substring and fuzzy matching. `/tags` and `/companies` use
`distinct`, which has a 16 MB ceiling — both become prefix-limited typeaheads.

**Millions of updates per day.** The activity collection grows without bound:
TTL retention or archival. Best-effort activity writes become unacceptable at
audit volume — move to an outbox written in the same transaction, or derive the
log from change streams. Nine indexes is significant B-tree maintenance per
write, so some would be merged or dropped. Shard on `accountId` once one
replica set cannot absorb the write rate.

**Frequent searches and filters.** Cache the tag and company vocabularies in
Redis — they change rarely and are fetched on every page load. Read replicas
with secondary reads for browsing. Projections, since the list endpoint
currently returns whole documents.

**Many simultaneous users.** The API is stateless, so it scales horizontally
behind a load balancer with no session affinity — the main thing this design
already gets right. Add connection-pool tuning and Redis-backed rate limiting
so limits are shared across instances.

**Multi-tenancy.** All of the above assumes one account. A real CRM needs
`accountId` on every document and as the **leading field of every compound
index**. That is a schema decision rather than a tuning exercise, which is why
it is the one worth settling early.

---

## Known issues

| Limitation | Detail |
|---|---|
| No create or delete | Deliberate — the brief asks for browse, view, update and tags |
| Search is prefix-only | `ohn` does not match `John`. The input says so rather than leaving the user guessing |
| Company filter is an exact match | Which is why it is a dropdown, not a text box |
| Activity writes are best-effort | They do not fail the request, so this is a history, not an audit log |
| No authentication or multi-tenancy | Out of scope; the API is public |
| `countDocuments` on every list request | Free at 250 contacts, costly at millions |
| Bulk tagging capped at 500 | Larger selections need a background job and progress UI |
| "Select all" covers the current page only | Selecting everything matching a filter needs a server-side endpoint |
| Tags are case-sensitive strings | `"VIP"` and `"vip"` are different tags |
| The client bundle is not code-split | ~219 kB gzipped in one chunk; route-level lazy loading would help |
| No end-to-end browser tests | Every flow was verified by hand, including the conflict path from two writers, but none of it is automated |
| Free-tier API sleeps after 15 minutes | First request then takes 30–60s; the client timeout is 65s so it waits rather than failing |
| `render.yaml` documents the deployment but does not drive it | The service predates the file |

---

## Deployment

**API on Render**, described by `render.yaml` rather than living only in
dashboard settings. `rootDir: server` because there is no root `package.json`;
`--include=dev` because `NODE_ENV=production` makes npm skip devDependencies
and TypeScript lives there; `PORT` is left unset because Render injects it.

**Frontend on Vercel**, configured by `client/vercel.json`. The rewrite sends
unmatched paths to `index.html` — without it a reload on `/contacts/:id` would
404 on the static host instead of reaching the router. Two settings cannot live
in the file: **Root Directory** (`client`) and `VITE_API_BASE_URL`, which Vite
inlines at build time and so must exist before the build.

**CORS.** `CORS_ORIGIN` on Render is the deployed frontend origin only. Local
development runs against a local API, so production has no reason to trust a
developer's machine. A failure here is easy to misread: the API answers `200`
and simply omits the `access-control-allow-origin` header, so the browser
discards a good response and the app reports a network error — the server looks
down when it is not.

**Atlas network access is `0.0.0.0/0`** because Render's free tier has no
static outbound IP, so access is controlled by credentials instead. Production
would use VPC peering or private endpoints.

---

## AI usage

**Tool:** Claude Code (Anthropic), used throughout.

**What I used it for:** scaffolding and boilerplate; drafting both test suites
against a list of risks I chose rather than letting it pick; checking MongoDB
query plans with `explain()` rather than assuming an index was used; debugging
environment-specific failures; and drafting documentation.

Checking the query plans caught two real problems: an `$or` branch on the
partially indexed `email` field that was silently disabling index use for the
whole query, and a `distinct("company")` that was a collection scan because the
only company index covered `companyLower`.

**A suggestion I rejected.** When configuring CORS for the deployed frontend,
the suggested value kept the local dev origin alongside the production one:
`http://localhost:5173,https://crm-contact-workspace.vercel.app`. It was
already there, and it made it possible to test a production build against the
live API.

I rejected it. Production configuration should describe production. CORS does
not restrict who can *call* this API — it is public and unauthenticated, so
anything can `curl` it — but it does decide which browser origins may *read*
the response, and listing a developer's machine is the kind of permission that
survives long after the thing that made it harmless is gone. If the API later
gained cookie-based auth, that entry would become a real problem rather than a
cosmetic one. Local development already runs against a local API, so it was
convenience, not necessity.

The deployed value is the Vercel origin only. When I needed to verify a
production build against the live API during deployment, I did it as a
deliberate temporary change rather than standing configuration.

**On defending the implementation:** every decision here was reviewed and is
one I can explain, including the ones where the first suggestion was wrong and
had to be replaced.
