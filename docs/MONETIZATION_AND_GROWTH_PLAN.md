# BrandBloom: Monetization & Growth Implementation Plan

This document maps the product strategy (tiers, viral loops, moats) to concrete implementation work.

---

## 1. Monetization upgrade ladder

### Tier model

| Tier | Target | Key gates in code |
|------|--------|-------------------|
| **Starter (Free)** | Solopreneurs, indie | 1 brand, URL extraction, basic kit, single-asset gen, limited credits, watermark, no campaign, no strategy profile |
| **Pro** | Startups, agencies | 5–10 brands, Campaign Agent, batch gen, blueprint edit, regeneration, no watermark, strategy intelligence, higher credits |
| **Enterprise** | VC-backed, corporate | Unlimited brands, Brand Lock Mode, compliance, logo/tone rules, consistency scoring, team seats, API, white-label, priority |

### Implementation checklist

- [ ] **Plan/DB**: Add `User.tier` (enum: `starter` \| `pro` \| `enterprise`) and/or `User.planId`; optional `Brand.lockMode` for Enterprise.
- [ ] **Gates**: Central `can(user, feature)` or `getTierLimits(user)` used by APIs.
  - Starter: `maxBrands: 1`, `campaignAllowed: false`, `strategyProfileAllowed: false`, `watermarkExport: true`, `creditsCap`.
  - Pro: `maxBrands: 10`, `campaignAllowed: true`, `strategyProfileAllowed: true`, `watermarkExport: false`, higher credits.
  - Enterprise: `maxBrands: Infinity`, `brandLockMode: true`, team/API/white-label flags.
- [ ] **Credits**: Keep existing `User.credits`; tier determines monthly top-up and cap (Starter cap, Pro higher, Enterprise custom).
- [ ] **Watermark**: In export/download or in `imageExecutor` when tier is Starter — add overlay “Created with BrandBloom” or similar.
- [ ] **Strategy profile**: Run `analyzeDeepStrategy` only when `strategyProfileAllowed` (Pro+); else skip and leave `strategyProfile` null.
- [ ] **Campaign**: `POST /api/generate-campaign` returns 403 or “Upgrade to Pro” when `!campaignAllowed`.
- [ ] **Brand limit**: On brand create (extract or “New Brand”), check `brands.length < maxBrands` for user’s tier.
- [ ] **Enterprise Brand Lock**: When `brandLockMode` true, pass `brandLock: true` into orchestrator/promptBuilder; optional compliance check step (e.g. consistency score threshold) before returning asset.

**Critical rule (from strategy):** Don’t gate core generation logic. Gate scale, automation, control, compliance, team.

---

## 2. Viral growth mechanisms

### Viral Loop #1 — Public asset share pages

- **Route:** `GET /share/[id]` (or `brandbloom.ai/share/xyz123`).
- **DB:** Add `Asset.shareSlug` (unique, nullable) and optionally `Asset.shareEnabledAt` (timestamp).
- **Flow:** On export (or explicit “Share” action), generate `shareSlug` (e.g. nanoid), set `shareEnabledAt`, return share URL.
- **Page content:** Generated asset image, “Created with BrandBloom”, CTA “Create your own brand assets” → `/` or signup.

**Tasks:** Migration for `shareSlug`/`shareEnabledAt`, API to create share link, public `/share/[slug]` page (no auth).

---

### Viral Loop #2 — “Brand Score” public badge

- **Concept:** After deep strategy (or deep analysis), compute **Brand Intelligence Score** (e.g. 0–100) from strategy profile completeness + consistency signals.
- **Storage:** `Brand.strategyScore` (optional number) and/or derive on the fly from `strategyProfile` + `consistencyScore` history.
- **Actions:** “Share on LinkedIn” (prefilled text + link to score page), “Embed badge” (iframe or image link to `brandbloom.ai/score/xyz`).
- **Page:** `GET /score/[brandIdOrSlug]` — public page showing score, optional mini breakdown, “Optimized with BrandBloom AI” badge.

**Tasks:** Score computation (formula), optional `Brand.publicScoreSlug`, `/score/[slug]` page, share/embed copy.

---

### Viral Loop #3 — Campaign showcase

- **Concept:** User can “Make campaign public” (toggle or one-time).
- **DB:** `Campaign.publicSlug` (nullable), `Campaign.publicEnabledAt` (nullable).
- **Route:** `GET /campaigns/[slug]` (public).
- **Page:** Strategy summary, asset previews (grid), “AI-generated campaign case study”, CTA to try BrandBloom.

**Tasks:** Migration, “Make public” API, public campaign page.

---

### Viral Loop #4 — Free website audit tool

- **Concept:** Standalone public tool: enter URL → mini brand intelligence preview (no signup) → 1 sample asset tease → upsell full campaign/signup.
- **Route:** `GET /audit` (landing), `POST /api/audit` (no auth) — scrape + lightweight analysis (no full strategy, no save), return summary + 1 sample asset URL or placeholder.
- **Limit:** Rate limit by IP; no DB brand creation until signup.

**Tasks:** Public `/audit` page, `POST /api/audit` (scrape + minimal analysis + optional 1 image), rate limit, upsell CTA.

---

## 3. Technical moat strategy

### Moat #1 — Blueprint engine

- **Status:** Already in place: `Asset.blueprint` (JSON), `finalPrompt`, `ideaType`.
- **Enhancement:** Ensure every generation path writes blueprint; optional analytics event “blueprint_used” (ideaType, layout) for future training/insight.

### Moat #2 — Brand strategy intelligence dataset

- **Status:** `Brand.strategyProfile` (JSON) from deep strategy.
- **Enhancement:** Internal analytics or export (anonymized) for archetype/positioning distribution; no PII. Optional “improve our model” consent for training.

### Moat #3 — Brand Lock compliance engine

- **Scope:** Enterprise.
- **Features:** `brandLock: true` → strict promptBuilder; optional post-generation “compliance check” (e.g. consistency evaluator run on single asset); “Auto audit + auto regeneration” = background job that re-scores and optionally regenerates if below threshold.
- **Tasks:** Formalize compliance rules (logo placement, tone), store in `Brand` or plan; compliance check API/job; regeneration loop with blueprint tweaks.

### Moat #4 — Campaign agent optimization

- **Concept:** Track which asset types/users regenerate less, which layouts perform better (e.g. by consistency score or explicit feedback).
- **Storage:** Optional `Asset.regenerateCount`, `Asset.consistencyScore`; campaign-level aggregates.
- **Use:** Analytics or internal API to “auto-prioritize” blueprint templates (e.g. suggest top N ideaTypes for next campaign).

**Tasks:** Track regenerate events, optional feedback; aggregate table or analytics; template prioritization logic.

### Moat #5 — Brand memory over time

- **Schema concept:**
  - `BrandMemory` or JSON on `Brand`: `pastCampaigns[]`, `preferredToneAdjustments`, `performanceSignals`, `assetModificationHistory` (or references to assets).
- **Usage:** Feed into intent interpreter / campaign planner so “BrandBloom evolves per brand.”

**Tasks:** Design `Brand.memory` (JSON) or separate table; update memory on campaign complete, regeneration, edit; inject memory into planner and intent.

---

## 4. Suggested implementation order

1. **Tier gating (Starter / Pro / Enterprise)** — DB + `can(user, feature)` + gates on brands count, campaign, strategy profile, watermark. Enables pricing page and upgrade flows.
2. **Public share page for assets** — Share slug, public `/share/[slug]`, CTA. Fast viral loop.
3. **Brand Score + badge** — Score computation, share/embed, optional public score page.
4. **Campaign showcase** — Public campaign slug and page.
5. **Free audit tool** — `/audit` + `POST /api/audit` + rate limit.
6. **Enterprise Brand Lock and compliance** — Formalize lock mode, compliance check, optional auto-regeneration.
7. **Brand memory** — Schema and updates; plug into planner/intent.
8. **Campaign/blueprint optimization** — Tracking and template prioritization.

---

## 5. Files to touch (reference)

- **Tiers/gates:** `prisma/schema.prisma` (User.tier or Plan), `src/lib/tier.ts` (new), `src/app/api/extract-brand/route.ts`, `src/app/api/generate-campaign/route.ts`, `src/app/api/brands/route.ts`, export/download (watermark).
- **Share:** `prisma/schema.prisma` (Asset), `src/app/share/[slug]/page.tsx`, `src/app/api/assets/[id]/share/route.ts` (or similar).
- **Score:** `Brand.strategyScore` or computed, `src/app/score/[slug]/page.tsx`, share/embed in dashboard or analyze.
- **Campaign public:** `Campaign.publicSlug`, `src/app/campaigns/[slug]/page.tsx`, API to enable.
- **Audit:** `src/app/audit/page.tsx`, `src/app/api/audit/route.ts`.
- **Memory:** `Brand.memory` or new table, `src/lib/agent/campaignPlanner.ts`, `src/lib/generation/intentInterpreter.ts`.
