# CanTrack — Image prompts

Save every file at the **exact path** in the table (all under `apps/web/public/art/`). The app references
them as `/art/<folder>/<file>`. Until a file exists, the UI shows a flat color tile instead (no broken images).

## Style bible (paste at the start of EVERY prompt)

> Friendly pet-app illustration, soft pastel palette built from sage green #ADEBB3, fresh green #45C55D,
> peach #FFC9A8, lavender #C9B8F5, sky blue #A9DCF7, butter yellow #FFE49A, with warm off-white #F4FAF3.
> Rounded shapes, no outlines darker than the fill, gentle top-left light, no text, no logos, no watermark.

Two looks, do not mix them in one image:
- **Flat** = 2D vector illustration, clean shapes, subtle paper-cut shadow. Used for onboarding, empty states, banners.
- **Clay** = soft 3D clay render, matte, studio light, like the beagle in the reference. Used for dogs on tiles.

## Settings

| Kind | Size | Format | Notes |
|---|---|---|---|
| Flat scenes | 1200×900 | WebP, < 150 KB | solid background in the stated tint |
| Clay dogs | 800×800 | PNG with transparent background | remove background, then compress |
| Banners | 1200×600 | WebP | subject placed on the right third |
| Avatars | 400×400 | WebP | centered, circular crop safe |

Generate at 2× and downscale. Negative prompt for all: `text, letters, watermark, logo, extra legs,
extra fingers, deformed, blurry, dark background, photorealistic human faces`.

## Files

### Onboarding (`onboarding/`)

| File | Prompt (after the style bible) |
|---|---|
| `01-owner-and-dog-home.webp` | Flat. A young woman and a man sitting on a sage-green sofa at home hugging a small beige dog, big window behind them, potted plants, warm light. Background tint peach #FFC9A8. Landscape. |
| `02-walker-with-pack.webp` | Flat. A smiling dog walker in a green jacket walking three different dogs on leashes through a park path with trees and a bench, morning light. Background tint sage #ADEBB3. |
| `03-live-map-pin.webp` | Flat. A stylized neighborhood map seen from above with streets in white, a winding walking path in fresh green, a big location pin and a small paw-print marker following the path. Background tint sky #A9DCF7. |

### Banners (`banners/`)

| File | Prompt |
|---|---|
| `banner-find-walker.webp` | Flat. Wide banner, mint-green background with faint paw prints, on the right a cheerful walker waving next to a golden labrador, empty space on the left for text. |
| `banner-start-walk.webp` | Flat. Wide banner, peach background with faint paw prints, on the right a pack of three dogs (beagle, french bulldog, poodle) walking together on leashes, empty space on the left. |

### Clay dogs (`pets/`) — transparent PNG

| File | Prompt |
|---|---|
| `dog-beagle.png` | Clay. A beagle standing in side view, head up, brown and white coat, matte clay texture, centered, plain background. |
| `dog-french-bulldog.png` | Clay. A french bulldog puppy sitting, front three-quarter view, tan coat, big ears. |
| `dog-labrador.png` | Clay. A golden labrador sitting, happy open mouth, front view. |
| `dog-poodle.png` | Clay. A white toy poodle standing, fluffy rounded fur, side view. |
| `dog-mixed.png` | Clay. A scruffy mixed-breed dog with one floppy ear, standing, friendly look. |

The app tints the tile behind each dog (sage, peach, lavender, sky, butter), so keep the dog's own colors
neutral and the background fully transparent.

### Empty states (`empty/`)

| File | Prompt |
|---|---|
| `no-dogs.webp` | Flat. A cute dog sitting next to an empty dog bed and a leash, mint background. |
| `no-requests.webp` | Flat. A tidy desk with an empty inbox tray and a small paw-print sticker, peach background. |
| `no-checkouts.webp` | Flat. A dog sleeping in a basket with a camera on the floor next to it, sky background. |
| `no-walkers-nearby.webp` | Flat. A magnifying glass over a map with a question-mark-free empty pin, lavender background. |
| `checkout-sent.webp` | Flat. A happy dog with a green check badge and tiny confetti, butter-yellow background. |

### Avatars (`avatars/`) — placeholders until users upload a photo

| File | Prompt |
|---|---|
| `walker-default.webp` | Flat. Friendly person bust in a green jacket with a cap, circular composition, sage background, faceless-style simple features. |
| `owner-default.webp` | Flat. Friendly person bust holding a small dog, circular composition, lavender background, simple features. |

### Drawn in code (do NOT generate)

`patterns/paw-pattern.svg` (already in the repo), map pins, status icons, tab-bar icons.

## Checklist when you add an image

1. Saved at the exact path and size above, compressed.
2. Looks right on its tint at 390 px wide.
3. No text inside the image.
4. Tick it here:

- [ ] onboarding 01 · [ ] 02 · [ ] 03
- [ ] banner-find-walker · [ ] banner-start-walk
- [ ] beagle · [ ] french-bulldog · [ ] labrador · [ ] poodle · [ ] mixed
- [ ] no-dogs · [ ] no-requests · [ ] no-checkouts · [ ] no-walkers-nearby · [ ] checkout-sent
- [ ] walker-default · [ ] owner-default
