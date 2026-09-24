# CanTrack — Requirements

Estructuras de Datos final project, UCC 2026-2. Neighbourhood dog-walker routing and operations
software. Background and case framing: `../cantrack.md` (one level up, kept as the pitch doc).

Every requirement is tagged `[Oct5]` (must exist for the 5 Oct progress check, ≥20% of the project)
or `[Later]` (final delivery, 19 Nov). `[Oct5]` requirements are what `docs/TASKS.md` builds first.

## Functional requirements

### Accounts
- **FR-01** `[Oct5]` A person can sign up as either a **walker** or an **owner**.
- **FR-02** `[Oct5]` A person can log in with email + password.
- **FR-03** `[Oct5]` A person can request a password reset email and set a new password.

### Dogs
- **FR-04** `[Oct5]` An owner can create, read, update, and delete their own dogs (name, breed,
  notes).
- **FR-05** `[Oct5]` An owner can enroll a dog with 3 reference photos. Each photo is embedded
  (CLIP) and the embedding is stored against the dog.

### Routes
- **FR-06** `[Oct5]` A walker can create a route: an ordered sequence of stops, each stop tied to
  one dog. Backed by a hand-written **singly linked list**.
- **FR-07** `[Oct5]` A walker can reorder or remove a stop from a route before it starts.
- **FR-08** `[Oct5]` Given a walker's active routes, the system returns the next scheduled pickup
  in O(log n), backed by a hand-written **AVL tree** keyed by pickup time.
- **FR-09** `[Oct5]` Given a route's stops and a street graph, the system computes the pickup path
  with a hand-written **weighted graph + Dijkstra**.

### Check-in
- **FR-10** `[Oct5]` At a stop, the walker takes a photo. The photo is embedded (CLIP) in the
  browser and matched by cosine similarity against the dogs on that route. Above a similarity
  threshold, the match auto-confirms; below it, the walker picks manually from that route's dogs.
- **FR-11** `[Oct5]` A walker can undo their most recent check-in, backed by a hand-written
  **stack**.

### Walk
- **FR-12** `[Oct5 structures / Later UI]` A walk's timeline (check-in, incident, check-out
  events) is backed by a hand-written **doubly linked list**, navigable forward and backward.
- **FR-13** `[Oct5 structures / Later UI]` A walker's recurring routes rotate through a
  hand-written **circular list**.
- **FR-14** `[Oct5 structures / Later UI]` GPS points during a walk are buffered through a
  hand-written **queue** before being persisted as an **array** time series.

### Later (final delivery only)
- **FR-15** Compatible dogs are grouped into packs using **Union-Find** with path compression.
- **FR-16** The walker's nearest pending dog is found via a 2D **Quadtree** spatial index.
- **FR-17** Owner-fixed time-window conflicts are detected with an **Interval Tree**.
- **FR-18** Dog name / note autocomplete is backed by a **Trie**.
- **FR-19** The owner sees the walker's live GPS position during the walk (Realtime).
- **FR-20** The walker dictates an incident; Whisper + LLaMA (Groq) turn it into a structured
  event on the walk timeline.
- **FR-21** A daily report (photos, map, metrics) is auto-written per walk.
- **FR-22** The owner has a statistics dashboard (number of walks, distance, incidents over time).

## Non-functional requirements

- **NFR-01** TypeScript only, frontend and backend.
- **NFR-02** All identifiers, comments, docstrings, and error/log/UI strings are in English.
- **NFR-03** `packages/structures` has zero runtime dependencies — every data structure listed
  above is hand-written, not imported from a library.
- **NFR-04** Every exported structure documents the Big-O of each operation it implements.
- **NFR-05** Free tier only end to end: Vercel (frontend), Render (backend), Supabase (DB + auth +
  realtime + pgvector), Groq (AI inference).
- **NFR-06** The system is deployed at a public URL for the code review.
- **NFR-07** The database is cloud-hosted (Supabase Postgres), never local-only.
- **NFR-08** Photo-to-dog check-in returns a match in under 3 seconds on a mid-range phone.
- **NFR-09** All API input is validated (`class-validator`) before it reaches business logic.
- **NFR-10** Secrets (Supabase keys, Groq key) live only in environment variables, never in
  committed source.
- **NFR-11** The web app is installable as a PWA.
- **NFR-12** Each hand-written structure has its own unit tests, independent of the API/web tests.

## Explicitly out of scope

Booking/reservation flows (banned by the professor — CanTrack is routing/ops, not a marketplace),
any structure-library dependency in `packages/structures`, and writing the graded deliverable
content itself (see `../cantrack.md` — that boundary was set 2026-08-09 and stands).
