# Brief for Qwen — S2 PR 1 (tests only): walker panel and pickup plan

Branch `s2-tests`, tests only (see AGENTS.md). Read first: `docs/superpowers/specs/2026-09-30-cantrack-marketplace-design.md` (section S2),
`docs/design/POLISH-BACKLOG.md` (item 3), `AGENTS.md`, and the merged S1 code so the new tests use the same helpers and style.

## What S2 builds

1. **My clients** (`Clients` tab, walker): the dogs with an **accepted** request addressed to the caller, each with the pin, the time and the
   full questionnaire. Privacy: a request that is `pending`, `declined` or `cancelled` (also cancelled after accept) is NOT a client; a
   cancelled one disappears from the list. Backend: `GET /clients`. You choose the exact JSON, pin it with full-dict assertions.
2. **Pickup plan**: `POST /plans/suggest` with a date (and a UTC offset in minutes, default 0) returns the plan for that LOCAL day, not persisted:
   ordered stops with ETA, leg distance, total distance, flags and groups. Rules (from the spec):
   - an **AVL tree keyed by requested time** gives the next due stop;
   - stops whose requested times are within **15 minutes** of each other are ordered by **nearest neighbour** from the previous stop
     (**haversine** distance, walking speed **5 km/h**); ties break deterministically (earlier requested time, then request id);
   - `reactive` dogs are flagged and never grouped with others; a group has at most **4** dogs; compatible groups are computed with a
     hand-written **UnionFind** (FR-15);
   - only the caller's accepted requests of that day count; another walker's requests never appear.
   Decide and state in the PR body the exact definition of "group" (which stops are merged, how clusters over 4 are split) and pin it.
3. **Accept plan**: the web calls the existing `POST /routes` with the plan's stops (no new endpoint). The plan stays a suggestion: the walker
   can reorder afterwards (existing endpoints).
4. **Screens**: `Clients` tab, a plan screen on the `Today` tab ("Suggest order" -> list with ETA/distance/flags -> "Accept plan"),
   and **polish item 3**: the route list title shows the first dog and the time instead of the route UUID, times are formatted with
   `Intl.DateTimeFormat` (no raw ISO strings anywhere in the walker screens). This changes the existing app-shell/walker tests that look for
   the route id text: update them in THIS tests-only PR and flag each edit in the PR body (spec evolution, assertions otherwise intact).

## New hand-written pieces that need unit tests

- `UnionFind` (`structures/union_find.py`): union by size/rank, path compression **iterative** (no recursion proportional to n).
  Tests: exact behaviour, randomized equivalence against a brute-force connected-components computation, and a scale test (100 000 unions
  in a chain must not raise `RecursionError`).
- `haversine` (`cantrack_api/geo.py`): known distances with tolerance (e.g. one degree of latitude ~ 111.19 km, Medellin-Bogota ~ 240 km),
  symmetry, zero distance, antimeridian and poles do not crash.

## Lessons from S1 you must apply (these are the things the reviews found)

1. **Every test must be satisfiable together.** In S1, three tests contradicted a rule pinned in another test and one used an undefined
   fixture (`fake`), so they could never pass. Before opening the PR run `uv run --with ruff ruff check --select F tests/py` (undefined names)
   and `pytest --collect-only`, and re-read your tests for contradictions with each other and with the S1 tests.
2. **Model the real database in the fake.** Postgres/PostgREST returns every `timestamptz` normalized to UTC (`2026-10-05T10:00:00+00:00`)
   even if you sent `-05:00`. Update `tests/py/api/fake_supabase.py` so inserts/updates of the timestamp columns (`requested_time`, `responded_at`,
   `created_at`) are normalized the same way, and add tests with a non-UTC offset (the plan's "local day" depends on it). If an S1 test asserted
   a verbatim echo of a non-UTC input, fix that test here and flag it.
3. **Privacy follows the status, always.** Test the client list and the plan after every status change (accept -> cancel, decline, pending).
4. **Scale and randomized equivalence for every structure** (no hand-picked-only tests).
5. Exact values, 401/400/404/500 per endpoint, isolation between two walkers, loading/empty/error per screen, double-submit protection,
   all as in the AGENTS.md checklist.
6. A new table or column goes to `apps/api-py/schema.sql` (idempotent: `if not exists`, RLS **enabled**, no policies) in PR 2, and PR 2's body
   must say so, because Nico runs the SQL by hand in Supabase.

## Done when

Red summary pasted in the PR body (pytest + vitest), checklist ticked honestly, every contract decision stated in "What and why".
I review, you fix, I merge, then PR 2 (`s2-impl`).
