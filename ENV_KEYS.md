# Environment keys — what they do

## Image generation and “Demo mode”

**Primary: REPLICATE_API_TOKEN (Flux)**  
The `/api/generate-assets` route uses **Replicate** (FLUX 1.1 Pro) when `REPLICATE_API_TOKEN` (or `REPLICATE_API_KEY`) is set. That gives you **real premium AI-generated images** without running any Python image server.

**Where it’s used:**
- When you click to **generate assets**, the Next.js route calls `generateImageWithReplicate()` from `@/lib/ai-generator`.
- If the token is **missing**, generation is disabled (no fallback server).
- The analyze page banner says: set **REPLICATE_API_TOKEN** for real AI images; optional **FREEPIK_API_KEY** and **ANTHROPIC_API_KEY** + **BACKEND_BLOOM_URL** for extraction.

So:
- **With `REPLICATE_API_TOKEN`:** Real AI images via Flux.
- **Without it:** Image generation is unavailable.

**FREEPIK_API_KEY**  
Optional. Reserved for future Freepik integration (e.g. stock asset search). Not required for current image generation.

**ANTHROPIC_API_KEY + BACKEND_BLOOM_URL**  
Used by the **Brand BLOOM+ backend** (`backend/api/`) for **brand extraction** (Claude + CSS parsing: colors, fonts, logo). When `BACKEND_BLOOM_URL` is set, `/api/extract-brand` uses this backend for better extraction. Does not affect image generation directly.

---

## Other keys (see `.env.example`)

- **NEXTAUTH_*** — Auth for the main app.
**EMERGENT_LLM_KEY** — Not used. (Image generation uses Replicate only.)
