# BrandBloom — API Keys Reference

All API keys are **server-side only** (in `.env`). The frontend never sees them; it calls Next.js API routes (`/api/*`), and the backend uses these env vars.

---

## Summary: How Many Keys?

| Key | Required? | Used for |
|-----|-----------|----------|
| **REPLICATE_API_TOKEN** (or REPLICATE_API_KEY) | **Optional** | Real AI image generation (Flux). Without it: placeholder images. |
| **OPENAI_API_KEY** | **Required for Logo flow**; optional for rest | Logo extraction (vision), Campaign Strategist, intent/headlines, brand personality, deep strategy. |
| **ANTHROPIC_API_KEY** | Optional | Brand personality & deep analysis (fallback if no OpenAI). |
| **BACKEND_BLOOM_URL** | Optional | URL extraction via Brand BLOOM+ Python backend (Claude). |
| **R2_*** (Cloudflare R2)** | Optional | Storing uploaded/generated images (S3-compatible). |
| **Stripe keys** | Optional | Buy credits / payments. |
| **NEXTAUTH_***** | **Required for auth** | Sign-in and sessions. |
| **DATABASE_URL** | **Required** | SQLite (dev) or PostgreSQL (prod). |

---

## Per-Feature Mapping

### 1. Start with Website (URL extraction)

- **Backend:** `POST /api/extract-brand` (body: `{ url }`).
- **Frontend:** Hero → `/analyze?url=...`; analyze page calls `/api/extract-brand`.
- **Keys:**
  - None **required**. Scraping works without any key.
  - **OPENAI_API_KEY** or **ANTHROPIC_API_KEY**: optional; used for personality/tone and deep strategy. Without: sensible defaults.
  - **BACKEND_BLOOM_URL**: optional; if set, extraction uses Brand BLOOM+ backend (Claude + CSS).

### 2. Start with Logo

- **Backend:** `POST /api/extract-brand-from-logo` (multipart: `logo`, optional `brandName`).
- **Frontend:** Hero (Start with Logo) → `fetch("/api/extract-brand-from-logo")` → redirect to `/analyze?brandId=...&stage=review`.
- **Keys:**
  - **OPENAI_API_KEY** is **required**. Logo analysis uses GPT-4o vision. If missing, API returns 503 and frontend shows: *"Logo analysis requires OpenAI. Add OPENAI_API_KEY to your server environment."*

### 3. Image generation (Create assets)

- **Backend:** `POST /api/generate-assets` (brandId, ideaType, etc.); uses Replicate Flux (or fallback).
- **Frontend:** Analyze page → `fetch("/api/generate-assets", ...)`.
- **Keys:**
  - **REPLICATE_API_TOKEN** (or **REPLICATE_API_KEY**): optional. If set → real images; if not → placeholder/demo. Frontend learns via `GET /api/features` (`realImagesAvailable`).

### 4. Campaign generation

- **Backend:** `POST /api/generate-campaign` (brandId, campaignGoal, campaignType); uses Campaign Strategist (OpenAI), then Replicate.
- **Frontend:** Campaign page → `fetch("/api/generate-campaign", ...)`.
- **Keys:**
  - **OPENAI_API_KEY**: optional for strategy (deterministic fallback if missing).
  - **REPLICATE_API_TOKEN**: same as above for images.

### 5. Upload / asset branding

- **Backend:** `POST /api/upload-asset`; Replicate for img2img.
- **Keys:** **REPLICATE_API_TOKEN** required for this route (returns error if not set).

### 6. Storage (generated/uploaded images)

- **Backend:** `uploadBufferToStorage()` (used by extract-brand-from-logo, orchestrator, etc.).
- **Keys:** **R2_ACCOUNT_ID**, **R2_ACCESS_KEY_ID**, **R2_SECRET_ACCESS_KEY** (and optionally **R2_BUCKET**, **R2_PUBLIC_URL**). If unset, uploads fall back to base64 or local behavior where applicable.

---

## Backend ↔ Frontend Mapping

- **Frontend** only talks to:
  - `POST /api/extract-brand`
  - `POST /api/extract-brand-from-logo`
  - `GET /api/brands`, `GET /api/brands/[id]`, `DELETE /api/brands/[id]`
  - `POST /api/generate-assets`
  - `POST /api/generate-campaign`
  - `GET /api/features` (to know if Replicate is configured)
  - `POST /api/upload-asset`
  - Auth: `/api/auth/*`, `/api/me`, etc.
- **No API key is ever sent from or exposed to the client.** Keys are read from `process.env` on the server only.

---

## Minimal Setup

- **Just try the app:** `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. No image or OpenAI key → placeholders, default tone.
- **Real images:** add **REPLICATE_API_TOKEN**.
- **Logo flow:** add **OPENAI_API_KEY** (required for that flow).
- **Smarter copy and strategy:** add **OPENAI_API_KEY** (and optionally **ANTHROPIC_API_KEY** for extraction).

---

## Where keys are read (backend only)

| Env var | Read in (examples) |
|--------|---------------------|
| OPENAI_API_KEY | logo-brand-analysis, campaignAgent, campaignPlanner, brandStrategistAgent, intentInterpreter, deepStrategyAnalysis, deep-brand-analysis, ai-brand-analysis, consistencyEvaluator |
| REPLICATE_API_TOKEN / REPLICATE_API_KEY | generate-assets, generate-campaign, imageExecutor, upload-asset, features, generation-router |
| ANTHROPIC_API_KEY | deep-brand-analysis, ai-brand-analysis |
| BACKEND_BLOOM_URL | extract-brand |
| R2_* | server/services/storage |
| STRIPE_* | api/stripe/*, api/webhooks/stripe |
| NEXTAUTH_* | NextAuth config |

This keeps backend and frontend correctly mapped: **one set of keys in `.env`, used only on the server.**
