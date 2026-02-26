# Which API Key to Use First (Flux, Freepik, Anthropic)

Recommendation: **use REPLICATE_API_TOKEN (Flux) for real images first, then ANTHROPIC_API_KEY + BACKEND_BLOOM_URL for better brand extraction.**

---

## What each key does in this project

| Key | Used by | What you get |
|-----|--------|--------------|
| **REPLICATE_API_TOKEN** | `/api/generate-assets` → `@/lib/ai-generator` | **Real AI-generated images** (FLUX Schnell). Primary image provider; no Python image server needed. |
| **ANTHROPIC_API_KEY** | Brand BLOOM+ backend (`backend/api/` on 8000) | **Better brand extraction** (colors, fonts, logo from CSS + Claude) and logo/asset prompts. Only used when `BACKEND_BLOOM_URL` is set. |
| **FREEPIK_API_KEY** | Reserved for future use | Optional; for Freepik stock assets or related features. Not required for current flow. |
| **EMERGENT_LLM_KEY** | `backend/server.py` (port 8001) | Optional **fallback** image provider. Only used if Replicate is not configured and the Emergent backend is running. |

So in the **current** wiring:

- **Images** → **REPLICATE_API_TOKEN** (Flux) first; optionally Emergent backend (8001) if no Replicate token.
- **Brand extraction** → Node (basic) or Brand BLOOM+ with **ANTHROPIC_API_KEY** when `BACKEND_BLOOM_URL` is set.

---

## Suggested order: Flux first, then Anthropic

### Option A — Fastest: one key for real images (Flux)

- **Add:** `REPLICATE_API_TOKEN` (get it from [Replicate](https://replicate.com)).
- **Result:** Full flow works: extract brand (Node) → generate assets → **real AI images** via Flux. No backend servers required for images.

**Best if:** You want real images with minimal setup (no Python image server).

---

### Option B — Best quality: add Anthropic for extraction

- **Keep:** `REPLICATE_API_TOKEN` for images.
- **Add:** `ANTHROPIC_API_KEY` and `BACKEND_BLOOM_URL=http://localhost:8000`.
- **Run:** Brand BLOOM+ backend: `cd backend && uvicorn api.main:app --reload` (8000).
- **Result:** Same real images (Flux), but **brand extraction** uses Claude + CSS (colors, fonts, logo). Better prompts → better images.

**Best if:** You want trybloom-style extraction and are okay adding Anthropic and running the BLOOM backend.

---

### Option C — Optional: Freepik and Emergent

- **FREEPIK_API_KEY** — Set when you add Freepik features (e.g. stock asset search); not required for current generation.
- **EMERGENT_LLM_KEY** + `backend/server.py` (8001) — Optional fallback if you don’t use Replicate.

---

## Summary recommendation

- **Use REPLICATE_API_TOKEN (Flux) first** for **real AI images** with a single key; no image backend to run.
- **Then add ANTHROPIC_API_KEY + BACKEND_BLOOM_URL** when you want **better brand extraction** (and better prompts).
- **FREEPIK_API_KEY** when you add Freepik integration; **EMERGENT_LLM_KEY** only if you prefer or need the Emergent image backend as fallback.

So: **Flux (Replicate) for images, Anthropic for extraction; Freepik optional.**
