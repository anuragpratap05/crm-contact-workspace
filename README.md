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
| `npm test` | Run tests |

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
