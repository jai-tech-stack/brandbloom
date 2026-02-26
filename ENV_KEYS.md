# Environment keys — what they do

## Image generation and “Demo mode”

**Primary: REPLICATE_API_TOKEN (Flux)**  
The `/api/generate-assets` route uses **Replicate** (FLUX Schnell) when `REPLICATE_API_TOKEN` (or `REPLICATE_API_KEY`) is set. That gives you **real AI-generated images** without running any Python image server.

**Where it’s used:**
- When you click to **generate assets** on the analyze page, the Next.js route calls `generateImageWithReplicate()` from `@/lib/ai-generator`.
- If the token is **missing**, the route tries the optional Emergent backend at `http://localhost:8001`. If that also fails or isn’t running, it falls back to **demo mode**: placeholder images and `demo: true`.
- The analyze page banner says: set **REPLICATE_API_TOKEN** for real AI images; optional **FREEPIK_API_KEY** and **ANTHROPIC_API_KEY** + **BACKEND_BLOOM_URL** for extraction.

So:
- **With `REPLICATE_API_TOKEN`:** Real AI images via Flux (no need to run `backend/server.py`).
- **Without it:** Either run the Emergent image backend (8001) with `EMERGENT_LLM_KEY`, or you get demo mode (placeholders).

**FREEPIK_API_KEY**  
Optional. Reserved for future Freepik integration (e.g. stock asset search). Not required for current image generation.

**ANTHROPIC_API_KEY + BACKEND_BLOOM_URL**  
Used by the **Brand BLOOM+ backend** (`backend/api/`) for **brand extraction** (Claude + CSS parsing: colors, fonts, logo). When `BACKEND_BLOOM_URL` is set, `/api/extract-brand` uses this backend for better extraction. Does not affect image generation directly.

---

## Other keys (see `.env.example`)

- **NEXTAUTH_*** — Auth for the main app.
- **EMERGENT_LLM_KEY** — Optional. Only used if you run `backend/server.py` (port 8001) as a fallback image provider when Replicate is not configured.
