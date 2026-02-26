# Deterministic Layout Flow

**AI = background art only. Your app = layout engine.**

## Generation architecture

**Old (unstable):** blueprint → image model (with text) → done.

**New (deterministic):**
1. **Blueprint** → layout key, headline, subtext, CTA, visual direction, `includeLogo`.
2. **generateBackground()** — `/lib/render/backgroundGenerator.ts`. Image model gets background-only prompt. Saves `asset.backgroundUrl`.
3. **renderLayout()** — `/lib/layouts/`. Picks template by layout key.
4. **overlayText() / placeLogo()** — Inside layout components: headline, subtext, CTA, logo at exact coordinates.
5. **exportComposite()** — `/lib/render/compositeRenderer.ts`. Renders HTML to PNG (Puppeteer). Uploads to R2/S3 → `asset.finalImageUrl`.

## Strict rules

- **Image model must never render text.** Only `buildBackgroundOnlyPrompt()` is used in the deterministic path.
- **All typography is programmatic.** Font sizes, alignment, and CTA style come from layout components (margin, grid, font sizes in code).
- **Logo placement follows exact pixel rules.** Each layout defines logo position (e.g. top-right, bottom-right, centered).
- **Layout follows predefined templates.** No AI inside `/lib/layouts/`. Deterministic only.

## Layout system (`/lib/layouts/`)

| Component | Use case | Logo position |
|-----------|----------|---------------|
| `squareTopHeading` | Top headline, subtext, CTA | Top-right |
| `splitLeftText` | Split layout, text left | Top-left |
| `verticalStoryCentered` | Vertical story, centered content | Top center |
| `productHero` | Hero, CTA bottom-center | Bottom-right |

Each layout defines: margin %, grid, font sizes, text alignment, CTA style, logo position. No AI.

## Schema

- **`Asset.backgroundUrl`** — AI-generated background only (no text/logos).
- **`Asset.finalImageUrl`** — Deterministic composite (background + layout + text + logo).
- **`Asset.blueprint`** — JSON: layout + intent (headline, subtext, cta, visualDirection, etc.).

## Env

- **`USE_DETERMINISTIC_LAYOUT`** — Set to `"false"` for legacy flow (single prompt with text in image). Default: `true`.
- **Puppeteer** — Optional. If installed, composite PNG is generated; otherwise `finalImageUrl` = `backgroundUrl`.
- **R2/S3** — If configured, composite PNG is uploaded; else `finalImageUrl` uses Replicate URL.
