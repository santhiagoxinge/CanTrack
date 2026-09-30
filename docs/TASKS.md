# CanTrack — Task queue (Oct 5 slice)

Read `docs/REQUIREMENTS.md` first. One task at a time, in order — a task's tests may import
what an earlier task built. `tools/loop.py` runs this list; each row's test file is written
*before* the task runs and must fail red first (proves it tests something).

Check a box only when: its test file passes AND the full suite (`pnpm test`) passes AND the
change is committed. Never check a box by hand — the runner does it.

| # | Task | FR | Test file | Done |
|---|---|---|---|---|
| T1 | Stack + Queue (`packages/structures`) | FR-11, FR-14 | `tests/structures/stack-queue.test.ts` | [x] |
| T2 | Singly linked list | FR-06, FR-07 | `tests/structures/singly-list.test.ts` | [x] |
| T3 | Doubly linked list | FR-12 | `tests/structures/doubly-list.test.ts` | [x] |
| T4 | Circular list | FR-13 | `tests/structures/circular-list.test.ts` | [x] |
| T5 | AVL tree (keyed by pickup time) | FR-08 | `tests/structures/avl-tree.test.ts` | [x] |
| T6 | Weighted graph + Dijkstra | FR-09 | `tests/structures/graph-dijkstra.test.ts` | [x] |
| T7 | API bootstrap: NestJS app, Supabase Auth guard, signup/login/reset endpoints | FR-01–03 | `tests/api/auth.test.ts` | [x] |
| T8 | Dogs CRUD endpoints | FR-04 | `tests/api/dogs.test.ts` | [x] |
| T9 | Routes endpoints (create/reorder/remove stop, next-pickup via AVL, path via Dijkstra) | FR-06–09 | `tests/api/routes.test.ts` | [x] |
| T10 | Enroll photos + check-in match/undo endpoints | FR-05, FR-10, FR-11 | `tests/api/checkin.test.ts` | [x] |
| T11 | Web: auth screens (signup/login/reset) | FR-01–03 | `tests/web/auth.test.tsx` | [x] |
| T12 | Web: owner dogs list + photo enrollment (CLIP via transformers.js) | FR-04, FR-05 | `tests/web/owner-dogs.test.tsx` | [x] |
| T13 | Web: walker route view + check-in camera flow | FR-06, FR-07, FR-10, FR-11 | `tests/web/walker-route.test.tsx` | [x] |
| T11.5 | Web: app shell (index.html, main.tsx, App.tsx routing by session/role) + vivid-green visual direction | FR-06 | `tests/web/app-shell.test.tsx` | [x] |
| T14 | Deploy: Render (api) + Vercel (web), wired to Supabase | — | manual, no test file | [ ] |

## Notes for whoever resumes this queue

- Builder model is `opencode/space-bunny-free` (switched 2026-09-24, free/unlimited only
  through ~30 Sep 2026). If it's gone or rate-limited, swap `MODEL` in `tools/loop.py` back
  to a Muse Spark id before relaunching.
- Backend before frontend, per team decision (2026-09-24): T1–T10 first, T11–T13 after.
- T12/T13 depend on transformers.js running CLIP client-side — if that proves too heavy for the
  free Vercel function or the browser, fall back to the API doing the embedding (extend T10)
  and flag it here before changing test files.
- `[Later]` FRs (Union-Find, Quadtree, Interval Tree, Trie, voice-to-events, reports, dashboard,
  live GPS to owner) are not in this queue — they get their own TASKS entries after Oct 5.

## Python backend port (decided 2026-09-30 after the 09-28 class: backend Python, frontend TypeScript)

The NestJS API (T7-T10) and `packages/structures` (T1-T6) were rewritten in Python under `apps/api-py`.
Tests are pytest (`tests/py/`), written before each task and red first; the builder wrote only `src/`.

| # | Task | Test files | Done |
|---|---|---|---|
| P1 | The 7 structures in Python | `tests/py/structures/*` | [x] |
| P2 | FastAPI app, Supabase auth endpoints, bearer guard | `tests/py/api/test_auth.py`, `test_app.py` | [x] |
| P3 | Dogs CRUD | `tests/py/api/test_dogs.py` | [x] |
| P4 | Routes: stops (linked list), next pickup (AVL), path (graph) | `tests/py/api/test_routes.py` | [x] |
| P5a | AI layer: CLIP ONNX embedder, Ollama vision check | `tests/py/ai/*` | [x] |
| P5b | Photo endpoints: enroll, check-in, confirm, undo (stack) | `tests/py/api/test_checkin.py` | [x] |
| P5c | Multi-photo enrollment (mean embedding) | `tests/py/api/test_checkin.py` | [x] |
| P6 | Web: upload photos to the API, no AI in the browser | `tests/web/*` | [ ] |
| T14 | Deploy: Render (api-py) + Vercel (web), wired to Supabase | manual | [ ] |

Verified end to end against the real Supabase, the real CLIP model and Ollama Cloud (`gemma4:31b`):
enroll 1.1 s, check-in 2.6 s, photo without a dog rejected.
