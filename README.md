# 🎨 BrandBloom — AI Brand Asset Generator

> **Create on-brand marketing assets instantly using AI** — Inspired by [Bloom.ai](https://trybloom.ai)

A SaaS-style platform that analyzes your website, extracts your brand identity (colors, fonts, logos, tone), and generates professional marketing images that match your brand.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

---

## ✨ Features

### Core (implemented)
- 🔍 **Automatic brand analysis** — Scrape any website URL
- 🎨 **Color palette extraction** — From meta, theme-color, and HTML/CSS
- 📝 **Font detection** — Google Fonts and `font-family` in styles
- 🖼️ **Logo detection** — Images with "logo" in src/alt or common paths
- 🤖 **AI brand personality** — Optional LLM: OpenAI (GPT-4o-mini) or Anthropic (Claude 3 Haiku) for tone & personality
- 🖼️ **AI image generation** — Flux (Replicate FLUX Schnell, GPU) for on-brand assets
- 📐 **Aspect ratios & presets** — Square, portrait, widescreen, curated aesthetics
- 🎯 **Bloom-like UX** — Multi-step extraction, success screen, creation dashboard
- 🔐 **Auth** — NextAuth (Credentials: email/password), sign up gets 10 free credits
- 💳 **Credit-based system** — 1 credit per image; logged-in users get credits, decrement on generate
- 💾 **Database** — Prisma + SQLite (dev) / PostgreSQL (prod); save brands & assets when logged in
- 💰 **Stripe payments** — Optional "Buy credits" checkout; webhook adds credits

### Planned (roadmap)
- ⚡ **Background workers** — BullMQ + Redis for long-running jobs
- 📦 **Storage** — e.g. Cloudflare R2 for generated images
- 🎯 **Type-safe API** — Optional tRPC layer

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Replicate API token** (for real image generation)

### 1. Clone & install

```bash
git clone https://github.com/yourusername/brandbloom.git
cd brandbloom
npm install
```

### 2. Environment setup

Copy `.env.example` to `.env` and set:

```env
# Required for auth & DB
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-random-secret"   # e.g. openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Replicate — required for real AI image generation (FLUX Schnell)
REPLICATE_API_TOKEN=your_token

# Optional — LLM for brand personality (OpenAI tried first, then Anthropic)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional — Stripe "Buy credits" (STRIPE_CREDITS_PRICE_ID = Price ID for one-time product)
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CREDITS_PRICE_ID
```

Without `REPLICATE_API_TOKEN`, the app runs in **demo mode** (placeholder images).

### 3. Database setup

```bash
npm run db:push
```

Creates SQLite DB at `prisma/dev.db` (or use PostgreSQL `DATABASE_URL` for production).

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **Sign up** for 10 free credits, then enter a website URL → analyze → create assets. When logged in, brands and assets are saved and credits are decremented per image.

---

## 📁 Project structure

```
brandbloom/
├── prisma/
│   └── schema.prisma             # User, Brand, Asset (SQLite/PostgreSQL)
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Landing (URL input)
│   │   ├── login/, register/     # Auth pages
│   │   ├── analyze/page.tsx      # Multi-phase: extract → dashboard → assets
│   │   └── api/
│   │       ├── auth/[...nextauth], auth/register  # NextAuth + sign up
│   │       ├── me/               # GET — current user (credits)
│   │       ├── extract-brand/    # POST — scrape + optional AI; save Brand if logged in
│   │       ├── generate-assets/  # POST — Replicate FLUX; credits check when logged in
│   │       ├── stripe/checkout/  # GET — Stripe Checkout (Buy credits)
│   │       └── webhooks/stripe/  # POST — Stripe webhook (add credits)
│   ├── components/               # Header (credits, sign in/out), Hero, ...
│   └── lib/                      # db.ts, auth.ts, brand-scraper, ai-generator, ai-brand-analysis
├── docs/
│   ├── AI_BRAND_GENERATOR_COMPLETE_GUIDE.md  # Architecture, DB schema idea, env
│   ├── DEVELOPMENT_ROADMAP.md                # 8-week roadmap
│   └── DEPLOYMENT_GUIDE.md                    # Local + Vercel
├── public/
└── package.json
```

---

## 🛠️ Tech stack

### Current
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (REST)
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Auth**: NextAuth (Credentials, JWT)
- **Payments**: Stripe (one-time "Buy credits" + webhook)
- **Brand extraction**: HTML/CSS parsing; optional OpenAI for personality/tone
- **Image generation**: Replicate — FLUX Schnell (~$0.003/image)

### Roadmap
- **Cache / queue**: Redis, BullMQ (background workers)
- **Storage**: Cloudflare R2
- **Hosting**: Vercel; workers on Railway/Render

---

## 💻 Development

### Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### API keys

| Key | Required | Purpose |
|-----|----------|---------|
| **REPLICATE_API_TOKEN** | For real images | FLUX Schnell via [Replicate](https://replicate.com/account/api-tokens) |
| **OPENAI_API_KEY** | Optional | Brand personality/tone via GPT-4o-mini |

---

## 🚀 Deployment

- **Vercel**: Connect repo, set `REPLICATE_API_TOKEN` (and optionally `OPENAI_API_KEY`) in Environment Variables, deploy.
- **Full steps**: See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

---

## 🎯 Roadmap

### ✅ Phase 1 — MVP (current)
- [x] Brand scraping (meta, colors, logos, fonts)
- [x] Optional AI brand personality (OpenAI)
- [x] AI image generation (Replicate FLUX)
- [x] Multi-phase UX (extract → success → dashboard → assets)
- [x] Aspect ratio & curated aesthetics

### 🚧 Phase 2 — Enhancement (planned)
- [ ] Auth (Clerk/NextAuth)
- [ ] Database (Prisma + PostgreSQL)
- [ ] Credit system + Stripe
- [ ] Background workers (BullMQ + Redis)
- [ ] Template library, batch generation

### 📋 Phase 3 — Advanced (planned)
- [ ] Team collaboration, brand style guide export
- [ ] Optional tRPC, API for developers

Details: [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)

---

## 📚 Documentation

- **[Application analysis (single flow, 100% accurate)](docs/APPLICATION_ANALYSIS.md)** — The one path that runs: which APIs, which files, no mix-up with tRPC/workers
- **[Tech stack (LLM, image, frontend)](docs/TECH_STACK.md)** — OpenAI/Claude, Flux (Replicate), Next.js + React
- **[Complete application summary](docs/COMPLETE_APPLICATION.md)** — What you have, how to run, checklist
- [Complete technical guide](docs/AI_BRAND_GENERATOR_COMPLETE_GUIDE.md) — Architecture, DB schema idea, env
- [Development roadmap](docs/DEVELOPMENT_ROADMAP.md) — 8-week plan
- [Deployment guide](docs/DEPLOYMENT_GUIDE.md) — Local + Vercel

---

## 🤝 Contributing

Contributions are welcome. Open an issue or submit a pull request.

---

## 📝 License

MIT — see [LICENSE](LICENSE) if present.

---

## 🙏 Acknowledgments

- Inspired by [Bloom.ai](https://trybloom.ai)
- Built with [Next.js](https://nextjs.org/) and [Replicate](https://replicate.com/)

---

**Made with ❤️ for brand builders**
#   b r a n d b l o o m 
 
 #   b r a n d b l o o m 
 
 #   b r a n d b l o o m 
 
 