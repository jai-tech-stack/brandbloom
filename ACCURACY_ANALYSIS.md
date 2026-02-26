# Brand BLOOM+ — Accuracy Analysis

The **flow is correct** (Add website → Learn brand → Generate assets). **Accuracy** gaps are below and have been addressed in code where possible.

---

## 1. Brand extraction accuracy

| Gap | Cause | Fix |
|-----|--------|-----|
| **Wrong or missing colors** | Only hex `#xxx` parsed; many sites use `rgb()`, `rgba()`, or CSS variables like `--primary-color` | Parse `rgb()`/`rgba()` and convert to hex; optionally parse `--name: #hex` from CSS |
| **Fonts not generated** | Claude sometimes omits `fonts`; CSS font-family regex can miss wrapped or minified values | Merge extracted fonts into result when Claude omits; broaden font regex if needed |
| **Logo not visible** | Logo URL found but not shown, or CORS blocks image | Frontend shows `logo_url`; logo detection uses og:image, img[logo], header image |
| **Claude returns wrong keys** | Model may return `primaryColors` (camelCase) or different field names | Normalize all keys to snake_case in `parse_claude_response` |
| **JSON parse failure** | Trailing commas or markdown around JSON → `{}` and lost data | More robust JSON extraction (strip markdown, try fix trailing comma) and merge with extracted data |

---

## 2. Generation accuracy (assets / logos)

| Gap | Cause | Fix |
|-----|--------|-----|
| **Generated images ignore brand colors** | Prompt does not force use of exact hex; model invents palette | Asset prompt includes explicit “Use these hex colors: …” and “Style: …” from profile |
| **Style/mood vague** | Brand profile has style/mood but prompt doesn’t tie image to them | Asset creator gets a short “brand brief” (colors, style, fonts, mood) and instructs Claude to use it in the prompt |
| **Logo concepts off-brand** | Logo strategy/concepts may not reflect extracted colors/fonts | Logo agent already receives full brand_profile; ensure strategy prompt says “use brand colors and style” |

---

## 3. Data flow consistency

| Gap | Cause | Fix |
|-----|--------|-----|
| **Profile lost between steps** | Frontend stores profile in Zustand; no server persistence | Acceptable for MVP; later add API/db to persist brand profile per brand |
| **Empty profile passed to API** | If analysis fails partially, we might send `{}` to asset/logo | Validate profile has at least `primary_colors` or `style` before calling generation; show error in UI |

---

## 4. Implemented changes (summary)

- **`parse_claude_response`**: Normalize keys to snake_case; try to fix trailing commas; extract first `{...}` if code block fails.
- **`brand_analyzer`**: Extract `rgb()`/`rgba()` and convert to hex; merge extracted colors/fonts into Claude result so we never drop them when Claude omits or uses wrong keys.
- **`asset_creator`**: Build an explicit brand brief (primary_colors, secondary_colors, style, fonts, mood) and instruct Claude to use it in the image prompt for on-brand output.

---

## 5. Optional next steps

- Persist brand profile in backend and pass `brand_id` so generations always use latest profile.
- Add a “re-analyze” action to refresh colors/fonts/logo after site changes.
- Validate asset/logo API inputs (required fields, hex format) and return 400 with clear errors.
