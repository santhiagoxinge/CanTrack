# Brief for Qwen — S3 PR 1 (tests only): checkout with photos to the owner

Branch `s3-tests`, tests only (AGENTS.md). Read first: the spec section S3 in
`docs/superpowers/specs/2026-09-30-cantrack-marketplace-design.md`, `docs/superpowers/briefs/s2-tests.md` (lessons list), and the merged
S1/S2 code. This is the most sensitive slice (private photos, AI, quota, retention): think like an attacker and like a flaky network.

## What S3 builds

A walker finishes a walk for an **accepted** request and sends the owner 1 to 3 photos with a short note.
1. **Draft** (`POST /requests/{id}/checkout`, multipart `image` x 1..3): validates and stores the photos in a **private** Supabase Storage bucket
   `checkout-photos`, asks the vision model for an observation (the existing `get_vision` dependency, `PhotoCheck`), creates a `draft` row in the new
   table `checkouts`, returns the draft (photos as signed URLs, `aiNote`, `aiStatus`).
2. **Edit** the note (walker only, drafts only, max 200 characters, plain text) and **Send** (`draft -> sent`, `sent_at` from `get_now`). Only then
   does the owner see anything. A sent checkout is immutable; a second send is a 400, never a second notification.
3. **Owner side**: list of the owner's sent checkouts (newest first, `limit` default 50 max 100) with signed URLs that expire in **exactly 3600 s**;
   per-dog **timeline** (`GET /dogs/{id}/timeline`, `order=asc|desc`) built with the hand-written `DoublyLinkedList` (`to_array` / `to_array_reverse`),
   mixing the dog's accepted walks and sent checkouts in time order. Owner screen = the `Activity` tab (it is "Coming soon" today).
4. **AI quota**: 60 AI calls per walker per UTC calendar month (`get_now`). Creating a draft NEVER fails because of AI: at quota or when the model is
   unavailable the draft is created with `aiNote: null` and `aiStatus: "quota"` / `"unavailable"` (else `"ok"`). A separate
   `POST /checkouts/{id}/ai-note` re-runs the AI on a draft and answers **429** `{"detail": "Monthly AI limit reached."}` at the limit; `GET /ai-quota`
   returns `{used, limit, resetsAt}`. Count every AI call (draft or re-run), also the unavailable ones? **Decide, say why, pin it.**
5. **Retention**: sent checkouts older than 30 days lose their photos (storage objects removed, `photo_paths` emptied, the row and note stay). The purge
   runs lazily when the owner or the walker lists checkouts (there is no cron on the free tier). Pin it with the fake clock.
6. **Polling UX** (web): the owner's Activity list refreshes every 10 s and shows a Toast `New checkout from {walkerName}` when a new one arrives.
7. **Request lifecycle consequence**: a request with a sent checkout is COMPLETE. Decide and pin what happens to `cancel`, `accept`, `decline` on it
   (proposal: 400 `"A completed request cannot be cancelled."`). This changes S1 behaviour: update the S1 tests that conflict, flagged in the PR body.

## Contract decisions you must pin (state each in "What and why")

Exact JSON of every endpoint (full-dict assertions), who may call what (walkers vs owners, 400 for the wrong role as in S1/S2), the checkout-per-request rule
(one checkout per request: 409 on a second draft? or replace the draft?), the table columns (`walker_id` is needed for scoping and quota counting), the
object path scheme, the web screens and their exact texts.

## Security and privacy tests that are mandatory

1. The owner NEVER sees a draft: not in the list, not in the timeline, not by id (404). Another owner and another walker: 404 everywhere.
2. Photos are served only as signed URLs with `expires_in == 3600`; the API never returns raw storage paths or public URLs; the bucket is private
   (assert the upload goes to `checkout-photos` and no public-URL call is made).
3. Object path is `{walker_id}/{checkout_id}/{index}.{ext}` built by the server: a client filename like `../../etc/passwd` or `a.png/../../x` is ignored.
4. **Magic bytes, not just the Content-Type header**: JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WEBP `RIFF....WEBP`. A body that claims `image/png`
   but has other bytes -> 400 `"Unreadable image."`, nothing stored. Your fixtures must therefore be real magic headers.
5. Limits: 1..3 photos (0 or 4 -> 400 before any storage/AI work), each <= 5 MiB (413), types jpeg/png/webp only. A failure on photo 2 must roll back photo 1
   (no orphan objects in storage, no row) — assert the fake storage is empty afterwards.
6. Model output is untrusted: `aiNote` is plain text, cut to 200 chars, and `note` edits over 200 chars are a 400. AI failure (`dog_visible None`) must not block.
7. State machine: draft->sent legal; sent->edit, sent->send, sent->ai-note, discarded->anything illegal, each with its exact 400 message and no change.
8. Quota with the fake clock: 60 calls ok, the 61st re-run is 429, the draft creation still 201 with `aiStatus: "quota"`, the counter resets on the 1st of the
   next UTC month (test 23:59:59 vs 00:00:00 across a month boundary), another walker's usage never counts.
9. Retention with the fake clock: day 29 keeps photos, day 30 purges; purge removes storage objects AND empties the paths; one failing removal must not
   leave the row claiming photos that no longer exist (pin the behaviour).
10. Every query on `checkouts` and every storage call is scoped to the caller (the fake records queries and storage calls; assert them).

## Fakes and the real client (lesson of S1)

`tests/py/api/fake_supabase.py` needs a `storage.from_(bucket)` double. **Read the installed library source** (`apps/api-py/.venv/.../storage3`, check
`upload`, `create_signed_url`, `remove` signatures and return shapes) and copy it exactly, including the errors the real client raises
(duplicate path on upload, missing object on signed URL). Do not model it from memory. Timestamps stay normalized to UTC like the real database.

## Web tests

Walker: checkout form (1..3 photos, previews), draft screen with editable note and `Send to owner`, loading/empty/error states, double-submit guard on
every button, the AI states (`ok`, `unavailable`, `quota`) each with its exact text, the 429 message inline. Owner: Activity list, 10 s polling with fake timers
(refresh at 10 000 ms, none after unmount), the Toast on a new item, broken-image fallback (as `Avatar`), timeline forward/backward toggle, no raw ISO strings.
Use `formatWhen`. Update `tests/web/app-shell.test.tsx` mock completeness for every new `api.ts` function (the known flaky-failure cause) and flag the edit.

## Gates before opening the PR

`uv run --with ruff ruff check --select F tests/py`, `pytest --collect-only`, re-read for contradictions between your tests and the S1/S2 ones, compute any
number you pin (S2 had a wrong geo constant), and paste the red summaries. Randomized/scale tests where a structure is involved (`DoublyLinkedList` with
10 000 events: no recursion, exact order both ways).

## For PR 2 (later)

New table and the bucket go to `apps/api-py/schema.sql`, idempotent: `create table if not exists` with RLS **enabled** and no policies, and
`insert into storage.buckets (id, name, public) values ('checkout-photos', 'checkout-photos', false) on conflict (id) do nothing;`. The PR body must say
that Nico runs the SQL by hand and that I run a real end-to-end against Supabase before merging.
