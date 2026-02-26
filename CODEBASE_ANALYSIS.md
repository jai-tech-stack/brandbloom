# Codebase Analysis — This Repo Is Completely New / Mixed

This document describes the **entire repository**: what exists, how it’s wired, and what’s “new” vs “existing” so you can run or extend it.

---

## 1. Repository layout (high level)

| Path | What it is |
|------|------------|
| **`src/`** | **Main Next.js app** (“BrandBloom — AI Brand Assets”). This is what `npm run dev` runs (root `package.json` points here). |
| **`backend/`** | **Two Python services** in one folder: `api/` (new Brand BLOOM+ API) and `server.py` (image generator). |
| **`frontend/`** | **Only** `lib/api.ts` — API client for the **new** Brand BLOOM+ backend. No Next app, no `app/`, no `package.json`. |
| **Root** | `package.json` (Next.js + Prisma + NextAuth + tRPC), `backend_test.py` (tests Next.js API at localhost:3000), env/config. |

So: the **running app** is under **`src/`**. The **new** trybloom.ai-style backend lives under **`backend/api/`**. The **`frontend/`** folder is only the API client for that new backend.

---

## 2. Main app: `src/` (BrandBloom)

- **Framework:** Next.js 14 (App Router), React 18.
- **Auth:** NextAuth (register, login, session).
- **Data:** Prisma (User, Brand, Asset, etc.), optional Redis + BullMQ workers.
- **Payments:** Stripe (checkout, webhooks).
- **API surface (Next.js API routes):**
  - `POST /api/extract-brand` — Uses **Node** only: `scrapeBrandFromUrl` (lib) + `analyzeBrandWithAI` (lib). Does **not** call the new Python backend.
  - `POST /api/generate-assets` — Builds prompts, calls **Python image service** (e.g. `backend/server.py` or Replicate) for images; can save assets and deduct credits.
  - `GET/POST/DELETE /api/brands`, `/api/assets`, `/api/me`, auth, Stripe, tRPC.
- **Pages:** `/` (home), `/analyze?url=...` (extract → generate assets), `/login`, `/register`, `/dashboard`.
- **Flow:** User enters URL on home → goes to `/analyze?url=...` → extract-brand (Node) → generate-assets (image backend) → show assets.

This app is **not** using the new Brand BLOOM+ backend (`backend/api/main.py`). It has its own extraction and generation pipeline.

---

## 3. Backend: `backend/` (two services)

### 3.1 New Brand BLOOM+ API — `backend/api/main.py`

- **Run:** From repo root, `cd backend && uvicorn api.main:app --reload` (default port **8000**).
- **Stack:** FastAPI, Anthropic Claude, httpx, BeautifulSoup.
- **Purpose:** trybloom.ai-style: **brand extraction**, **logo generation**, **asset prompts**, **agentic** entrypoint.

**Routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/health` | GET | Health check. |
| `/api/brands/analyze` | POST | Body `{ "url": "https://..." }`. **BrandAnalyzer** agent: fetch URL, parse CSS (colors/fonts), find logo URL, Claude refines. Returns `primary_colors`, `secondary_colors`, `fonts`, `style`, `mood`, `logo_url`, etc. |
| `/api/generations/logo` | POST | Body: brand profile. **LogoGeneratorAgent**: strategy → concepts (prompts). Returns `strategy`, `concepts`. |
| `/api/generations/asset` | POST | Body: `brand_profile`, `asset_type`, `dimensions`, `copy_text`. **AssetCreatorAgent**: on-brand prompt + suggested formats. |
| `/api/generations/design-system` | POST | Body: brand profile. **DesignSystemAgent**: style guide + tokens. |
| `/api/agentic/run` | POST | Body: `{ "request_type": "brand_onboarding" \| "logo_generation" \| "create_asset", "payload": {...} }`. **Coordinator** dispatches to the right agent/workflow. |
| `/api/tools/*` | various | Stubs (upload-transform, quality, research, resizer). |

**Agents (under `backend/agents/`):**

- **BrandAnalyzer** — `analyze_website(url)` → colors, fonts, logo_url, style, mood (Claude + CSS/HTML parsing).
- **LogoGeneratorAgent** — strategy, concepts, critique (concepts returned; image gen can be added later).
- **AssetCreatorAgent** — prompt from profile (explicit colors/style/fonts/mood).
- **DesignSystemAgent** — style guide from profile.
- **Coordinator** — `route_and_run(type, payload)` for agentic routing.

**Dependencies:** `backend/requirements.txt` (FastAPI, uvicorn, anthropic, httpx, beautifulsoup4, python-dotenv, pydantic). **Env:** `ANTHROPIC_API_KEY` (required).

This backend is **completely new** relative to the existing Next.js flow; nothing in `src/` calls it yet.

### 3.2 Image generator — `backend/server.py`

- **Run:** e.g. `python backend/server.py` or `uvicorn` on port **8001** (see `if __name__ == "__main__"`).
- **Purpose:** Single endpoint `POST /api/generate-image` (prompt + optional session_id). Uses **emergentintegrations** (Gemini Nano Banana) to generate images; returns data URL or error.
- **Env:** `EMERGENT_LLM_KEY`.
- **Used by:** The existing Next.js app’s asset generation flow (e.g. `src/app/api/generate-assets/route.ts` can call this or another image API).

So you have **two** backends in one folder: **Brand BLOOM+ API** (port 8000) and **Image generator** (port 8001).

---

## 4. Frontend: `frontend/`

- **Contents:** Only **`frontend/lib/api.ts`**.
- **Role:** Client for the **new** Brand BLOOM+ backend (port 8000):
  - `analyzeBrandUrl(url)` → `POST /api/brands/analyze`
  - `generateLogo(brandProfile)` → `POST /api/generations/logo`
  - `createAsset({ brand_profile, ... })` → `POST /api/generations/asset`
  - `checkBackendHealth()` → `GET /health`
- **No** Next.js app here: no `app/`, no `package.json`, no pages. So **`frontend/`** is a **library slice** for the new backend, not a runnable app. The runnable app is **`src/`**.

---

## 5. Tests and scripts

- **`backend_test.py`** — Hits **Next.js** at `localhost:3000`: `/api/extract-brand`, `/api/generate-assets`, `/api/brands`. So it tests the **existing** Node-based extraction and Next.js API, **not** the new Python Brand BLOOM+ API.

---

## 6. Data flow summary

- **Current (existing) flow:**  
  Browser → **Next.js (src/)** → `/api/extract-brand` (Node scraper + AI) → `/api/generate-assets` (image backend, e.g. server.py or Replicate) → DB (Prisma) and UI.

- **New (Brand BLOOM+) flow (not wired into UI yet):**  
  Would be: Browser → **Some Next app** → **`frontend/lib/api.ts`** → **Python backend (backend/api/main.py)** → `/api/brands/analyze`, `/api/generations/logo`, `/api/generations/asset` or `/api/agentic/run`.

---

## 7. What’s missing to run “the new” stack end-to-end

1. **A UI that uses the new backend**  
   Either:
   - Use the **existing** app in `src/` and add pages (or adapt `/analyze`) to call the **new** backend (e.g. proxy to `http://localhost:8000` or call it from server actions/API routes using `frontend/lib/api.ts` logic), or  
   - Add a **new** Next.js app (e.g. under `frontend/` or another dir) that uses `frontend/lib/api.ts` and talks to `backend/api/main.py`.

2. **Env and run order**  
   - **New backend:** `cd backend`, `pip install -r requirements.txt`, set `ANTHROPIC_API_KEY`, run `uvicorn api.main:app --reload` (8000).  
   - **Existing app:** Root `npm run dev` (Next.js on 3000).  
   - **Image gen (if you keep it):** Run `backend/server.py` (8001) and set `EMERGENT_LLM_KEY`.

3. **Clarify which “codebase” is “the” one**  
   - If “this completely new” means **only** the trybloom.ai-style backend and client: that’s **`backend/api/`** + **`frontend/lib/api.ts`**; the rest (src/, server.py, backend_test.py) is the **existing** BrandBloom app and image service.  
   - If you want **one** product: either migrate the existing app to use the new backend for extraction/logo/asset, or replace the existing flow with a new app that uses `frontend/lib/api.ts` and `backend/api/main.py` only.

---

## 8. Quick reference: where things live

| What | Where |
|------|--------|
| Next.js app (pages, UI) | `src/app/` |
| Next.js API routes (extract-brand, generate-assets, brands, auth, …) | `src/app/api/` |
| Brand extraction (existing, Node) | `src/lib/brand-scraper.ts`, `src/lib/ai-brand-analysis.ts` |
| New Brand BLOOM+ API (Python) | `backend/api/main.py` + `backend/api/routes/*.py` |
| New backend agents | `backend/agents/*.py` |
| New backend workflows | `backend/workflows/*.py` |
| New backend services | `backend/services/anthropic_client.py` |
| Image generator (Python) | `backend/server.py` |
| API client for new backend | `frontend/lib/api.ts` |
| Root Next/Prisma/config | Root `package.json`, Prisma schema, etc. |

This is the full analysis of the codebase: **the repo is “completely new” in the sense that the Brand BLOOM+ backend and its client are new and separate from the existing BrandBloom app in `src/`; the rest is the existing system.**
