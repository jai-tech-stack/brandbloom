# BrandBloom — Deployment Guide

## Prerequisites

- Node.js 18+
- npm or pnpm
- Replicate account (for real image generation)
- (Optional) OpenAI account for AI brand personality on URL extraction
- **OpenAI account required** for **Start with Logo** (logo-based brand extraction uses GPT-4o vision)

---

## Local development

1. **Clone and install**
   ```bash
   cd brandbloom
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` if present, or create `.env` with:
   ```env
   REPLICATE_API_TOKEN=your_replicate_token
   OPENAI_API_KEY=your_openai_key
   ```
   - Get Replicate token: [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
   - Restart dev server after changing `.env`.

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Verify**
   - **Start with Website**: Enter a public URL → /analyze and extraction. **Start with Logo** requires `OPENAI_API_KEY` in `.env`; otherwise the logo flow returns an error.
   - In the Create dashboard, click "Create" or an idea card:
     - With `REPLICATE_API_TOKEN`: real FLUX images (may take 1–2 min).
     - Without: demo placeholder images; response header `X-Replicate-Token-Set: false`.

---

## Vercel deployment

1. **Repo**
   - Push code to GitHub/GitLab/Bitbucket.

2. **Vercel**
   - [vercel.com](https://vercel.com) → Import project → select repo.
   - Framework: Next.js (auto-detected).
   - Root directory: `brandbloom` (if repo root is the app) or leave default.

3. **Environment variables**
   - Project → Settings → Environment Variables:
     - `REPLICATE_API_TOKEN` = your token (Production, Preview, Development as needed).
     - `OPENAI_API_KEY` = **required for Start with Logo** (logo extraction); optional for AI brand personality on URL extraction.

4. **Deploy**
   - Deploy; Vercel runs `npm run build` and serves with `next start`.

5. **Checks**
   - Hit your production URL, paste a site URL, run extraction and one generation.
   - If images are placeholders, confirm `REPLICATE_API_TOKEN` is set for the deployed environment and redeploy.

---

## Other platforms

- **Railway / Render / Fly.io**: Build command `npm run build`, start command `npm start`. Set env vars in dashboard.
- **Docker**: Use a Node image, `npm ci`, `npm run build`, `npm start`; expose port 3000.

---

## Post-deploy

- Add custom domain in Vercel (or your host).
- Turn on HTTPS (usually default).
- For production: add auth, database, and Stripe per DEVELOPMENT_ROADMAP.md.
