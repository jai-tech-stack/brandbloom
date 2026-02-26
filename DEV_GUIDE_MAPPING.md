# Development Guide ↔ This Codebase

How the **Complete Development Guide** (Bloom-like BrandBloom) maps to what’s already built and what’s missing.

---

## 1. URL input & brand scanning

| Guide | This repo |
|-------|-----------|
| **BrandScanner** (axios + cheerio, find logo, extract colors/fonts from HTML/CSS) | **Implemented differently:** `src/lib/brand-scraper.ts` – fetch + regex/DOM parsing, no cheerio. Extracts: meta (title, description, og:image), theme-color, hex colors, logos (img with “logo”, common paths), fonts (Google Fonts, font-family, @font-face). |
| **API:** `POST /api/scan` → save BrandProfile, return id | **API:** `POST /api/extract-brand` – same idea. Uses normalized URL; if `BACKEND_BLOOM_URL` is set, calls Brand BLOOM+ (Python/Claude); else Node scraper + optional `analyzeBrandWithAI` (personality/tone). Returns full brand object; if user logged in, saves **Brand** and adds `brandId` to response. |
| **Flow:** Submit URL → redirect to `/generate?brandId=...` | **Flow:** Submit URL → redirect to `/analyze?url=...` → extraction runs on that page → “Let’s Begin” → create-assets screen. No separate “scan then generate” URL with brandId; brand lives in analyze page state (and in DB when logged in). |

**Summary:** Scan + extract is done; implementation is Node + optional Python backend, not the guide’s cheerio/axios class. No `/api/scan`; use `/api/extract-brand`.

---

## 2. AI-powered image generation

| Guide | This repo |
|-------|-----------|
| **ImageGenerator** – OpenAI DALL-E 3, build prompt from brand, optional logo overlay (sharp) | **Implemented:** `src/lib/ai-generator.ts` – **Replicate (Flux Schnell)**. Builds prompt from brand context (name, colors, description). **No logo overlay.** No DALL-E. |
| **API:** `POST /api/generate` with brandId + prompt → generate, upload S3, save Asset, deduct credits | **API:** `POST /api/generate-assets` with url, brand (name, colors, description), optional brandId, promptOverride, aspectRatio, limit. Uses Replicate (or fallback Emergent backend); returns image URLs (no S3 upload in core flow). Saves Asset and deducts credits when logged in. |
| **Output:** Single image, logo composited | **Output:** One or more assets (preset or custom prompt); no logo compositing. |

**Summary:** Generation is implemented with Flux (Replicate). No DALL-E, no sharp/logo overlay, no S3 in the main flow. Credits and Asset saving exist.

---

## 3. Smart resize for multiple platforms

| Guide | This repo |
|-------|-----------|
| **SmartResize** – sharp, resize to Instagram/Facebook/Twitter/LinkedIn dimensions, “attention” crop | **Not implemented.** No `lib/smart-resize.ts`, no `/api/resize`. |
| **API:** `POST /api/resize` with imageUrl + platform | **Missing.** |

**Summary:** Add `lib/smart-resize.ts` and `POST /api/resize` (and optionally UI) to match the guide.

---

## 4. Edit images (text, product, background)

| Guide | This repo |
|-------|-----------|
| **ImageEditor** – DALL-E edit endpoint for change text / change background | **Not implemented.** No `lib/image-editor.ts`, no edit API. |

**Summary:** Add image-editor module and an edit API (and UI) if you want this feature.

---

## 5. Database schema

| Guide (Prisma) | This repo |
|----------------|-----------|
| **User** – id, email, name, plan, credits | **User** – id, email, name, **password** (Credentials auth), credits. No `plan` field. |
| **BrandProfile** – id, userId, website, logoUrl, colors (Json), fonts (Json) | **Brand** – id, userId, **siteUrl**, **name**, description, tagline, **colors** (String/JSON), **image** (logo), domain, **fonts** (String/JSON), logos, personality, tone. Same idea, different names and extra fields. |
| **Asset** – id, brandProfileId, imageUrl, prompt, platform, creditsUsed | **Asset** – id, userId, brandId (optional), **url**, label, type, width, height, prompt. No `platform` or `creditsUsed`; type is social/ad/thumbnail/banner. |
| **CreditTransaction** | **Not present.** Credits are decremented on User; no transaction log. |

**Summary:** Schema is close: User, Brand (≈ BrandProfile), Asset. Add CreditTransaction and optional `plan` if you want to match the guide exactly.

---

## 6. UI components

| Guide | This repo |
|-------|-----------|
| **Landing** – hero, “Effortlessly create branded assets”, URL input | **Implemented:** `src/app/page.tsx` – Hero (URL input), FeaturesBloom, HowItWorks, Gallery, Pricing, FAQ, Footer. |
| **URLInputForm** – POST /api/scan, redirect to `/generate?brandId=` | **Implemented:** Hero form submits URL → `router.push(/analyze?url=...)`. No brandId in URL; brand comes from extract-brand on the analyze page. |
| **Generate page** – fetch brand by id, prompt textarea, generate button, show image, Edit/Resize/Download | **Implemented:** `src/app/analyze/page.tsx` – phased: extracting → generated → create → assets. “Create” uses prompt + aspect ratio; shows generated images and Download (and “Create more”). **No dedicated Edit or Resize UI** (no edit/resize APIs). |

**Summary:** Flow is “URL → analyze → extract → create assets” with a single analyze page. Add Edit/Resize once the corresponding APIs exist.

---

## 7. API routes

| Guide | This repo |
|-------|-----------|
| `POST /api/scan` | Use **`POST /api/extract-brand`** (same purpose). |
| `POST /api/generate` | Use **`POST /api/generate-assets`** (different payload; returns assets array). |
| `POST /api/resize` | **Missing.** |
| — | **Existing:** `/api/brands`, `/api/brands/[id]`, `/api/assets`, `/api/assets/[id]`, `/api/me`, `/api/auth/*`, `/api/stripe/*`, `/api/webhooks/stripe`, tRPC. |

---

## 8. Setup & env

| Guide | This repo |
|-------|-----------|
| OpenAI, PostgreSQL, AWS S3, NextAuth | **Current:** NextAuth (Credentials), SQLite (or PostgreSQL via DATABASE_URL), Replicate (Flux), optional Brand BLOOM+ (Anthropic), optional Stripe, optional R2. No OpenAI for images; no S3 in core flow. |

Use **RUN_FROM_SCRATCH.md** and **.env.example** for exact env and run order.

---

## 9. Launch checklist (guide) vs status

| Item | Status |
|------|--------|
| Brand scanner working | Done (Node + optional BLOOM+ backend). |
| Image generation | Done (Replicate/Flux; no DALL-E). |
| Logo overlay system | Not implemented. |
| Platform resize | Not implemented. |
| Credit system | Done (credits on User, deduct on generate). |
| Stripe | Implemented (checkout + webhook). |
| Auth (NextAuth) | Done (Credentials). |
| S3/R2 storage | Optional R2; assets store URL (e.g. Replicate CDN). |
| Landing + value prop | Done. |
| Pricing page | Done. |
| Edit/Resize UI | Not done (no APIs). |
| CreditTransaction | Not in schema. |

---

## 10. What to add to align with the guide

1. **Smart resize** – Implement `lib/smart-resize.ts` (e.g. with sharp) and `POST /api/resize` (imageUrl + platform); optionally add “Resize” on the assets view.
2. **Image edit** – Implement `lib/image-editor.ts` (e.g. OpenAI edit or another provider) and an edit API; add “Edit” (text/background) in the UI.
3. **Logo overlay** – In `ai-generator` or generate-assets flow: download logo from brand.image, composite onto generated image (e.g. sharp), then return or upload result.
4. **CreditTransaction** – Add model and write a row on each credit deduct (and purchase) for history.
5. **Optional:** Add `plan` to User; rename or alias Brand ↔ BrandProfile and Asset fields for consistency with the guide.

---

**In short:** The guide is a full blueprint. This repo already implements URL → scan (extract-brand) → generate (Flux) → show/download, with auth, credits, and Stripe. Missing vs guide: **smart resize**, **image edit**, **logo overlay**, and **CreditTransaction** (and the UI for edit/resize). Use this mapping to decide what to build next.
