# Trybloom.ai clone — status and how to get full parity

This doc is the **honest gap list** between BrandBloom and trybloom.ai, and **exactly what to do** so extraction and generation match their process.

---

## What trybloom.ai promises

1. **Add your website** — Enter URL.
2. **Bloom learns your brand** — “Our AI extracts your logos, colors, fonts, and analyzes your design aesthetic.”
3. **Generate assets** — Create on-brand images for social, ads, etc.

---

## What BrandBloom does today (no fooling)

### Process (matches)

- URL → sign in → extract brand → generate assets. Same 3 steps.
- No fake data: if extraction fails or times out, we show an error and “Try again”; we never pass placeholder brand data to generation.

### Brand extraction (two modes)

| Mode | When | What you get |
|------|------|--------------|
| **Node-only** | Default (no backend, no AI keys) | Meta (title, description, og:image), colors from HTML/CSS (Elementor, WordPress, Bootstrap, generic theme variables), logos from `img`/links, fonts from Google Fonts / font-face / font-family. **No** “design aesthetic” analysis. |
| **Node + AI** | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in root `.env` | Same as above **plus** personality and tone from AI. |
| **Full (Python backend)** | `BACKEND_BLOOM_URL` + backend running | Claude + CSS extraction: logos, colors, fonts, **and** style/mood analysis (closest to “Bloom learns your brand”). |

So:

- **Out of the box** you get real extraction (colors, fonts, logos, meta) but **no** “AI analyzes your design aesthetic” unless you add keys or the backend.
- For **trybloom-level “learns your brand”** you need either the **Python backend** (recommended) or at least **ANTHROPIC_API_KEY** so we add personality/tone.

### Image generation

- Uses **Replicate (Flux)**. You must set **billing + API token** on Replicate and put `REPLICATE_API_TOKEN` in root `.env`. See `IMAGE_GENERATION_SETUP.md`.
- The **prompt now includes full brand context**: name, tagline, **all extracted colors (up to 5)**, fonts, description, personality/tone. So generation is on-brand when extraction is good.

---

## Gaps vs trybloom.ai (honest list)

| Gap | Why | How to fix |
|-----|-----|------------|
| **“AI analyzes design aesthetic”** | That’s the Python backend (Claude) or our AI step (Anthropic/OpenAI). Default is HTML/CSS only. | Run backend and set `BACKEND_BLOOM_URL`, or set `ANTHROPIC_API_KEY` for tone/personality. |
| **Extraction can timeout** | Slow or unreachable sites. | We don’t fake data; we show “Try again.” For slow sites, consider running the backend (it can have its own timeouts/retries). |
| **No edit/resize/upload like Bloom** | We only do “create from prompt” right now. | Not implemented; would be new features. |
| **Login required** | We require sign-in to track users and associate usage. | By design; trybloom may allow anonymous try first. |

---

## How to get 100% extraction + generation (no fooling)

1. **Extraction as close to trybloom as possible**
   - Run the **Brand BLOOM+ Python backend** (Claude + CSS extraction).
   - In root `.env`:  
     `BACKEND_BLOOM_URL=http://localhost:8000`  
     `ANTHROPIC_API_KEY=your_key`
   - Start backend: `cd backend` then `uvicorn api.main:app --reload`.
   - Then the app will call the backend for “Bloom learns your brand”–style extraction (logos, colors, fonts, aesthetic).

2. **Generation**
   - Set up **Replicate** (billing + API token) and add `REPLICATE_API_TOKEN` to root `.env`.  
   - Restart the Next app.  
   - Generated images will use **full brand context** (colors, fonts, tagline, description, personality/tone) in the prompt.

3. **No fake data**
   - If extraction fails or times out, we **never** pass fake or partial brand data into generation; user sees an error and “Try again.”

---

## Summary

- **Process**: Same 3 steps as trybloom (URL → learn brand → generate).
- **Extraction**: Accurate as far as it goes; “AI analyzes design aesthetic” needs **backend or AI keys**.
- **Generation**: On-brand when Replicate is set up and extraction succeeds; prompt uses full brand context.
- **Honesty**: No placeholder brand data; if we don’t have full extraction, we don’t pretend we do.

For **full trybloom-style behavior**: run the Python backend + set Replicate + use real URLs. Then extraction and generation are complete and not fake.

---

## Cross-check: TryBloom pipeline vs what we implement

| TryBloom (research) | BrandBloom | Status |
|---------------------|------------|--------|
| **1. Scanning & extraction** — URL → scan for brand identity markers | Fetch URL + Node scraper (meta, colors, logos, fonts); optional Python backend (Claude) for full extraction | Done |
| **2. Visual data — logos** | Extract from `img`/links; pass `logos` to generate; prompt: "Brand has a recognizable logo; maintain consistent visual identity"; show "Logo" in create sidebar | Done |
| **2. Visual data — color palettes** | Elementor/WP/Bootstrap/generic CSS variables; filter; pass up to 5 colors in prompt | Done |
| **2. Visual data — fonts** | Google Fonts, font-face, font-family; pass in prompt; show in sidebar | Done |
| **2. Design aesthetic** | Personality/tone via AI (OpenAI/Anthropic) or backend; pass in prompt as "Design aesthetic"; show Tone + Personality in sidebar | Done |
| **3. Asset generation** — on-brand, 4K | Full brand context in prompt (name, tagline, colors, fonts, description, personality/tone, logo hint); Replicate Flux; "4K resolution" in prompt | Done |
| No fake data | Timeout/failure → error + "Try again"; never pass placeholder brand | Done |
| **Edit / variation** | Tweak or create variation | "Create variation" on assets phase: same prompt + slight variation, same brand style | Done |
| **Upload image → branded asset** | Upload & turn photos into designer-quality assets | "Upload image" on create phase: paste public image URL → img2img (Replicate SD) → branded result | Done |
| **Review and configure** brand kit | User reviews pre-filled kit (TryBloom: Debbie/Clara) | Sidebar shows full brand (name, colors, fonts, logo, tone, personality) for review before generate | Done |
| **Business description** in brand kit | Extracted and used for voice/style | We use meta + scraped description; pass in prompt | Done |
| **Social accounts** in extraction | Build brand kit from social too | Extract Facebook, Twitter, Instagram, LinkedIn, YouTube, TikTok, Pinterest from page; show in sidebar; pass to prompt as "Social presence" | Done |
| **Multi-brand support** | Manage multiple brand portfolios (agencies, multi-site) | Dashboard: list brands, switch to create assets per brand | Done |
| **AI-powered resizing** | Generate once, resize for platforms (e.g. Instagram Stories) | "Resize for platforms" on assets phase: same prompt, other aspect ratios (Story 9:16, Post 1:1, Facebook, Pinterest, YouTube) | Done |
| **Dynamic / living brand system** | Updates and stays consistent across touchpoints (not static PDF) | We store brand per URL and reuse for generation; no “update and propagate” flow | Done |
