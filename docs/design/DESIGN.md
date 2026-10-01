# CanTrack — Design system (slice S0)

Reference: `docs/design/reference/pet-app-reference.png` (pastel pet app: big rounded cards, paw-print
patterns, pill chips, colored stat tiles, hero banner with an illustration, bottom tab bar, one big CTA).
We keep its **shapes and layout**, and swap its coral for **green**.

## What to take from the reference

- Mobile first: design at 390 px wide, scale up to a centered 480 px column on desktop.
- Radius: cards 28 px, tiles 20 px, chips/pills 999 px, buttons 999 px.
- Hero banner card: tinted background, paw-print pattern at 12 % opacity, illustration cut-out overlapping
  the corner, one white pill button.
- Pet card: square tile in a pastel tint (rotate per dog), pet cut-out, name, distance chip, heart.
- Stat tiles: three small colored tiles in a row (for a dog: size · age · energy).
- Filter pills: one active pill filled, the rest quiet.
- List rows: round tinted icon chip on the left, title + muted subtitle, chevron or two small action icons.
- Bottom tab bar with 4 icons per role; one full-width gradient CTA pinned above it on detail screens.

## Palette

Brand greens are fixed by Nico: **`#ADEBB3`** (sage) and **`#45C55D`** (green). The rest are chosen to sit
next to them. Contrast ratios are WCAG, computed on 2026-09-30.

| Token | Hex | Use | Text on it |
|---|---|---|---|
| `--c-sage` | `#ADEBB3` | brand tint, card backgrounds, active chip | ink 10.4:1 |
| `--c-green` | `#45C55D` | primary buttons, success, active icons | **ink 6.4:1 — never white (2.2:1 fails)** |
| `--c-green-700` | `#1F7A35` | links, text on light, white-text buttons | white 5.4:1 |
| `--c-green-800` | `#17612A` | pressed state, headings accents | white 7.6:1 |
| `--c-mint-wash` | `#EAFBEC` | section backgrounds, hero wash | green-700 5.0:1 |
| `--c-bg` | `#F4FAF3` | app background | muted 5.6:1 |
| `--c-surface` | `#FFFFFF` | cards, sheets | ink 14.3:1 |
| `--c-ink` | `#14301F` | all body text and headings | — |
| `--c-muted` | `#4F6A58` | secondary text | on surface 5.9:1 |
| `--c-peach` | `#FFC9A8` | pet tile tint, "pending" | ink 9.6:1 |
| `--c-orange` | `#FF9F5A` | age/energy stat tile, warnings | ink 7.0:1 |
| `--c-lavender` | `#C9B8F5` | pet tile tint, size stat tile | ink 7.9:1 |
| `--c-violet` | `#7A5FD6` | icons on lavender, premium plan | white 4.7:1 |
| `--c-sky` | `#A9DCF7` | pet tile tint, map/info | ink 9.7:1 |
| `--c-sky-700` | `#1F6F9E` | info text | on surface 5.5:1 |
| `--c-butter` | `#FFE49A` | pet tile tint, "draft" | ink 11.4:1 |
| `--c-coral` | `#FF8F85` | hearts, "declined", soft alerts | ink 6.5:1 |
| `--c-coral-700` | `#C23A33` | error text | on surface 5.3:1 |

Rules: text is always `--c-ink` or `--c-muted` on a light fill; white text only on `green-700/800`, `violet`
or darker. Coral is an accent, never the main color. Pet tiles rotate through
sage, peach, lavender, sky, butter (hash of the dog id, stable).

## Type

Rounded and friendly. Load **Nunito** (600, 700, 800) from Google Fonts, fall back to
`"Avenir Next", system-ui`. Sizes: title 28/800, section 18/700, body 16/600, caption 13/600.

## Components to build in S0 (`apps/web/src/ui/`)

`Button` (primary green + ink text · secondary sage · ghost) · `Card` (tint prop) · `ListRow` · `Pill`
(filter chip) · `StatTile` · `Banner` (hero) · `PetTile` · `Avatar` · `BottomNav` · `EmptyState` ·
`Sheet` (bottom modal) · `Toast` · `Badge` (status). Every component: keyboard focus ring in `green-700`,
44 px minimum tap target, honors `prefers-reduced-motion`.

## Screens per role (bottom nav)

- **Walker:** Today (plan + next pickup) · Clients · Requests · Profile
- **Owner:** Discover (walkers) · My dogs · Activity (timeline + checkouts + live map) · Profile

## Art

All illustrations and their prompts: `docs/design/IMAGE-PROMPTS.md`. Files live in `apps/web/public/art/`.
Code-drawn assets (paw pattern, map pins, icons) are SVG and are not AI-generated.

## Out of scope

Dark mode, animation beyond 160 ms transitions and the toast, desktop-specific layouts.
