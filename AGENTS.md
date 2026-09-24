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

## Read first

`docs/REQUIREMENTS.md` for what the product must do, `docs/TASKS.md` for the current task queue and
which task you're on.
