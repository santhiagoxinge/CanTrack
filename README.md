# CanTrack

Operations software for neighbourhood dog walkers: owners enroll their dogs with photos, walkers run ordered pickup routes and check dogs in with a photo at each stop.

Final project for Estructuras de Datos, UCC 2026-2. Python (FastAPI) backend, TypeScript (React) frontend, free tier end to end.

## What it does

- **Accounts** — sign up as walker or owner, log in, password reset (Supabase Auth).
- **Dogs** — owners CRUD their dogs and enroll each one with 3 reference photos. Photos are uploaded to the API, which embeds them with CLIP (ONNX, running inside the backend) and stores the mean vector.
- **Routes** — walkers create ordered routes of stops (one dog per stop), reorder/remove stops before starting.
- **Next pickup** — the next scheduled pickup across a walker's active routes, in O(log n).
- **Pickup path** — shortest path over a street graph supplied per request.
- **Check-in** — walker takes a photo at a stop. The API embeds it (CLIP) and asks a vision model (Ollama) whether a dog is actually in the photo; cosine similarity against the route's dogs auto-confirms above 0.8, otherwise the walker picks from candidates. Undo pops the most recent check-in off a stack.

<img width="2020" height="1575" alt="image" src="https://github.com/user-attachments/assets/57e532d4-15d9-40b5-9308-4198194cbc92" />


## Hand-written data structures

`apps/api-py/src/cantrack_api/structures` uses only the Python standard library for typing — every structure below is implemented from scratch, each with Big-O docstrings and its own unit tests.

| Structure | Used for |
|---|---|
| `SinglyLinkedList` | Route stop sequence (FR-06/07) |
| `AvlTree` | Next pickup keyed by pickup time (FR-08) |
| `WeightedGraph` + Dijkstra | Pickup path (FR-09) |
| `Stack` | Check-in undo (FR-11) |
| `DoublyLinkedList` | Walk timeline, forward/backward (FR-12) |
| `CircularList` | Recurring route rotation (FR-13) |
| `Queue` | GPS point buffer before persisting (FR-14) |

Later (final delivery): Union-Find pack grouping, Quadtree nearest dog, Interval Tree time conflicts, Trie autocomplete, live GPS, voice incident dictation, daily reports, stats dashboard.

## Architecture

Four layers, each in its own stack; the frontend only talks to the backend (diagrams: `docs/ARCHITECTURE.md`).

```
User -> Frontend (React 19 + Vite PWA, TypeScript, Vercel)
     -> Backend  (FastAPI, Python, Render)  -> Database (Supabase Postgres + pgvector + Auth)
                                            -> AI (CLIP ONNX in-process, Ollama Cloud vision)
```

## Repo layout

```
apps/api-py/            FastAPI API (Supabase Postgres + Auth, pydantic validation)
apps/api-py/schema.sql  Postgres schema the API assumes exists
apps/web/               React 19 + Vite PWA (walker app + owner app)
tests/py/               API, AI and per-structure unit tests (pytest)
tests/web/              web unit tests (vitest)
docs/                   REQUIREMENTS.md (FR/NFR), ARCHITECTURE.md (diagrams), TASKS.md (task queue)
tools/                  Dev/loop helpers
```

## Hand-written data structures

`apps/api-py/src/cantrack_api/structures` uses only the Python standard library for typing — every structure below is implemented from scratch, each with Big-O docstrings and its own unit tests.

| Structure | Used for |
|---|---|
| `SinglyLinkedList` | Route stop sequence (FR-06/07) |
| `AvlTree` | Next pickup keyed by pickup time (FR-08) |
| `WeightedGraph` + Dijkstra | Pickup path (FR-09) |
| `Stack` | Check-in undo (FR-11) |
| `DoublyLinkedList` | Walk timeline, forward/backward (FR-12) |
| `CircularList` | Recurring route rotation (FR-13) |
| `Queue` | GPS point buffer before persisting (FR-14) |

Later (final delivery): Union-Find pack grouping, Quadtree nearest dog, Interval Tree time conflicts, Trie autocomplete, live GPS, voice incident dictation, daily reports, stats dashboard.

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

Requires Python >= 3.12 with [uv](https://docs.astral.sh/uv/), and Node >= 20 with pnpm.

```bash
cd apps/api-py && uv sync && uv run pytest -q      # backend suite
pnpm install && pnpm test                          # web suite (vitest) from the repo root
```

Run the apps (two terminals):

```bash
cd apps/api-py && uv run python -m cantrack_api.main     # http://localhost:3000
cd apps/web && pnpm dev
```

Create the Supabase tables first with `apps/api-py/schema.sql`. The first photo request downloads the
CLIP model (~89 MB) to `~/.cache/cantrack/` (or `CLIP_MODEL_PATH`).

## Environment

`apps/api-py/.env` (see `.env.example`):

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
WEB_ORIGIN=http://localhost:5173
OLLAMA_API_KEY=
OLLAMA_HOST=https://ollama.com
OLLAMA_VISION_MODEL=gemma4:31b
```

`apps/web/.env`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_URL=http://localhost:3000
```

Secrets live only in env vars — never commit them. The web app uses the publishable key only; the service-role key and the Ollama key belong to the API. The browser never calls the database or an AI model directly.

## API sketch

- `POST /auth/signup | POST /auth/login | POST /auth/reset-password`
- `GET/POST /dogs`, `PATCH/DELETE /dogs/{id}`, `POST /dogs/{id}/photos` (multipart, 1-5 images, stores the mean embedding)
- `GET/POST /routes`, `GET /routes/{id}`, `PATCH /routes/{id}/stops/reorder`, `DELETE /routes/{id}/stops/{index}`
- `GET /routes/next-pickup`, `POST /routes/path`
- `POST /routes/{id}/checkin` (multipart photo), `POST /routes/{id}/checkin/confirm`, `DELETE /routes/{id}/checkin/undo`

Invalid bodies return 400; rows belonging to another user return 404 (never 403, to avoid leaking existence). Unreachable path targets return 400. Interactive docs at `/docs`.

## Deploy targets

Vercel (web), Render (API), Supabase (DB + auth + pgvector), Ollama Cloud (vision).
