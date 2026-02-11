# BrandBloom — Application Analysis (100% Accurate)

This document describes **exactly** how the app works: the one path that runs when you use the product, and what each file does. No mixed-up or duplicate flows.

---

## The One Flow That Runs (What You Actually Use)

When a user uses BrandBloom from the UI, **only this path runs**:

```
1. User opens homepage (/)
   → Landing (page.tsx) + Hero component
   → User types a URL and clicks "Get started"

2. Browser goes to /analyze?url=https://example.com
   → Analyze page (analyze/page.tsx) loads
   → Phase = "extracting"

3. Analyze page calls ONE API: POST /api/extract-brand
   → Body: { url: "https://example.com" }
   → API does: fetch URL → scrape HTML (lib/brand-scraper) → optional LLM (lib/ai-brand-analysis) → if logged in save Brand (Prisma) → return brand JSON
   → Page receives: name, description, tagline, colors, fonts, logos, personality?, tone?, brandId? (if logged in)
   → Page sets brand in state, shows "Brand identity generated", then "Let's Begin"

4. User clicks "Let's Begin"
   → Phase = "create" (dashboard: sidebar with brand, prompt input, aspect ratio, idea cards, curated aesthetics)

5. User types a prompt (or clicks an idea/aesthetic) and clicks "Create"
   → Analyze page calls ONE API: POST /api/generate-assets
   → Body: { url, brand: { name, colors, description }, brandId?, limit: 2, promptOverride, aspectRatio }
   → API does: if logged in check credits → Replicate FLUX (lib/ai-generator) → if logged in save Asset(s), decrement credits → return { assets, demo?, credits? }
   → Page receives assets, sets phase = "assets", shows grid of images

6. User sees assets; can click "Create more" (back to phase "create") or go home
```

**No other APIs are used by this flow.** No tRPC, no workers, no server/routers in the UI path.

---

## Files That Actually Run (In Order)

| Step | File | Role |
|------|------|------|
| 1 | `src/app/page.tsx` | Renders landing |
| 1 | `src/components/Hero.tsx` | URL input; on submit → `/analyze?url=...` |
| 2 | `src/app/analyze/page.tsx` | Entire analyze flow (extracting → generated → create → assets) |
| 3 | `src/app/api/extract-brand/route.ts` | POST handler: scrape + LLM + optional save Brand |
| 3 | `src/lib/brand-scraper.ts` | Fetches URL, parses HTML → meta, colors, logos, fonts |
| 3 | `src/lib/ai-brand-analysis.ts` | Optional OpenAI/Anthropic → personality, tone |
| 3 | `src/lib/db.ts` + Prisma | If logged in: save Brand, return brandId |
| 5 | `src/app/api/generate-assets/route.ts` | POST handler: credits check → Replicate → optional save Asset, decrement credits |
| 5 | `src/lib/ai-generator.ts` | buildImagePrompt + generateImageWithReplicate (FLUX) |
| 5 | `src/lib/db.ts` + Prisma | If logged in: save Asset(s), decrement User.credits |

Auth (so we know “logged in” and have credits):

- `src/lib/auth.ts` — NextAuth config
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/app/api/auth/register/route.ts` — Sign up
- `src/app/api/me/route.ts` — Current user (credits) for Header
- `src/components/Header.tsx` — Shows credits, sign in/out; listens for `credits-updated` after generate
- `src/components/Providers.tsx` — SessionProvider
- `src/app/layout.tsx` — Wraps with Providers

So: **one clear path.** REST only. Same flow every time.

---

## What Is Not Used by the Main Flow (So It Doesn’t Mix You Up)

These exist in the repo but **the analyze UI never calls them**:

| What | Where | When it runs |
|------|--------|----------------|
| **tRPC** | `src/server/api/`, `src/app/api/trpc/[trpc]/route.ts` | Only if you build another UI or client that calls `trpc.brand.create` / `trpc.generation.create` |
| **Workers** | `workers/brand-analyzer.ts`, `workers/image-generator.ts` | Only if you set REDIS_URL and run `npm run workers`; tRPC can enqueue jobs then workers process them |
| **server/services/** | `src/server/services/brand-scraper.ts`, `ai-generator.ts`, `storage.ts` | Used by tRPC routers and workers; **not** by the REST extract-brand or generate-assets routes (those use `src/lib/` directly) |
| **R2 storage** | `src/server/services/storage.ts` | Only if tRPC generation or workers run and R2 env is set; REST generate-assets returns Replicate URL only |

So:

- **Main app = REST + analyze page only.** That’s the “application” that is 100% defined and runnable.
- **tRPC + workers = optional, separate path.** Same capabilities (brand create, image generate) but different entry (tRPC + queue). Use them only if you want an API/queue-based flow later.

---

## How to Think About “100% Accurate”

- **Application analysis** = the single flow above: Home → Analyze (extract-brand → generated → create → generate-assets → assets). Every step and file is listed.
- **Accuracy** = that flow does exactly what’s in the table: one REST call for brand, one REST call for assets; credits and DB only when logged in; Replicate FLUX for images; optional LLM for personality/tone.
- **Not mixed up** = the UI never uses tRPC or workers; those are additive options, not a second parallel app.

If you want the app to be “100% accurate” like a reference (e.g. Bloom): focus only on this one flow. The rest (tRPC, workers, R2) can stay as optional/future without affecting how the main product behaves.

---

## Quick Reference: One Path Only

```
User → Home → URL → /analyze?url=...
  → POST /api/extract-brand  (lib: brand-scraper, ai-brand-analysis, db)
  → Phase: generated → create
  → User prompt + Create
  → POST /api/generate-assets (lib: ai-generator, db)
  → Phase: assets (grid)
```

Everything else in the repo is either auth, payments, docs, or optional (tRPC/workers). This is the only path that defines “the application” for the main product.
