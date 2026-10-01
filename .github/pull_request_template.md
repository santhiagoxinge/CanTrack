## Slice and PR type
<!-- e.g. S1 Requests — tests-only (PR 1) / implementation (PR 2) -->

## What and why
<!-- 3 lines max -->

## Files
<!-- paths touched; must be inside the allowed paths in AGENTS.md -->

## How I verified
```
<!-- PR 1: red output (last lines of pytest / vitest). PR 2: green output + `git diff --stat` -->
```

## Test checklist (PR 1) — tick each
- [ ] exact-value assertions · [ ] 401/400/404/500 per endpoint · [ ] isolation between two users
- [ ] privacy gates · [ ] state machine legal + illegal · [ ] structures asserted by behaviour
- [ ] AI faked, failure does not block · [ ] UI: labels/roles, exact api.ts args, loading/empty/error
- [ ] no weakened or edited existing tests

## Risks and what is NOT done
