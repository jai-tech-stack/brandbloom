# BrandBloom — Development Roadmap

8-week path from current MVP to a Bloom-like product with auth, credits, and polish.

---

## Current state (MVP)

- Next.js 14, TypeScript, Tailwind
- Landing page, /analyze multi-phase flow, creation dashboard
- Brand extraction: meta, colors, (optional) logos/fonts and AI personality
- Image generation: Replicate FLUX Schnell (or demo placeholders)
- Aspect ratio, idea cards, curated aesthetics

---

## Week 1–2: Foundation & brand engine

- [ ] **Brand scraper**: Logos (img with logo in src/alt), fonts (Google Fonts + font-family), CSS color extraction
- [ ] **Optional AI analysis**: OpenAI call in extract-brand when `OPENAI_API_KEY` is set; add personality/tone to response and dashboard
- [ ] **Dashboard**: Show fonts and tone in sidebar when present
- [ ] **Tests**: Unit tests for extract-brand and brand-scraper (mock fetch)

---

## Week 3–4: Image generation & storage

- [ ] **AI generator service**: Single place for Replicate (and future DALL-E); used by generate-assets
- [ ] **Prompt quality**: Stronger prompt templates using brand personality and colors
- [ ] **Download**: Download button per asset (blob URL or server proxy)
- [ ] **Persistence (optional)**: Save generated asset URLs to DB when user is logged in (Week 5)

---

## Week 5: Auth & data

- [ ] **Auth**: NextAuth.js (e.g. Google + email)
- [ ] **Database**: Prisma + PostgreSQL (Vercel Postgres or Supabase)
- [ ] **Models**: User, Brand, Asset (see AI_BRAND_GENERATOR_COMPLETE_GUIDE.md)
- [ ] **Flows**: Save brand per user; attach assets to user/brand

---

## Week 6: Credits & payments

- [ ] **Credits**: User.credits; decrement on generation; free tier (e.g. 10 credits)
- [ ] **Stripe**: Products for Pro (e.g. 100 credits/mo), one-time credit packs
- [ ] **Gating**: Check credits before calling generate-assets; show upgrade CTA when 0

---

## Week 7: Polish & scale

- [ ] **Background jobs** (optional): BullMQ + Redis for long-running extraction or batch generation
- [ ] **Storage**: Upload generated images to S3/R2/Cloudflare R2; store URL in DB
- [ ] **Rate limits**: Per-user or per-IP limits on extract-brand and generate-assets
- [ ] **Error handling**: Retry for Replicate; clear messages for missing token / quota

---

## Week 8: Launch

- [ ] **Deploy**: Vercel production; env in dashboard
- [ ] **Monitoring**: Vercel Analytics or similar; log API errors
- [ ] **Docs**: README + docs/ for setup and env
- [ ] **Marketing**: Landing copy, pricing page, simple FAQ

---

## Later (post-launch)

- Template library (social, ads, banners) with previews
- Manual brand editor (adjust colors/fonts)
- Batch generation (multiple prompts at once)
- Team workspaces and brand kits
- Asset variations (sizes/formats) and background removal
