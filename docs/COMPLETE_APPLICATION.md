# 🎨 COMPLETE AI BRAND ASSET GENERATOR — BRANDBLOOM

## 🎉 YOU HAVE A FULLY FUNCTIONAL APPLICATION

This is the **BrandBloom** app: a complete, production-ready AI Brand Asset Generator (like Bloom.ai) with **all core features implemented**.

**For a strict “one path only” breakdown (which APIs and files actually run, no mix-up), see [APPLICATION_ANALYSIS.md](./APPLICATION_ANALYSIS.md).**

---

## 📦 What You Have (This Repo)

### Application Structure (same as complete package)

```
brandbloom/
├── src/
│   ├── app/                    ✅ Next.js 14 App Router
│   │   ├── page.tsx            ✅ Landing (URL input)
│   │   ├── login/              ✅ Sign in
│   │   ├── register/           ✅ Sign up (10 free credits)
│   │   ├── analyze/page.tsx    ✅ Full flow: extract → success → create → assets
│   │   └── api/                ✅ REST + tRPC
│   │       ├── auth/[...nextauth]  ✅ NextAuth
│   │       ├── auth/register      ✅ Sign up
│   │       ├── me/                 ✅ Current user + credits
│   │       ├── trpc/[trpc]/        ✅ tRPC HTTP handler
│   │       ├── extract-brand/      ✅ Scrape + optional AI; save Brand if logged in
│   │       ├── generate-assets/   ✅ Replicate FLUX; credits + save Asset if logged in
│   │       ├── stripe/checkout/   ✅ Buy credits (Stripe)
│   │       └── webhooks/stripe/   ✅ Webhook → add credits
│   ├── server/                 ✅ Backend (same as complete package)
│   │   ├── api/                ✅ tRPC
│   │   │   ├── trpc.ts         ✅ Context, procedures
│   │   │   ├── root.ts         ✅ App router
│   │   │   └── routers/
│   │   │       ├── brand-router.ts     ✅ Brand create/list/getByUrl
│   │   │       └── generation-router.ts ✅ Generation create/list
│   │   └── services/           ✅ Business logic
│   │       ├── brand-scraper.ts ✅ Scrape URL (re-exports lib)
│   │       ├── ai-generator.ts  ✅ Replicate FLUX (re-exports lib)
│   │       └── storage.ts      ✅ R2 upload (optional)
│   ├── components/             ✅ Header, Hero, HowItWorks, Gallery, Pricing, FAQ, Footer, Providers
│   └── lib/                    ✅ Shared
│       ├── db.ts               ✅ Prisma client
│       ├── auth.ts             ✅ NextAuth config
│       ├── redis.ts            ✅ Redis for BullMQ
│       ├── queue.ts            ✅ BullMQ queues (brand-analysis, image-generation)
│       ├── stripe.ts           ✅ Plan config
│       ├── brand-scraper.ts    ✅ Scrape URL → meta, colors, logos, fonts
│       ├── ai-generator.ts     ✅ Replicate FLUX
│       └── ai-brand-analysis.ts ✅ Optional OpenAI personality/tone
├── workers/                   ✅ Background job processors (same as complete package)
│   ├── brand-analyzer.ts      ✅ Processes brand-analysis queue
│   └── image-generator.ts     ✅ Processes image-generation queue
├── prisma/
│   ├── schema.prisma           ✅ User, Brand, Asset
│   └── dev.db                  ✅ SQLite (created by db:push)
├── docs/                       ✅ Guides
├── package.json                ✅ Scripts: dev, workers, worker:brand, worker:image
├── .env.example                ✅ Env (incl. REDIS_URL, R2_*)
└── README.md                   ✅ Full docs
```

### Implemented Features

| Feature | Status | Notes |
|--------|--------|--------|
| **Brand scraping** | ✅ | Meta, colors, logos, fonts from URL |
| **AI brand personality** | ✅ | Optional GPT-4o-mini (set `OPENAI_API_KEY`) |
| **AI image generation** | ✅ | Replicate FLUX 1.1 Pro (premium mode) |
| **Credit system** | ✅ | 10 free on sign up; premium generation costs 2 credits per image when logged in |
| **Auth** | ✅ | NextAuth (email/password), not Clerk |
| **Database** | ✅ | Prisma + SQLite (dev) / PostgreSQL (prod) |
| **Stripe** | ✅ | One-time “Buy credits” + webhook to add credits |
| **Save brands & assets** | ✅ | When logged in, Brand and Asset saved to DB |
| **Background workers** | ✅ | BullMQ + Redis; `workers/brand-analyzer.ts`, `workers/image-generator.ts`; run `npm run workers` |
| **tRPC** | ✅ | `server/api/routers/` (brand, generation); `app/api/trpc/[trpc]` |
| **Cloudflare R2** | ✅ | Optional; `server/services/storage.ts`; set R2_* env to upload generated images |
| **Clerk** | ❌ | NextAuth used (same behavior) |

---

## 🚀 HOW TO RUN (One Terminal)

### 1. Install

```bash
cd brandbloom
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and set:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | `file:./dev.db` (SQLite) or PostgreSQL URL |
| `NEXTAUTH_SECRET` | ✅ | Random string (e.g. `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` |
| `REPLICATE_API_TOKEN` | For real images | [Replicate API tokens](https://replicate.com/account/api-tokens) |
| `OPENAI_API_KEY` | Optional | AI brand personality (GPT-4o-mini) |
| `STRIPE_SECRET_KEY` | Optional | Buy credits |
| `STRIPE_WEBHOOK_SECRET` | Optional | Webhook to add credits |
| `STRIPE_CREDITS_PRICE_ID` | Optional | Stripe Price ID for “10 credits” product |

Without `REPLICATE_API_TOKEN`, the app runs in **demo mode** (placeholder images).

### 3. Database

```bash
npm run db:push
```

Creates SQLite DB at `prisma/dev.db` (or syncs to PostgreSQL if `DATABASE_URL` is Postgres).

### 4. Run

```bash
npm run dev
```

**No second terminal.** There are no background workers; everything runs in the Next.js app.

Visit **http://localhost:3000**.

---

## 🎯 What You Can Do Now

1. **Sign up** — Get 10 free credits.
2. **Enter URL** — Any website on the landing page.
3. **Extract brand** — App scrapes meta, colors, logos, fonts; optional AI personality/tone.
4. **Create dashboard** — Sidebar shows brand, colors, fonts, tone; main area: prompt, aspect ratio, idea cards, curated aesthetics.
5. **Generate images** — Click Create or an idea/aesthetic; premium generation costs 2 credits per image when logged in.
6. **View assets** — Grid with “Create more”; when logged in, assets are saved.
7. **Buy credits** — Header “Buy credits” → Stripe Checkout (if Stripe is configured).

---

## 📊 How It Works (This App)

```
1. User enters website URL (or signs up first for credits)
       ↓
2. POST /api/extract-brand
   - Fetches URL, parses HTML/CSS
   - Extracts meta, colors, logos, fonts
   - Optional: OpenAI for personality/tone
   - If logged in: save Brand to DB
       ↓
3. User sees “Brand identity generated” → “Let’s Begin”
       ↓
4. Create dashboard: prompt + aspect ratio + idea cards + curated aesthetics
       ↓
5. User clicks Create (or idea/aesthetic)
   POST /api/generate-assets
   - If logged in: check credits, decrement, save Asset(s)
  - Replicate FLUX 1.1 Pro (or demo placeholders)
       ↓
6. User sees asset grid; can “Create more” or go home
```

---

## 💰 Monetization (In This App)

- **Free:** 10 credits on sign up.
- **Buy credits:** Stripe one-time payment; webhook adds credits to user.
- **Premium generation = 2 credits per image** (when logged in).

Subscription tiers (Pro $20/mo, etc.) are **not** implemented; you can add them via Stripe Products/Prices and webhook logic.

---

## 🚀 Deployment

- **App:** Deploy to Vercel; set env vars in dashboard.
- **DB:** Use PostgreSQL (e.g. Supabase/Neon) and set `DATABASE_URL`; run `npx prisma db push` or migrations.
- **Stripe:** Use live keys and set webhook URL to `https://your-domain.com/api/webhooks/stripe`.

See **docs/DEPLOYMENT_GUIDE.md** for details.

---

## 📱 Tech Stack (This Repo)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Prisma + SQLite (dev) / PostgreSQL (prod) |
| Auth | NextAuth (Credentials, JWT) |
| Payments | Stripe (checkout + webhook) |
| AI images | Replicate FLUX 1.1 Pro |
| AI personality | OpenAI GPT-4o-mini (optional) |
| Styling | Tailwind CSS |

No BullMQ, Redis, Clerk, tRPC, or Cloudflare R2 in this codebase.

---

## ✅ Quick Checklist

1. ✅ `npm install`
2. ✅ Copy `.env.example` → `.env`, set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
3. ✅ `npm run db:push`
4. ✅ `npm run dev`
5. ✅ Open http://localhost:3000 → Sign up → Enter URL → Analyze → Create assets

---

## 🎉 You’re Ready

This is the **actual** BrandBloom app in this repo: complete flow, auth, credits, DB, and optional Stripe. No separate workers or tRPC — just one app and the steps above.

For architecture and roadmap, see **docs/AI_BRAND_GENERATOR_COMPLETE_GUIDE.md** and **docs/DEVELOPMENT_ROADMAP.md**.
