# Project structure (simplified)

## One app: Next.js at the repo root

- **`src/`** — The whole app: pages, API routes, components, lib. This is your frontend and server (Next.js).
- **`package.json`**, **`next.config.mjs`**, **`prisma/`** — Next.js app config and database. Run with `npm run dev` (port 3000).

There is no separate “frontend” app. Everything you need to run the product is here.

## Optional: Python backend

- **`backend/`** — Optional Python services used only if you want them:
  - **`backend/api/main.py`** — Brand BLOOM+ API (brand extraction, logo, etc.). Run with `uvicorn api.main:app` (port 8000). Used when `BACKEND_BLOOM_URL` is set.
  - **`backend/server.py`** — Small image-generation service (`/api/generate-image`). Run on port 8001 as a fallback when Replicate is not configured.

You can run the Next.js app alone; it uses its own APIs in `src/app/api/` (extract-brand, generate-assets, etc.) and Replicate for images. The Python backend is optional for extra extraction or image fallback.

## Removed / moved

- The old **`frontend/`** folder only contained a BLOOM+ API client. That file is now **`src/lib/bloom-api-client.ts`**. You can delete the empty `frontend/` folder if it still exists.
