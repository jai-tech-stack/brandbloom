# Deploy BrandBloom (free tier)

Your app is **one Next.js codebase**: API routes are the backend, so you deploy once and get both frontend and backend live.

**Already done in this repo:** Prisma is set to PostgreSQL and `vercel.json` is configured. You only need to create the database and deploy.

## Option 1: Vercel (app) + Neon (database) — recommended

**Free tier:** Vercel hobby + Neon free Postgres. No credit card for Vercel hobby; Neon free tier is generous.

### 1. Database (Neon)

**Option A — Neon CLI (recommended)**

From your project root:

```bash
npx neonctl@latest init
```

When prompted, log in to Neon (browser) if needed. The CLI will create a project and output a **connection string**. Copy it and add to your `.env`:

```env
DATABASE_URL="postgresql://…"   # paste the connection string from neonctl
```

If `neonctl init` already wrote to `.env`, ensure the variable is named `DATABASE_URL`. Then run:

```bash
npx prisma generate
npx prisma db push
```

**Option B — Neon dashboard**

1. Go to [neon.tech](https://neon.tech) and sign up (free).
2. Create a new project and copy the **connection string** from the dashboard.
3. Put it in your `.env` as `DATABASE_URL`, then run the same two commands above.

### 2. Deploy on Vercel

1. Push your code to GitHub (if you haven’t already).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo.
3. **Environment variables** (Project → Settings → Environment Variables). Add:

| Name | Value | Notes |
|------|--------|--------|
| `DATABASE_URL` | Your Neon connection string | Required |
| `NEXTAUTH_SECRET` | Random string (e.g. `openssl rand -base64 32`) | Required |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Replace with your Vercel URL after first deploy |

Optional (app works without them, with limited features):

- `REPLICATE_API_TOKEN` — image generation
- `OPENAI_API_KEY` — logo / AI flows
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY` + etc. — payments

4. **Build command:** `prisma generate && next build` (or leave default if it already runs `prisma generate`).
5. Deploy. Vercel will build and host both your frontend and API routes (backend).

### 3. After first deploy

- Set `NEXTAUTH_URL` to your real URL (e.g. `https://brandbloom.vercel.app`) and redeploy if you changed it.
- In Neon dashboard you can run SQL or use Prisma Studio locally with `DATABASE_URL` pointing at Neon.

---

## Option 2: Render (one free web service)

**Free tier:** One Web Service + optional free Postgres (90 days, then paid).

1. [render.com](https://render.com) → New → Web Service.
2. Connect repo, set:
   - **Build:** `npm install && npx prisma generate && npm run build`
   - **Start:** `npm start`
3. Add a **PostgreSQL** database (Render dashboard), then use its **Internal URL** as `DATABASE_URL`.
4. In `prisma/schema.prisma` set `provider = "postgresql"` and `url = env("DATABASE_URL")`, then run `prisma db push` locally with that URL.
5. In Render Web Service → Environment, add `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (e.g. `https://your-service.onrender.com`).

---

## Summary

- **Backend + frontend:** One Next.js app on Vercel (or Render). No separate backend server.
- **Database:** Use Neon (or Render Postgres) with `provider = "postgresql"` in Prisma; run `prisma db push` before or after first deploy.
- **Env:** At minimum set `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` for auth to work live.
