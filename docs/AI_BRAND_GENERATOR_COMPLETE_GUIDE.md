# BrandBloom — Complete Technical Guide

AI-powered brand asset generator (Bloom/trybloom.ai competitor). User enters a website URL → we extract brand identity → generate on-brand images for social, ads, and marketing.

---

## Tech stack (current)

| Layer        | Technology                          |
|-------------|--------------------------------------|
| Frontend    | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend     | Next.js API Routes (no separate server)        |
| Brand extraction | HTML/CSS parsing; optional OpenAI for personality |
| Image generation | Replicate — FLUX Schnell                    |
| (Future)    | PostgreSQL, Redis/BullMQ, Stripe, S3/R2         |

---

## Architecture

```
User submits URL (homepage → /analyze)
    ↓
POST /api/extract-brand
    → Fetch HTML (and linked CSS if needed)
    → Parse: meta, colors, logos, fonts
    → Optional: OpenAI to infer brand personality/tone
    ↓
Brand dashboard (name, tagline, colors, fonts, logo)
    ↓
User clicks "Create" with prompt + aspect ratio
    ↓
POST /api/generate-assets
    → Build prompt from brand + user input
    → Replicate FLUX Schnell (or demo placeholders)
    ↓
Asset grid → view / download
```

---

## Key components

### 1. Website analysis

- **Scraper** (`src/lib/brand-scraper.ts`): Fetches URL, extracts:
  - **Meta**: `og:title`, `<title>`, `og:description`, meta description, `og:tagline`, first `<h1>`, `theme-color`, `og:image`
  - **Colors**: `theme-color` + hex codes from HTML/CSS
  - **Logos**: `<img>` with `src`/`alt` containing "logo", or common paths like `/logo.png`
  - **Fonts**: Google Fonts `<link>`, `font-family` from inline/CSS
- **Optional AI** (`OPENAI_API_KEY`): Send meta + description to GPT-4/Claude to get short **brand personality** and **tone** (e.g. "Professional, trustworthy, minimal").

### 2. Image generation

- **Service** (`src/lib/ai-generator.ts`): Wraps Replicate FLUX Schnell.
  - Input: prompt, aspect ratio, (optional) brand colors/name.
  - Output: image URL(s).
  - Can be extended for DALL-E 3 or other providers.
- **API** (`/api/generate-assets`): Accepts `url`, `brand`, `promptOverride`, `aspectRatio`, `limit`. Uses Replicate when `REPLICATE_API_TOKEN` is set; otherwise returns demo placeholders.

### 3. UI flow

- **Landing** → Hero with URL input → redirect to `/analyze?url=...`
- **Analyze** → Multi-phase: "Extracting brand" (steps + timer) → "Brand identity generated" → "Create" dashboard (sidebar + prompt + aspect ratio + idea cards + curated aesthetics) → Asset grid.

---

## Database schema (future)

When you add persistence (e.g. Prisma + PostgreSQL):

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  credits   Int      @default(10)
  brands    Brand[]
  assets    Asset[]
}

model Brand {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  siteUrl     String
  name        String
  description String?
  tagline     String?
  colors      String[] // or JSON
  fonts       String[]
  logoUrl     String?
  personality String?
  createdAt   DateTime @default(now())
}

model Asset {
  id        String   @id @default(cuid())
  userId    String
  brandId   String?
  url       String
  prompt    String?
  width     Int
  height    Int
  createdAt DateTime @default(now())
}
```

---

## Environment variables

| Variable              | Required | Description |
|-----------------------|----------|-------------|
| `REPLICATE_API_TOKEN` | For real images | Replicate API token (FLUX Schnell) |
| `OPENAI_API_KEY`      | Optional | Enables AI brand personality/tone in extraction |

---

## Cost estimates

- **FLUX Schnell (Replicate)**: ~\$0.003 per image.
- **OpenAI (optional)**: ~\$0.01–0.02 per brand analysis.
- **Hosting**: Vercel free tier for MVP; add DB/storage as you scale.

---

## Next steps

1. Follow **DEVELOPMENT_ROADMAP.md** for the 8-week path.
2. Use **DEPLOYMENT_GUIDE.md** for Vercel, env, and production checks.
3. Add auth (NextAuth), then credits + Stripe when you want to monetize.
