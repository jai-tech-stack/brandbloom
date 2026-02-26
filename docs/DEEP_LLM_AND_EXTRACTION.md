# Deep LLM and data extraction (architecture)

This doc describes the **deep LLM analysis** and **richer data extraction** used to get the best possible brand understanding and asset generation.

---

## 1. Richer data extraction (no AI)

**Where:** `src/lib/brand-scraper.ts`

- **Page text excerpt:** First ~2800 characters of visible body text (scripts/styles stripped). Used as input to the deep LLM so it can infer values, audience, and key messages from real copy.
- **Meta keywords:** Parsed from `<meta name="keywords" content="…">` (comma/semicolon split, up to 20).
- **JSON-LD:** Parsed from `<script type="application/ld+json">` for `@type`: `Organization` or `WebSite`. We extract `name`, `description`, `url`, `sameAs` (social URLs). Improves name/description and can merge with social accounts.

All of this is passed into the deep analysis step when LLM keys are present.

---

## 2. Deep LLM analysis (Brand DNA)

**Where:** `src/lib/deep-brand-analysis.ts`

**Purpose:** One structured “Brand DNA” pass using a **stronger model** and **more context** than the legacy personality/tone step.

**Input (DeepAnalysisInput):**

- name, description, tagline, colors, fonts  
- **pageTextExcerpt** (from scraper)  
- **metaKeywords**  
- **jsonLd** (parsed Organization/WebSite)

**Output (BrandDNA):**

| Field | Use |
|-------|-----|
| personality | 1–2 sentences (same as before). |
| tone | One short sentence. |
| values | 3–6 brand values (e.g. Innovation, Trust). |
| targetAudience | One sentence on who the brand serves. |
| visualStyleSummary | One sentence on visual style (mood, layout, typography). |
| keyMessages | 2–4 messaging pillars. |
| toneKeywords | 4–8 adjectives for chips (Modern, Warm, etc.). |
| aestheticNarrative | 2–3 sentences that synthesize the brand aesthetic **for image prompts**. |

**Models (in order):**

1. **OpenAI `gpt-4o`** — JSON mode, 700 max_tokens, 25s timeout.  
2. **Anthropic `claude-3-5-sonnet-20241022`** — 700 max_tokens, 25s timeout.

If deep analysis returns nothing (no keys or error), we fall back to the legacy `analyzeBrandWithAI()` (personality + tone only).

---

## 3. Pipeline wiring

**Extract brand (`src/app/api/extract-brand/route.ts`):**

1. Scrape URL → get `ScrapedBrand` (including `pageTextExcerpt`, `metaKeywords`, `jsonLd`).
2. Build `DeepAnalysisInput` from scraped + normalized colors.
3. Call `deepBrandAnalysis(deepInput)`.
4. If Brand DNA returned: merge personality, tone, values, targetAudience, visualStyleSummary, keyMessages, toneKeywords, aestheticNarrative into `BrandData`.
5. If not: fall back to `analyzeBrandWithAI()` for personality + tone only.
6. Persist: `personality`, `tone` in columns; rest in `deepAnalysis` JSON column.

**Generate assets (`src/app/api/generate-assets/route.ts`):**

- `buildImagePrompt()` uses **aestheticNarrative** (first 280 chars) when present, else **visualStyleSummary** (120 chars), else legacy personality/tone. So image generation gets the deepest available aesthetic description.

**Brands API (`/api/brands`, `/api/brands/[id]):**

- Parse `deepAnalysis` JSON and spread `values`, `targetAudience`, `visualStyleSummary`, `keyMessages`, `toneKeywords`, `aestheticNarrative` into the response so the frontend and any client get full Brand DNA.

---

## 4. UI (analyze page)

- **Tone:** Chips from `toneKeywords` when present (deep), else derived from personality + tone.
- **Values:** New “Values” block with chips when `brand.values` exists.
- **Target audience:** New block when `brand.targetAudience` exists.
- **Key messages:** New block (list) when `brand.keyMessages` exists.
- **Aesthetic:** Paragraph uses `aestheticNarrative` when present, else composed from description, colors, fonts, visualStyleSummary, personality, tone.

---

## 5. Environment

- **OPENAI_API_KEY** or **ANTHROPIC_API_KEY** in root `.env` to enable deep analysis.
- If both are set, OpenAI (gpt-4o) is tried first, then Anthropic (claude-3-5-sonnet).
- No keys → no deep step; extraction is HTML/CSS + meta + JSON-LD + page text only; personality/tone can still come from the backend if `BACKEND_BLOOM_URL` is set.

---

## 6. Summary

| Layer | What |
|-------|------|
| **Extraction** | More signals: page text excerpt, meta keywords, JSON-LD Organization/WebSite. |
| **Analysis** | One deep LLM pass (gpt-4o or claude-3-5-sonnet) → structured Brand DNA. |
| **Storage** | personality/tone in columns; full DNA in `deepAnalysis` JSON. |
| **Generation** | Prompt uses aestheticNarrative (or visualStyleSummary / personality+tone). |
| **UI** | Values, target audience, key messages, tone keywords, and aesthetic narrative shown when present. |

This gives **depth** (LLM + ML-style structured output) and **richer data** (text + meta + JSON-LD) for the best possible brand understanding and on-brand asset generation.
