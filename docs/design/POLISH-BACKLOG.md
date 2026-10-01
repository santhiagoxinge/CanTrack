# UI polish backlog (found in the S0 review, 2026-10-01)

These are implementation details, not test changes: they go in the **implementation PR (PR 2) of S1**, not in
its tests-only PR 1. Verify each one in the browser at 390 px before opening the PR (screenshots in the PR body).

1. **File input looks native.** The `<input type="file" class="form-file">` in `OwnerDogsScreen.tsx` (enrollment) and
   `WalkerRouteScreen.tsx` (check-in photo) shows the grey browser button "Choose Files". `app-shell.css` styles
   `.form-file` but has no `::file-selector-button` rule any more. Add one in the kit stylesheet: pill radius
   (`--radius-button`), `--c-green` background with `--c-ink` text, `min-height: var(--tap-target)`, same focus ring as buttons.
2. **Oversized `PetTile` in the enrollment panel.** `OwnerDogsScreen.tsx:249` renders `<PetTile>` as the panel header, so a
   ~200 px square tile sits left-aligned with empty space beside it. Make it a compact header (about 96 px tile, name beside
   it) via a size modifier on the component (`size="compact"`) or by not using `PetTile` there; the S0 tests must stay green.
3. **Raw values in lists (do this in S2, not S1).** The route list shows the route UUID as its title and the route detail shows
   ISO timestamps (`2026-09-25T09:00:00.000Z`). Show a friendly title (first dog + time) and format times with
   `Intl.DateTimeFormat` in the user's locale.

Rules: do not edit existing tests; new behavior needs tests in the slice's PR 1, visual-only CSS does not.
