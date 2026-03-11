# Deploy BrandBloom (free tier)

Your app is **one Next.js codebase**: API routes are the backend, so you deploy once and get both frontend and backend live.

**Already done:** Code is on GitHub ([jai-tech-stack/brandbloom](https://github.com/jai-tech-stack/brandbloom)), branch **release/live**. Prisma is PostgreSQL, `vercel.json` is set.

---

## Deploy to Vercel (you do this once)

1. **Open this link** (imports this repo into Vercel):  
   **[Deploy BrandBloom to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjai-tech-stack%2Fbrandbloom&project-name=brandbloom&repository-name=brandbloom)**

2. When Vercel asks which branch to use, select **release/live**.

3. Before clicking Deploy, add **Environment Variables** (click "Environment Variables" and add these):

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | Your Neon Postgres URL (from `npx neonctl@latest init` or [neon.tech](https://neon.tech) dashboard) |
   | `NEXTAUTH_SECRET` | Any long random string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and paste) |
   | `NEXTAUTH_URL` | Leave empty on first deploy; after deploy set it to `https://your-project.vercel.app` and redeploy |

4. Click **Deploy**. When it finishes, set `NEXTAUTH_URL` to the live URL and redeploy once.

That’s it — frontend and API are live.

---

## Create a new branch on GitHub and push code (already done)

1. **Create a new repository on GitHub**
   - Go to [github.com/new](https://github.com/new).
   - Repository name: e.g. `brandbloom`.
   - Choose **Public**. Do **not** add a README, .gitignore, or license (you already have them).
   - Create repository.

2. **Connect your local repo and push**
   - GitHub will show a URL like `https://github.com/YOUR_USERNAME/brandbloom.git`. Run these in your project folder (replace the URL with yours):

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/brandbloom.git
   git push -u origin release/live
   ```

   - If you use SSH: `git remote add origin git@github.com:YOUR_USERNAME/brandbloom.git` then the same `git push -u origin release/live`.

3. **Result**
   - Branch `release/live` is on GitHub. You can connect Vercel to this repo and set the production branch to `release/live`.

---

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
- `BACKEND_BLOOM_URL` — full agentic backend (see Railway below) for accurate brand extraction
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY` + etc. — payments

4. **Build command:** `prisma generate && next build` (or leave default if it already runs `prisma generate`).
5. Deploy. Vercel will build and host both your frontend and API routes (backend).

### 3. After first deploy

- Set `NEXTAUTH_URL` to your real URL (e.g. `https://brandbloom.vercel.app`) and redeploy if you changed it.
- In Neon dashboard you can run SQL or use Prisma Studio locally with `DATABASE_URL` pointing at Neon.

---

## Railway: agentic backend (full, accurate generations)

The **Brand BLOOM+ API** (`backend/api/main.py`) is the agentic backend: brand extraction, logo, generations. Deploy it on Railway so the Next.js app can use it for full, accurate flows.

1. **Railway:** New project → Deploy from repo. The repo uses **Docker** (root `Dockerfile`); `railway.json` sets `"builder": "DOCKERFILE"` so Railway builds the backend image from that file (no Nixpacks, no emergentintegrations).
2. **Env on Railway:** Set `ANTHROPIC_API_KEY` (required for the backend). Optionally `FRONTEND_URL` = your Vercel URL.
3. **After deploy:** Copy the Railway service URL (e.g. `https://your-app.up.railway.app`).
4. **Vercel (Next.js app):** Add env var `BACKEND_BLOOM_URL` = that Railway URL (no trailing slash). Redeploy.
5. **Result:** Extract-brand will call the agentic backend for accurate extraction; images still use Replicate (set `REPLICATE_API_TOKEN` on Vercel).

Build no longer installs `emergentintegrations`; the BLOOM+ API uses Anthropic only.

---

## Free servers for the BLOOM+ backend

You can deploy the **BLOOM+ API** (Python/FastAPI in `backend/`) on these free tiers so the Next.js app can use `BACKEND_BLOOM_URL` for full brand extraction.

| Provider   | Free tier notes |
|-----------|------------------|
| **Render** | 1 free Web Service; spins down after ~15 min idle (first request may be slow). |
| **Fly.io** | Free allowance for small VMs; good for always-on APIs. |
| **Railway** | Free trial / usage-based; check [railway.app](https://railway.app) for current plan. |

### Deploy BLOOM+ on Render (free) — step by step

1. **Open Render**  
   Go to [render.com](https://render.com) and sign in (or sign up with GitHub).

2. **Create a new Web Service**  
   Click **New +** → **Web Service**.

3. **Connect the repo**  
   - If this is your first time: click **Connect account** under GitHub and authorize Render.  
   - Under **Connect a repository**, find your **brandbloom** repo and click **Connect**.  
   - Leave **Branch** as `main` (or use `release/live` if that’s your deploy branch).

4. **Configure the service**  
   - **Name:** e.g. `brandbloom-api` (this becomes `https://brandbloom-api.onrender.com`).  
   - **Region:** pick one close to you.  
   - **Root Directory:** leave blank (Dockerfile is in the repo root).  
   - **Environment:** select **Docker**.  
     - Render will detect the root **Dockerfile** and build the BLOOM+ API image.  
   - **Instance Type:** leave as **Free** (or upgrade if you need more resources).

5. **Environment variables**  
   Click **Advanced** → **Add Environment Variable**, then add:

   | Key | Value |
   |-----|--------|
   | `ANTHROPIC_API_KEY` | Your Anthropic API key (required for the backend) |
   | `FRONTEND_URL` | (Optional) Your Next.js app URL, e.g. `https://your-app.vercel.app` |

   Render injects `PORT` automatically; the Dockerfile already uses it.

6. **Deploy**  
   Click **Create Web Service**. Render will build the image (first time may take a few minutes) and start the service.

7. **Get the URL**  
   When the deploy finishes, the service URL is at the top (e.g. `https://brandbloom-api.onrender.com`). Copy it **without** a trailing slash.

8. **Connect the Next.js app**  
   - In **Vercel** (or wherever the Next.js app is hosted): Project → **Settings** → **Environment Variables**.  
   - Add: **Name** `BACKEND_BLOOM_URL`, **Value** the URL you copied (e.g. `https://brandbloom-api.onrender.com`).  
   - Redeploy the Next.js app so it picks up the new variable.

9. **Verify**  
   - Open `https://your-api.onrender.com/health` (or `/docs`) in a browser; you should see the API or Swagger UI.  
   - In your app, run “Extract brand” with a URL; it should call the BLOOM+ backend when `BACKEND_BLOOM_URL` is set.

**Note:** On the free tier, the service **spins down after ~15 minutes of no traffic**. The first request after that can take 30–60 seconds to respond (cold start).

### Deploy BLOOM+ on Fly.io (free)

1. Install [flyctl](https://fly.io/docs/hub/installing-flyctl/) and sign in: `fly auth login`.
2. From the **project root** (where the Dockerfile is):  
   `fly launch`  
   Choose a name, region; when asked for a Dockerfile, use the root one. Don’t add a Postgres DB if you only need the backend.
3. Set secrets:  
   `fly secrets set ANTHROPIC_API_KEY=your_key`  
   Optionally: `fly secrets set FRONTEND_URL=https://your-app.vercel.app`
4. Deploy: `fly deploy`.
5. Copy the app URL (e.g. `https://your-app.fly.dev`) and set it as `BACKEND_BLOOM_URL` on Vercel, then redeploy.

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
