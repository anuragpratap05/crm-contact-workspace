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

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript (Vite), Tailwind CSS, TanStack Query, Axios |
| Backend | Node.js + Express 5 + TypeScript |
| Database | MongoDB (Mongoose) |
| Validation | Zod |
| Logging | pino |
| Tests | Vitest + Supertest + mongodb-memory-server |
| Hosting | Render (API) · MongoDB Atlas (database) |

---

## Repository layout

```
.
├── render.yaml      Deployment config for the API
├── server/          Backend API
└── client/          Frontend app
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

62 integration tests covering the highest-risk paths: optimistic locking,
email uniqueness, tag idempotency, pagination stability, search, filtering,
input validation and the tag and company listings.

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

## Running the frontend

**Prerequisites:** Node 20+, and the backend running (see above).

```bash
cd client
npm install
cp .env.example .env     # defaults to http://localhost:4000/api
npm run dev
```

The app starts on `http://localhost:5173`, which is the origin the backend's
`CORS_ORIGIN` already allows by default. Requests go straight to the API rather
than through a dev proxy, so local and deployed behaviour are the same.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type check without building |
| `npm run lint` | Lint with oxlint |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |

### Tests

```bash
cd client
npm test
```

49 tests covering the highest-risk paths: the version-conflict resolution
flow, the error-envelope parser, URL query-parameter handling, the bulk
selection model, and the list's empty states.

Components are tested against a mock API (MSW) rather than mocked modules, so
the Axios instance, the response interceptor and TanStack Query all run for
real.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | Base URL of the API, including `/api` |

---

## Data model

Two collections. MongoDB was chosen because a contact is a self-contained
document whose most-queried child — its tags — is a small bounded list.

### `contacts`

```js
{
  _id:        ObjectId,
  firstName:  "Laura",
  lastName:   "Wilson",
  email:      "laura.wilson@lumen.com",  // optional, lowercased, unique when present
  phone:      "+1-797-5769",             // optional
  company:    "Lumen Analytics",         // optional
  tags:       ["Customer", "Prospect"],

  firstNameLower: "laura",               // denormalised, for indexed prefix search
  lastNameLower:  "wilson",
  companyLower:   "lumen analytics",     // denormalised, for the exact company filter
  phoneDigits:    "17975769",            // digits only, so formatting never matters

  version:    0,                         // optimistic locking
  createdAt:  ISODate,
  updatedAt:  ISODate
}
```

**Why the denormalised lowercase fields.** MongoDB can use an index for a regex
only when it is anchored *and* case-sensitive — the `i` flag disables the
prefix optimisation, so `/^laura/i` degrades to a collection scan. Storing a
lowercase copy and querying it with an anchored case-sensitive regex keeps the
index in play. `phoneDigits` exists for the same reason in a different
direction: stripping formatting at write time means `+1-797-5769`,
`17975769` and `797-5769` all match the same stored value.

**Why tags are embedded rather than their own collection.** They are a small,
bounded list, always read with the contact, and MongoDB indexes array fields
natively — a single multikey index on `tags` serves both `$in` (match any) and
`$all` (match all). A separate collection would add a `$lookup` to every list
query for no benefit at this size. The cost is real and acknowledged: tags are
strings rather than entities, so renaming one globally is a multi-document
update and `"VIP"` and `"vip"` are different tags.

### `activities`

```js
{
  _id:       ObjectId,
  contactId: ObjectId,
  type:      "CONTACT_UPDATED" | "TAG_ADDED" | "TAG_REMOVED",
  metadata:  { fields?: ["phone", "company"], tag?: "VIP", bulk?: true },
  createdAt: ISODate
}
```

**Why a separate collection.** A contact's history grows without bound while
the contact itself does not. Embedding would make every contact read carry its
entire history and would eventually meet MongoDB's 16 MB document limit.
`metadata` is deliberately loose because the three event types carry different
payloads.

### Indexes

| Name | Fields | Serves |
|---|---|---|
| `uniq_email_when_present` | `{ email: 1 }`, unique, partial on `$type: "string"` | Email uniqueness |
| `sort_by_name` | `{ lastNameLower, firstNameLower, _id }` | `sortBy=name` |
| `sort_by_created` | `{ createdAt: -1, _id: -1 }` | `sortBy=createdAt`, the default |
| `search_first_name` | `{ firstNameLower }` | First-name prefix search |
| `search_phone` | `{ phoneDigits }` | Phone search |
| `filter_tags` | `{ tags }` (multikey) | Tag filter and `GET /api/tags` |
| `filter_company` | `{ companyLower }` | Company filter |
| `list_companies` | `{ company }` | `GET /api/companies` |
| `activity_by_contact` | `{ contactId, createdAt: -1, _id: -1 }` | Activity list |

**Why the email index is partial.** The brief says email is unique *when
present*. A plain unique index treats a missing field as `null` and would allow
only one contact without an email. The partial filter excludes those documents
from the constraint entirely. Enforcing it in the database rather than with an
application-level check also removes the check-then-write race that a
`findOne` before `insert` would have.

**Why every sort ends with `_id`.** Documents with equal sort keys have no
defined relative order, so the same row can appear on two pages while another
is never shown. Appending `_id` makes the ordering total. This also happens to
be the precondition for migrating to keyset pagination later.

**Why `list_companies` duplicates `filter_company`.** The filter matches on
`companyLower`; the dropdown needs the display-cased `company`. `explain()`
showed `distinct("company")` as a `COLLSCAN` without its own index and a
`DISTINCT_SCAN` with one. Keeping both is duplication, and the production
answer is one index with a case-insensitive collation serving both.

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

### `GET /api/companies`

Returns `{ "data": string[] }` — the distinct companies in use, for the company
filter dropdown. The `company` filter is an exact match, so the frontend needs
the set of real values rather than a free-text box.

Companies differing only in case are collapsed into one entry, because the
filter itself is case-insensitive and would otherwise offer two options that
return identical results.

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

## Important technical decisions

| Decision | Alternative rejected | Why |
|---|---|---|
| **Optimistic locking via an explicit `version` field** | A timestamp, or Mongoose's `__v` | A timestamp collides within a millisecond; `__v` does not increment on `findOneAndUpdate`. `version` is incremented in the same atomic update that matches on it, so there is no check-then-write gap |
| **Tag operations stay outside the version check** | Bumping `version` on every write | Tag endpoints touch fields `PUT` never writes, so there is no lost update to prevent. Bumping would throw false conflicts at anyone with an edit form open while a colleague tags the contact |
| **Email uniqueness enforced by a unique partial index** | `findOne` before `insert` | A database constraint has no race window. The partial filter is what makes "unique when present" expressible |
| **Prefix search over denormalised lowercase fields** | Case-insensitive regex `/^joh/i` | The `i` flag disables MongoDB's index prefix optimisation, so the obvious version is a collection scan on every keystroke. The trade is that `ohn` does not match `John` |
| **`$type: "string"` guard on the email search branch** | Leaving it out | The email index is partial. Without the type guard that branch is unindexable, and one unindexable branch makes MongoDB abandon indexes for the whole `$or`. Found with `explain()`, not by reading |
| **`_id` as the final sort key, always** | Sorting on the chosen field alone | Equal sort keys otherwise have undefined order, so pagination silently repeats and skips rows |
| **Offset pagination** | Keyset cursors | Offset is what produces "page 7 of 13" and a jump-to-page control, which a records UI wants. Its cost at scale is covered below |
| **Activity in its own collection, written best-effort** | Embedding, or a transaction | Unbounded growth does not belong in the contact document. Atomic writes need a transaction, which needs a replica set, which a standalone local MongoDB does not have |
| **Express 5** | Express 4 | Async errors forward to the error handler automatically, so every route does not need a try/catch wrapper |
| **Zod at every entry point, validated into `req.validated`** | Trusting the handler | One schema per route defines the contract, and handlers receive parsed and typed data rather than raw strings |
| **`createApp()` separate from `listen()`** | A single `index.ts` | Tests drive the real app over HTTP with Supertest without binding a port |
| **The URL as the frontend's single source of truth** | Component state or a store | A filtered view becomes a shareable link, the back button works through filter changes, and the cache key cannot disagree with the request |
| **`keepPreviousData` on the list query** | A spinner between pages | Rows stay on screen, dimmed, instead of the table collapsing and the controls jumping under the cursor |
| **Pessimistic save, optimistic tagging** | One policy for both | A save can come back as a conflict that needs resolving, so it waits. Tag writes are idempotent and skip the version check, so there is nothing to roll back to and no reason to wait |
| **A typed error union discriminated on `code`** | One error shape with optional fields | The server sends four different `details` shapes. Narrowing on `code` gives the right payload with no casts, which is what makes the conflict UI possible |
| **React, despite the brief preferring Vue** | Vue | The brief permits any modern framework. Choosing the one I can defend under questioning mattered more than matching the stated preference |
| **Render for the API, Vercel for the frontend** | Vercel for both | Vercel runs serverless functions, not long-lived processes. This API opens a Mongoose connection pool at boot, handles `SIGTERM` for graceful shutdown, and exposes a readiness probe — all of which assume a process that stays up |

---

## Scale considerations

The brief asks what would change at production scale. Nothing below is
implemented; the current code is sized for the brief, and these are the
specific things that would break first.

### Millions of contacts per account

- **`skip(n)` is O(n).** MongoDB walks and discards every skipped document, so
  deep pages get linearly slower. Replace offset with **keyset pagination** —
  `{ $or: [{ sortField: { $gt: last } }, { sortField: last, _id: { $gt: lastId } }] }`.
  Every sort already ends with `_id`, which is exactly the precondition.
- **`countDocuments` runs on every list request**, a second full index scan.
  Drop the exact total in favour of "has more", or cache an approximate count.
- **Prefix-only search stops being enough.** Substring and fuzzy matching need
  **Atlas Search** or Elasticsearch; a regex cannot do it with an index.
- **`GET /api/tags` and `/api/companies` use `distinct`**, which has a 16 MB
  result ceiling and returns everything. Both become prefix-limited typeaheads.

### Millions of updates per day

- **The activity collection grows without bound.** A TTL index for retention,
  or archival to cold storage, plus a capped working set.
- **Best-effort activity writes become unacceptable** at audit volume. Move to
  an outbox table written in the same transaction, or derive the log from
  **change streams** so the write path cannot skip it.
- **Write amplification from indexes.** Nine indexes on `contacts` is a lot of
  B-tree maintenance per write; some would be dropped or merged.
- **Sharding** on `accountId` once a single replica set cannot absorb the write
  rate.

### Frequent searches and filters

- **Cache the hot paths** in Redis — the tag and company vocabularies change
  rarely and are requested on every page load.
- **Read replicas** with secondary reads for list queries, accepting eventual
  consistency for browsing while keeping writes on the primary.
- **Projections.** The list endpoint returns whole documents; sending only the
  table's columns cuts payload and index-covering becomes possible.

### Many simultaneous users

- **The API is stateless**, so it scales horizontally behind a load balancer
  with no session affinity. That is the main thing this design already gets
  right.
- **Connection pool tuning**, since every instance holds its own pool against
  the same cluster.
- **Rate limiting**, backed by Redis so limits are shared across instances.

### Multi-tenancy

Everything above assumes one account. A real CRM needs `accountId` on every
document and as the **leading field of every compound index**, so one tenant's
data is never scanned to answer another's query. That is a schema change, not
a tuning exercise, which is why it is worth deciding early.

---

## Known issues and incomplete functionality

| Limitation | Detail |
|---|---|
| **No create or delete** | Deliberate. The brief asks for browse, view, update and tag management; a half-built CRUD surface would have been scope creep |
| **Search is prefix-only** | `ohn` does not match `John`. A consequence of keeping the regex indexable; the search input says so rather than leaving the user guessing |
| **Company filter is an exact match** | Which is why it is a dropdown rather than a text box — a partial company name returns nothing |
| **Activity writes are best-effort** | They do not fail the request, so a tag can in principle be applied without its log entry. Not an audit log |
| **No authentication or multi-tenancy** | Out of scope for the brief. The API is public |
| **`countDocuments` on every list request** | Free at 250 contacts, a real cost at millions |
| **Bulk tagging capped at 500 contacts** | The server's limit. Larger selections need a background job and a progress UI |
| **"Select all" covers the current page only** | Selecting every contact matching a filter would need a server-side "apply to this query" endpoint |
| **Selection is lost when navigating to a contact and back** | It lives in the list page's state |
| **Tags are case-sensitive strings** | `"VIP"` and `"vip"` are different tags. The company listing collapses case; the tag vocabulary does not |
| **The frontend bundle is not code-split** | ~700 kB raw, ~219 kB gzipped in one chunk. Route-level lazy loading would keep Zod and react-hook-form out of the list bundle |
| **No end-to-end browser tests** | Every flow was verified by hand in a browser, including the conflict path driven from two concurrent writers, but none of that is automated |
| **Free-tier API sleeps after 15 minutes** | The first request then takes 30–60 seconds; measured cold start is 22s. The client's timeout is 65s so it waits rather than failing |
| **`render.yaml` documents the deployment but does not drive it** | The service was created through the dashboard before the file existed |

---

## Deployment

The API runs on **Render**, backed by a **MongoDB Atlas** free cluster.

`render.yaml` at the repository root describes the service, so the deployment
is version-controlled rather than existing only as dashboard settings.

```yaml
rootDir: server                                  # monorepo: build from server/, not the repo root
buildCommand: npm ci --include=dev && npm run build
startCommand: npm start
healthCheckPath: /api/health
```

### Notes on the configuration

**`rootDir: server`** — the repository has no root `package.json`. Without
this, the build finds nothing to install.

**`--include=dev`** — `NODE_ENV=production` makes npm skip devDependencies,
and TypeScript lives there. Without the flag the build fails with
`tsc: not found`. The dev dependencies are used at build time only.

**`MONGOMS_DISABLE_POSTINSTALL=1`** — `mongodb-memory-server` (a test
dependency) downloads a ~150 MB MongoDB binary on install. Tests do not run on
Render, so the download is skipped. This cut build time to about 50 seconds.

**`sync: false`** on `MONGODB_URI` and `CORS_ORIGIN` — these are set in the
Render dashboard, never committed. Everything else is non-secret and lives in
the file.

**`PORT` is not set.** Render injects it, and the app reads `process.env.PORT`.
Hardcoding a port would make the service unreachable.

### Environment variables to set in Render

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string, including the database name |
| `CORS_ORIGIN` | Deployed frontend origin, comma-separated for multiple |

### MongoDB Atlas

Network Access must include `0.0.0.0/0`. Render's free tier has no static
outbound IP, so an address-based allowlist cannot work — access is controlled
by the database credentials instead. Production would use VPC peering or
private endpoints.

### Free tier behaviour

The instance **sleeps after 15 minutes of inactivity**; the next request takes
30–60 seconds while it wakes. Requesting `/api/health` first warms it up.

Measured cold start: 22 seconds. The frontend's request timeout is 65 seconds
so that the first request of the day succeeds rather than failing before the
server is awake.

---

## Frontend deployment

The frontend deploys to **Vercel** from the same repository.

`client/vercel.json` holds the configuration that can live in the repo:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The rewrite sends every unmatched path to `index.html`. Without it a reload on
`/contacts/:id` would 404 on the static host instead of reaching the router —
Vercel checks the filesystem first, so hashed assets are still served directly.

### Project settings

Two things cannot be expressed in `vercel.json` and are set in the Vercel
project:

| Setting | Value | Why |
|---|---|---|
| Root Directory | `client` | The repository has no root `package.json`; this is the same problem `rootDir: server` solves for Render |
| `VITE_API_BASE_URL` | `https://crm-contact-workspace.onrender.com/api` | Baked into the bundle at build time, so it must be set before the build |

### CORS

`CORS_ORIGIN` on Render is the deployed frontend origin and nothing else:

```
https://crm-contact-workspace.vercel.app
```

It is a comma-separated list, so local origins *could* be added — but they are
deliberately not. Local development runs the frontend against a local API
(`client/.env.example` defaults to `http://localhost:4000/api`), so production
has no reason to trust a developer's machine. CORS does not restrict who can
call the API — it is public and unauthenticated, so anything can `curl` it —
but it does decide which browser origins may read the response, and that list
should describe production only.

A failure here is easy to misread: the API answers normally with `200` and
simply omits the `access-control-allow-origin` header, so the browser discards
a perfectly good response and the app reports a network error. The server looks
down when it is not.

Vercel preview deployments get their own generated origins, which this exact
list will not match, so previews cannot reach the API.

---

## AI usage

**Tool:** Claude Code (Anthropic), used throughout the project.

**What I used it for:**

- Scaffolding and boilerplate — project setup, config, repetitive component
  and route structure.
- Drafting both test suites against a list of risks I chose, rather than
  letting it pick what to test.
- Checking MongoDB query plans with `explain()` rather than assuming an index
  was used. This caught two real problems: an `$or` branch on the partially
  indexed `email` field that was silently disabling index use for the whole
  query, and a `distinct("company")` that was a collection scan because the
  only company index covered `companyLower`.
- Debugging environment-specific failures — a `SIGABRT` from
  `mongodb-memory-server` on macOS 13, and a jsdom CORS rejection that made
  every mocked API response look like a network error.
- Drafting this documentation.

**A suggestion I rejected:**

When configuring CORS for the deployed frontend, the suggested value was
`http://localhost:5173,https://crm-contact-workspace.vercel.app` — keeping the
local dev origin alongside the production one, because it was already there and
it made it possible to test a production build against the live API.

I rejected it. Production configuration should describe production. CORS does
not restrict who can call this API — it is public and unauthenticated, so
anything can `curl` it — but it does decide which browser origins may read the
response, and listing a developer's machine there is the kind of permission
that survives long after the thing that made it harmless is gone. If the API
later gained cookie-based auth, an allow-listed local origin would become a
genuine problem rather than a cosmetic one. Local development already runs
against a local API, so the entry was convenience, not necessity.

The deployed value is the Vercel origin only. When I needed to verify a
production build against the live API during deployment, I did it as a
deliberate temporary change rather than standing configuration.

**On defending the implementation:** every decision in this README was reviewed
and is one I can explain, including the ones where the first suggestion was
wrong and had to be replaced.
