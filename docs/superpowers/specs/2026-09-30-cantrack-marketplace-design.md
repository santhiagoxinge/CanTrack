# CanTrack marketplace — design (approved 2026-09-30)

Goal: turn CanTrack from "walker runs a route" into a small Uber/Rappi-style marketplace for dog walking.
Delivery: 19 Nov 2026. Terms: **walker** (paseador, role `walker`) and **owner** (dueño del perro, role `owner`).
Built slice by slice (S0 → S5); each slice ships backend and screens together.

## Decisions taken

| Topic | Decision |
|---|---|
| Scope | Everything, including the live map (option B) |
| GPS | The walker's phone (PWA `watchPosition` + Wake Lock). No Bluetooth/collar hardware. |
| Checkout | Photos only (1 to 3), AI observation, walker approves, then it is sent to the owner. No text/audio. |
| Monetization | A business-model slide (commission 10 to 15 % per walk, Uber/Rappi style). No payment code. Store `price_cop` per request. |
| AI cost guard | 60 AI reviews per walker per month, then HTTP 429 (walkers can still send photos). |
| Notifications | The web polls the API (10 s for inbox, 5 s for the map). No direct Supabase Realtime from the browser. |
| Who writes tests | **Qwen writes the tests AND the code; Claude reviews.** See AGENTS.md (two PRs per slice). |
| Visual design | `docs/design/DESIGN.md`, palette anchored on `#ADEBB3` and `#45C55D`. |

## S0 — UI kit

Tokens + 13 components in `apps/web/src/ui/` per `docs/design/DESIGN.md`, restyle the existing screens with them,
bottom navigation per role. No new endpoints.

## S1 — Requests

New tables:
```
walker_profiles  walker_id PK -> users, display_name, bio, service_area, price_per_walk (COP)
dogs             + profile jsonb   (questionnaire, validated by pydantic)
walk_requests    id, owner_id, walker_id, dog_id, status, requested_time,
                 pickup_lat, pickup_lng, price_cop, created_at, responded_at
```
Questionnaire (8 fields): size, temperament (friendly | shy | reactive), energy, leash trained, allergies,
medical notes, vet contact, emergency contact.
Status: `pending -> accepted | declined`; the owner may `cancel` while pending or accepted.
Flow: the owner picks walker + dog + time and drops a pin on the map (coordinates stored, no geocoding service);
the walker's inbox lists pending requests oldest first (hand-written `Queue`); accept or decline.
Privacy: while pending the walker sees name, breed, size and temperament only; address, allergies and contacts
only after accept. Each user sees only their own rows (404 for others).
Extra: interval conflicts on accept are flagged with an `IntervalTree` (FR-17).

## S2 — Walker panel and pickup order

"My clients" = dogs with an accepted request (pin, time, full questionnaire).
`POST /plans/suggest {date}` returns ordered stops with ETA and total distance (not persisted):
AVL keyed by requested time gives the next due stop; stops within 15 minutes of each other are ordered by nearest
neighbour (haversine); walking speed 5 km/h. No Dijkstra here on purpose (no street network); it stays in
`POST /routes/path` and returns with OSRM later. "Accept plan" creates a route through the existing endpoint.
`reactive` dogs are never grouped; max 4 dogs per group; compatible groups use `UnionFind` (FR-15).
The plan is a suggestion; the walker can always reorder.

## S3 — Checkout

Two steps with a human gate: upload 1 to 3 photos to a private Supabase Storage bucket -> the vision model writes
a short *observation* (draft, 200 chars max, plain text, never interpreted) -> the walker edits and presses Send ->
only then the owner sees it. If AI is unavailable or over quota, the walker can send the photos alone.
Table `checkouts(route_id, dog_id, request_id, photo_paths, ai_note, status draft|sent, sent_at)`.
Owner views photos through signed URLs (1 h). Photos are deleted after 30 days.
The owner timeline per dog is a `DoublyLinkedList` (walks and checkouts, forward and backward).

## S4 — Owner side

Discover walkers (profile cards, rating, price, area), search by name with a `Trie`, "walkers near my pin" with a
`Quadtree`, send a request, track its status, cancel, see timeline and checkouts, rate the walker.
Reviews: table `reviews(request_id unique, owner_id, walker_id, rating 1-5, comment <= 300)`. Only the owner of a
completed request (checkout sent) may review, once; walkers cannot edit or delete. Walker ranking uses an `AVL`
keyed by average rating.

## S5 — Live map

Walk states: `on_the_way -> picked_up -> walking -> dropped_off`.
The walker's phone posts its position every 5 s; the API buffers it in the hand-written `Queue` (FR-14) and writes
batches to `positions`. The owner's Leaflet + OpenStreetMap map polls every 5 s once the dog is picked up, until
drop-off. Within 50 m of the drop-off pin the app suggests the checkout. Only the owner of a dog in that walk can read it;
positions are deleted after 24 h.

## Architecture rules that stay

Browser talks only to the API (`tests/web/architecture.test.ts`). Secrets only in the API env. Every endpoint
scopes by the caller's id and answers 404 for foreign rows. Model output is untrusted. Hand-written structures
only (no stdlib containers).

## Risks

| Risk | Mitigation |
|---|---|
| PWA GPS stops with the screen off | Wake Lock + "keep the app open" notice; documented limitation |
| Sensitive data (address, allergies) | Reveal only after accept; minimal storage; Ley 1581 de 2012 notice and consent |
| AI false reassurance | Observation, not diagnosis; human approval before sending |
| AI cost | Monthly quota per walker |
| Tests written by the same model as the code | Tests-first PR reviewed by Claude before any implementation PR |
| Scope | One slice per PR pair; S5 is the first thing to cut if time runs out |

## Not in scope

Real payments, push notifications, audio, chat, dark mode, desktop layouts.
