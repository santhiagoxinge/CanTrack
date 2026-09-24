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
| T10 | Enroll photos + check-in match/undo endpoints | FR-05, FR-10, FR-11 | `tests/api/checkin.test.ts` | [ ] |
| T11 | Web: auth screens (signup/login/reset) | FR-01–03 | `tests/web/auth.test.tsx` | [ ] |
| T12 | Web: owner dogs list + photo enrollment (CLIP via transformers.js) | FR-04, FR-05 | `tests/web/owner-dogs.test.tsx` | [ ] |
| T13 | Web: walker route view + check-in camera flow | FR-06, FR-07, FR-10, FR-11 | `tests/web/walker-route.test.tsx` | [ ] |
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
