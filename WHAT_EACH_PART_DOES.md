# What the Backend, Frontend, and Other Parts Do

Quick reference for what each part of the project is responsible for.

---

## Backend (Python services in `backend/`)

There are **two** separate backends in the same folder.

### 1. Brand BLOOM+ API — `backend/api/` (port 8000)

**What it does:** Trybloom.ai-style AI for **brand identity** and **prompts**. It does **not** generate image pixels; it analyzes websites and produces data and text for other tools.

| Responsibility | How |
|----------------|-----|
| **Brand extraction** | Fetches a website URL, parses HTML/CSS (colors, fonts, logo image URL), then uses **Claude** to refine into a brand profile: primary/secondary colors, fonts, style, mood, logo_url. |
| **Logo generation** | Takes a brand profile → produces a **logo strategy** (positioning, attributes, style direction) and **concept prompts** (text prompts you could send to an image model). No image output itself. |
| **Asset prompts** | Takes brand profile + type/dimensions/copy → produces **one on-brand image prompt** (e.g. for Flux/Replicate) and suggested formats. Again, text only. |
| **Design system** | Takes brand profile → produces a **style guide** (colors, typography, logo usage). |
| **Agentic entry** | One endpoint that routes requests to the right agent (brand onboarding, logo, or asset). |

**Run:** `cd backend && uvicorn api.main:app --reload`  
**Needs:** `ANTHROPIC_API_KEY` in env.  
**Used by:** Next.js when `BACKEND_BLOOM_URL=http://localhost:8000` is set (then `/api/extract-brand` calls this for extraction). The `frontend/lib/api.ts` client is also built for this API.

---

### 2. Image generator — `backend/server.py` (port 8001)

**What it does:** **Generates actual images** from a text prompt. One job only: prompt in → image (e.g. base64/data URL) out.

| Responsibility | How |
|----------------|-----|
| **Image generation** | Receives `{ "prompt": "...", "session_id": "..." }` → calls **emergentintegrations** (Gemini-based model) → returns image URL or error. |

**Run:** `python backend/server.py` (or uvicorn on port 8001).  
**Needs:** `EMERGENT_LLM_KEY` in env.  
**Used by:** Next.js route `/api/generate-assets`, which calls `http://localhost:8001/api/generate-image` when the user generates assets on the analyze page. If this backend is down or the key is missing, the app shows “Demo mode” with placeholder images.

---

## Frontend (what the user sees and uses)

### Main app — `src/` (Next.js, port 3000)

**What it does:** The **only app that runs in the browser**. It handles UI, auth, saving brands/assets, and calling the backends.

| Responsibility | How |
|----------------|-----|
| **Homepage** | Hero (URL input), “Everything you need to look like a big brand” (5 feature cards), How it works, Gallery, Pricing, FAQ, Footer. Submit URL → redirects to `/analyze?url=...`. |
| **Analyze flow** | One flow: extract brand → “Let’s begin” → create assets. Calls **Next.js API routes** (not the browser calling Python directly). |
| **Brand extraction** | Calls `POST /api/extract-brand` (Next.js). That route either: (a) calls the **Brand BLOOM+ backend** (port 8000) if `BACKEND_BLOOM_URL` is set, or (b) uses the **Node** scraper + AI in `src/lib/`. Result is shown and optionally saved to DB. |
| **Asset generation** | Calls `POST /api/generate-assets` (Next.js). That route builds a prompt and calls the **image backend** (port 8001). If that fails, it returns placeholder images and “Demo mode”. |
| **Auth** | NextAuth: login, register, session. Protects dashboard, credits, saved brands/assets. |
| **Data** | Prisma: User, Brand, Asset. Stores brands and assets when the user is logged in; credits for generation. |
| **Payments** | Stripe: checkout and webhooks (optional). |
| **Dashboard** | Logged-in view of brands and assets (and credits if using Stripe). |

**Run:** `npm run dev` from repo root (Next.js runs from root; app code lives in `src/`).

---

### API client only — `frontend/`

**What it does:** **Not a second app.** It’s a **small client library** for the Brand BLOOM+ backend (port 8000): helper functions to call `analyze`, `logo`, `asset`, and health.

| Responsibility | How |
|----------------|-----|
| **Talk to Brand BLOOM+ API** | `analyzeBrandUrl(url)`, `generateLogo(profile)`, `createAsset({...})`, `checkBackendHealth()`. All target `NEXT_PUBLIC_API_URL` or `http://localhost:8000`. |

Used when you want a React/Next app to call the Brand BLOOM+ backend directly. The **main app in `src/`** does not use this file today; it uses the Next.js route `/api/extract-brand`, which can *internally* call the same backend when `BACKEND_BLOOM_URL` is set.

---

## Other (supporting pieces)

| Part | What it does |
|------|----------------|
| **Prisma** | Database (SQLite in dev). Stores users, brands, assets, credits. Used by Next.js API routes and server code. |
| **NextAuth** | Login/register/session. Used by `src/` for protected pages and API routes that need the current user. |
| **Stripe** | Optional payments and credits. Webhooks and checkout routes under `src/app/api/`. |
| **tRPC** | Optional API layer (routers under `src/server/api/`). Used if you call tRPC from the client; the main analyze flow uses REST (`/api/extract-brand`, `/api/generate-assets`) instead. |
| **Redis + BullMQ workers** | Optional. If `REDIS_URL` is set, you can run background workers (e.g. brand analysis, image generation) via queues. Not required for the basic flow. |
| **`backend_test.py`** | Script that tests the **Next.js** app at localhost:3000 (extract-brand, generate-assets, brands). Does not test the Python backends directly. |
| **`.env` / `.env.example`** | Config: database, NextAuth, Stripe, `EMERGENT_LLM_KEY` (image backend), `BACKEND_BLOOM_URL` (optional, to use Brand BLOOM+ for extraction), etc. See `ENV_KEYS.md` for the main keys. |

---

## Flow summary

1. **User** opens the app (Next.js in `src/`, port 3000).
2. **User** enters a URL on the homepage → goes to `/analyze?url=...`.
3. **Next.js** calls its own `POST /api/extract-brand`:
   - If `BACKEND_BLOOM_URL` is set → **Brand BLOOM+ backend** (8000) does extraction.
   - Else → **Node** (scraper + AI in `src/lib/`) does extraction.
4. **Next.js** shows the brand and “Let’s begin” → user can generate assets.
5. **Next.js** calls its own `POST /api/generate-assets` → that route calls the **image backend** (8001) to get real images, or returns placeholders (Demo mode).
6. **Prisma** stores brands/assets when the user is logged in; **Stripe** (if configured) handles credits.

So: **frontend** = one Next.js app in `src/` (UI + API routes + auth + DB). **Backend** = two Python services: Brand BLOOM+ (analyze + logo + asset prompts) and image generator (prompt → image). **Other** = DB, auth, payments, workers, tests, env.
