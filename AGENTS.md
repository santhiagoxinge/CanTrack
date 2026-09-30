# Rules for the builder model

You are the **builder**. Nico and the human team write `docs/`, `tests/`, `tools/`, and this file.
You write `apps/*/src/**` only (`apps/api-py/src/cantrack_api/**` and `apps/web/src/**`). Anything you touch outside those paths is
reverted before the next run — don't fight it, just don't do it.

## Hard rules

1. **English only.** Identifiers, comments, docstrings, commit-worthy strings, error messages. No
   Spanish anywhere in code.
2. **`apps/api-py/src/cantrack_api/structures` imports no data-structure library.** No `deque`,
   `heapq`, `bisect`, `sortedcontainers`, `networkx` or any package that implements a list, stack,
   queue, tree or graph. Hand-write every one (only `typing`/`dataclasses` are allowed). This is the point of the
   assignment — a code review grades this package specifically.
3. Every exported structure gets a docstring stating its Big-O for each operation you implement
   (insert, remove, search, etc.).
4. Don't invent scope. Build exactly what the current task's test file asks for — read the test
   first, then implement the minimum that makes it pass. Don't add endpoints, fields, or files the
   test doesn't need.
5. If a task depends on earlier code (e.g. the routers import `cantrack_api.structures`), import it,
   don't reimplement it.
6. Don't touch `docs/`, `tests/`, `tools/`, or lockfiles. If a test looks wrong or contradicts the
   requirements doc, say so in your output — don't silently work around it by weakening the test.
7. No stub/`NotImplementedError`/`TODO` placeholders to satisfy an import while claiming a task is
   done. If you can't finish a task, say what's missing.

## Stack (decided 2026-09-30: backend Python, frontend TypeScript)

- `apps/api-py`: Python 3.12, FastAPI, pydantic v2 for input, supabase-py for Postgres + Auth,
  onnxruntime (CLIP image embeddings) and httpx (Ollama Cloud vision). Tests: pytest, `tests/py/`.
- `apps/web`: React 19 + Vite, PWA, TypeScript. Tests: vitest, `tests/web/`.
- Data structures live in `apps/api-py/src/cantrack_api/structures/`, plain Python.
- Layers: web -> API -> (Supabase DB, AI). The browser never calls the database or an AI model
  (`tests/web/architecture.test.ts` enforces it). See `docs/ARCHITECTURE.md`.

## `apps/web` conventions (T11+)

- **T11-T13 (existing screens) were built plain/functional on purpose — don't restyle them as a
  side effect of other work.** Visual direction below applies to the app shell (T11.5+) and any
  later dedicated polish task.

### Visual direction (from T11.5 onward, revised 2026-09-24 after seeing the v1 pass)

**Primary reference: "NotePet – Pet Tracking UI" by Daniel Tan (Dribbble, shot 13920594).** This
supersedes the earlier flat-green-everywhere brief — the v1 pass (solid green background, white
card, plain form controls) read as generic/dashboard-y, not pet-app-specific. Match NotePet's
*language*, not its literal pet-monitoring content:
- **Per-context hero color, not one flat green everywhere.** NotePet uses a big colored card per
  pet (mint for one, coral for another) with a large flat illustration and the name in oversized
  type. In CanTrack: give each dog's card/detail view a hero color pulled from a small warm/pastel
  palette (mint, coral/peach, soft yellow, sky blue) — rotate or hash-pick per dog — instead of
  making every screen the same saturated green. Keep the green as ONE option in that palette and
  as the brand accent (buttons, active states), not as the only background.
- **Pill-shaped filter/segment tabs**: solid coral/accent-colored pill for the active option, plain
  text for inactive ones, all in a single rounded track — this is the pattern for the existing
  auth screen's Sign up/Log in/Reset switcher and any future filter row (dog list, route stops).
- **List rows with a small circular icon chip on the left** (colored pastel circle, simple line
  icon inside — e.g. a paw, a clock, a water drop), the label and a muted subtext line stacked
  next to it, and often a trailing chevron. Use this for dog list items, route stop rows, and the
  walk timeline instead of plain text rows.
- **A row of circular colored icon buttons** for a small fixed set of quick actions/categories
  (NotePet's "treats / shower / vaccine / meds" row) — same visual for anything CanTrack has a
  short fixed list of (e.g. quick check-in states, dog attributes).
- **Secondary reference for illustration tone: a "Pet Playlists" landing graphic** (flat,
  friendly, slightly hand-drawn dog/cat/bird characters with big simple eyes, on a muted dusty-blue
  background). Borrow the *warmth and personality* of that illustration style, not its layout —
  where CanTrack shows a dog (dog list, dog detail, empty states), prefer a simple flat character
  illustration or icon over a literal photo placeholder, in the same friendly/cartoonish register.
- Soft pastel palette overall, generous corner radius (16-24px+), soft drop shadows, no hard
  borders — keep this from the v1 direction.
- Bottom tab/icon navigation for the primary app sections (dashboard, dogs/routes, profile) rather
  than a top nav bar — this is a mobile-first PWA. Keep this from v1.
- Look at component.gallery, mobbin.com, and freefrontend.com for concrete component patterns
  (pill tabs, icon-chip list rows, circular icon buttons) if a specific piece needs a reference;
  browse the open web for more if those don't have what's needed.
- **Clean and functional first — no animation/motion work yet** beyond ordinary CSS transitions
  (hover/press states, a fade/slide on screen change). Nothing requiring an animation library.
- Export the real Supabase client from `apps/web/src/lib/supabase.ts` as `export const supabase`,
  built from `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
  (never the service-role key — that belongs only to `apps/api`). Tests mock this exact module
  path, so screens must import `{ supabase }` from it, not construct their own client inline.
- Every form input needs a real `<label>` associated to it (via `htmlFor`/`id` or wrapping) — tests
  select fields with `getByLabelText`, not by placeholder or CSS.
- Auth screens go in `apps/web/src/auth/AuthScreens.tsx`, exporting `SignupScreen`, `LoginScreen`,
  `ResetPasswordScreen`. Signup needs a role choice between "walker" and "owner" (radio or two
  labeled options, each reachable by `getByLabelText`). Show the Supabase `error.message` inline on
  failure; don't let it throw uncaught. Reset-password shows a "check your email" confirmation on
  success.
- `apps/web/src/lib/api.ts`: a thin fetch wrapper around the FastAPI API (base URL from
  `import.meta.env.VITE_API_URL`, attach the Supabase session's bearer token). Export named
  functions per endpoint — `fetchDogs()`, `createDog(dto)`, `enrollPhotos(dogId, files)`, `checkIn(routeId, file)`,
  etc. — not a generic client object; tests mock this module by function name.
- There is no image-model module in `apps/web`: photos are uploaded as-is (multipart field `image`)
  and the API embeds them. Nothing in the browser loads an ML model.
- `apps/web/src/owner/OwnerDogsScreen.tsx` exports `OwnerDogsScreen`: lists the owner's dogs
  (`fetchDogs`), a form to add one (`createDog`, requires a name), and per-dog photo enrollment
  requiring **exactly 3** photos (a labeled multi-file input, `getByLabelText(/reference photos/i)`)
  — upload the 3 files untouched via `enrollPhotos(dogId, files)` (the API averages them). Fewer than 3 photos is a validation error, not
  a partial submit.
- `apps/web/src/walker/WalkerRouteScreen.tsx` exports `WalkerRouteScreen({ routeId })`: fetches one
  route (`fetchRoute(routeId)`, add this function to `apps/web/src/lib/api.ts` alongside the
  existing `fetchDogs`/`createDog`/`enrollPhotos` — extend that file, don't replace it) and
  renders its stops in order, each with `data-testid="route-stop"` and a "Check in" button. Check-in
  is a single labeled photo input (`getByLabelText(/check-in photo/i)`, one file) → `checkIn(routeId, file)`
  (also add to `api.ts`). On `{autoConfirmed: true}` show a "checked
  in" confirmation; on `{autoConfirmed: false, candidates}` show a "which dog?" picker over the
  candidates. An "Undo" button calls `undoCheckIn(routeId)` (also add to `api.ts`); show its
  rejection message inline on failure, don't let it throw uncaught.
- **App shell (`apps/web/src/App.tsx`, `apps/web/index.html`, real `apps/web/src/main.tsx`):**
  `GET /routes` already exists (returns the caller's routes with
  `id`/`stops`) — add `fetchRoutes()` to `api.ts` to call it. `App` subscribes to
  `supabase.auth.getSession()`/`onAuthStateChange`: no session → render the auth screens (a simple
  toggle between `SignupScreen`/`LoginScreen`/`ResetPasswordScreen`, no routing library needed for
  this); a session whose `user.user_metadata.role` is `"owner"` → render `OwnerDogsScreen`; role
  `"walker"` → render a route list (each route as a card showing its id and stop count/first dog
  name) that, on click, renders `WalkerRouteScreen` for that route's id and a way back to the list.
  Apply the visual direction above to this shell and to the list/card markup it owns; the existing
  T11-T13 screens' own internals stay as they are unless a later task explicitly restyles them.

## `apps/api-py` conventions the tests rely on

- Supabase and the two AI collaborators reach the routers only through FastAPI dependencies in
  `cantrack_api/deps.py`: `get_supabase`, `get_embedder`, `get_vision`. Tests replace them with fakes
  via `app.dependency_overrides`; never import a client or build one inside a handler.
- `create_app()` in `cantrack_api/app.py` builds the app and must not read `SUPABASE_*` at import time.
- Every validation failure is HTTP 400 (not FastAPI's 422); Supabase auth errors surface as 4xx.
- Every endpoint that touches one user's rows scopes every Supabase query by that user's id
  (`user.id` from `get_current_user`) and returns 404 — not 403 — for someone else's row.
- Routes use the structures on purpose: stops are a `SinglyLinkedList`, next pickup an `AvlTree`
  keyed by ISO pickup time, path a `WeightedGraph`, check-in undo pops a `Stack`.
- The photo is embedded (CLIP, ONNX) and checked by a vision model (Ollama) on the server. The
  vision model's output is untrusted (fenced JSON, wrong key names happen); if it is unavailable
  the check-in still works. Auto-confirm threshold is cosine similarity 0.8.
- Query style: `supabase.table("x").select(...).eq(...).execute()`; database errors are 500 via
  `db.run_query`.

## Read first

`docs/REQUIREMENTS.md` for what the product must do, `docs/TASKS.md` for the current task queue and
which task you're on.
