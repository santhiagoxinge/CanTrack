# Rules for the builder model (Muse Spark)

You are the **builder**. Nico and the human team write `docs/`, `tests/`, `tools/`, and this file.
You write `packages/*/src/**` and `apps/*/src/**` only. Anything you touch outside those paths is
reverted before the next run — don't fight it, just don't do it.

## Hard rules

1. **English only.** Identifiers, comments, docstrings, commit-worthy strings, error messages. No
   Spanish anywhere in code.
2. **`packages/structures` has zero dependencies.** No npm package that implements a list, stack,
   queue, tree, graph, or any data structure. Hand-write every one. This is the point of the
   assignment — a code review grades this package specifically.
3. Every exported structure gets a docstring stating its Big-O for each operation you implement
   (insert, remove, search, etc.).
4. Don't invent scope. Build exactly what the current task's test file asks for — read the test
   first, then implement the minimum that makes it pass. Don't add endpoints, fields, or files the
   test doesn't need.
5. If a task depends on an earlier package (e.g. the API imports `packages/structures`), import it,
   don't reimplement it.
6. Don't touch `docs/`, `tests/`, `tools/`, or lockfiles. If a test looks wrong or contradicts the
   requirements doc, say so in your output — don't silently work around it by weakening the test.
7. No stub/`NotImplementedError`/`TODO` placeholders to satisfy an import while claiming a task is
   done. If you can't finish a task, say what's missing.

## Stack

- `apps/api`: NestJS (TypeScript), Supabase client for Postgres + Auth, class-validator for input.
- `apps/web`: React 19 + Vite, PWA.
- `packages/structures`: plain TypeScript, no runtime deps.

## `apps/web` conventions (T11+)

- **Clean and functional first — no animation/motion work yet.** Plain forms, plain layout,
  accessible labels. A polish/animation pass is a later, separate task; don't add it preemptively.
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

## `apps/api` conventions the tests rely on

- Export a `SUPABASE_CLIENT` DI token from `apps/api/src/supabase/supabase.constants.ts` and
  provide the real `@supabase/supabase-js` client under that token in `AppModule`. Tests
  override this provider with a mock — if you inline `createClient(...)` calls instead of
  going through the token, tests can't substitute a fake and will hit a real network call.
- Export `AppModule` from `apps/api/src/app.module.ts`.
- Validate request bodies with `class-validator` DTOs; invalid input returns HTTP 400.
- Supabase auth errors (e.g. duplicate signup, wrong password) surface as 4xx, not 500 — read
  `error` on the Supabase response and translate it, don't let it throw uncaught.
- Any endpoint that reads/writes a specific user's row (dogs, routes, etc.) must scope every
  Supabase query by that user's id (`request.user.id` from `SupabaseAuthGuard`), and must return
  404 — not 403 — when the row belongs to someone else. Don't leak whether a resource exists to a
  non-owner.
- `POST /routes/path` (FR-09) builds a `WeightedGraph` from the request body's `edges` array
  in-memory per request — it does not persist a street graph in Supabase. An unreachable target
  (`WeightedGraph.shortestPath` throwing) must surface as HTTP 400, not 500.
- `GET /routes/next-pickup` (FR-08) builds an `AvlTree<string, {routeId, dogId, pickupTime}>` from
  the walker's routes' stops, keyed by ISO pickup-time string, and returns `.min()`. No routes (or
  no stops) is a 404, not an empty 200.
- CLIP embedding happens client-side (T12); the API only ever receives/compares numeric vectors.
  `POST /dogs/:id/embedding` (FR-05) stores an embedding on a dog the caller owns (404 otherwise).
  `POST /routes/:id/checkin` (FR-10) computes cosine similarity between the request's `embedding`
  and every dog on that route (404 if the route isn't the caller's); above a similarity threshold,
  respond `{dogId, autoConfirmed: true}` with 201; below it, respond `{autoConfirmed: false,
  candidates: [{dogId, similarity}, ...]}` with 200 so the walker can pick manually — don't throw.
  Persist the confirmed check-in either way. `DELETE /routes/:id/checkin/undo` (FR-11) pops the
  most recent check-in on that route (a `Stack` popping the latest by timestamp is the natural
  fit) and deletes it; 404 if there is none.

## Read first

`docs/REQUIREMENTS.md` for what the product must do, `docs/TASKS.md` for the current task queue and
which task you're on.
