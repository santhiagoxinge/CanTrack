# CanTrack

Operations software for neighbourhood dog walkers: owners enroll their dogs with photos, walkers run ordered pickup routes and check dogs in with a photo at each stop.

Final project for Estructuras de Datos, UCC 2026-2. TypeScript only, free tier end to end.

## What it does

- **Accounts** — sign up as walker or owner, log in, password reset (Supabase Auth).
- **Dogs** — owners CRUD their dogs and enroll each one with 3 reference photos. Photos are embedded with CLIP in the browser; only numeric vectors reach the API.
- **Routes** — walkers create ordered routes of stops (one dog per stop), reorder/remove stops before starting.
- **Next pickup** — the next scheduled pickup across a walker's active routes, in O(log n).
- **Pickup path** — shortest path over a street graph supplied per request.
- **Check-in** — walker takes a photo at a stop; cosine similarity against the route's dogs auto-confirms above threshold, otherwise the walker picks from candidates. Undo pops the most recent check-in.

## Hand-written data structures

`packages/structures` has zero runtime dependencies — every structure below is implemented from scratch, each with Big-O docstrings and its own unit tests.

| Structure | Used for |
|---|---|
| `SinglyLinkedList` | Route stop sequence (FR-06/07) |
| `AvlTree` | Next pickup keyed by pickup time (FR-08) |
| `WeightedGraph` + Dijkstra | Pickup path (FR-09) |
| `Stack` | Check-in undo (FR-11) |
| `DoublyLinkedList` | Walk timeline, forward/backward (FR-12) |
| `CircularList` | Recurring route rotation (FR-13) |
| `Queue` | GPS point buffer before persisting (FR-14) |

Later (final delivery): Union-Find pack grouping, Quadtree nearest dog, Interval Tree time conflicts, Trie autocomplete, live GPS, Groq incident dictation, daily reports, stats dashboard.

## Repo layout

```
apps/api/            NestJS API (Supabase Postgres + Auth, class-validator)
apps/api/schema.sql  Postgres schema the services assume exists
apps/web/            React 19 + Vite PWA (walker app + owner app)
packages/structures/ Hand-written data structures, no dependencies
tests/               API, web, and per-structure unit tests (vitest)
docs/                REQUIREMENTS.md (FR/NFR), TASKS.md (task queue)
tools/               Dev/loop helpers
```

## Quickstart

Requires Node >= 20 and pnpm.

```bash
pnpm install
pnpm test            # full vitest suite from the repo root
```

Run the apps (two terminals):

```bash
cd apps/api && pnpm start:dev
cd apps/web && pnpm dev
```

Create the Supabase tables first with `apps/api/schema.sql`.

## Environment

`apps/api/.env`:

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`apps/web/.env`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_URL=http://localhost:3000
```

Secrets live only in env vars — never commit them. The web app uses the publishable key only; the service-role key belongs to the API.

## API sketch

- `POST /auth/signup | POST /auth/login | POST /auth/reset-password`
- `GET/POST /dogs`, `GET/PATCH/DELETE /dogs/:id`, `POST /dogs/:id/embedding`
- `GET/POST /routes`, `GET /routes/:id`, `PATCH /routes/:id` (reorder/remove stops)
- `GET /routes/next-pickup`, `POST /routes/path`
- `POST /routes/:id/checkin`, `DELETE /routes/:id/checkin/undo`

Invalid bodies return 400; rows belonging to another user return 404 (never 403, to avoid leaking existence). Unreachable path targets return 400.

## Deploy targets

Vercel (web), Render (API), Supabase (DB + auth + realtime + pgvector), Groq (AI inference).
