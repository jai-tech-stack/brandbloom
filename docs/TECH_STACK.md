# BrandBloom — Tech Stack

Aligned with how tools like Bloom typically work: **LLM for understanding**, **diffusion model for images**, **React/Next.js for the dashboard**.

---

## LLM provider (brand personality / tone)

**Purpose:** Understand brand voice and style from scraped meta (name, tagline, description, colors) and return short **personality** and **tone** for the dashboard and prompts.

| Provider | Model | Env variable | Notes |
|----------|--------|----------------|-------|
| **OpenAI** | GPT-4o-mini | `OPENAI_API_KEY` | Tried first if set. |
| **Anthropic** | Claude 3 Haiku | `ANTHROPIC_API_KEY` | Used if OpenAI is not set or fails. |

- **Code:** `src/lib/ai-brand-analysis.ts` — `analyzeBrandWithAI()` tries OpenAI, then Anthropic.
- **Optional:** If neither key is set, personality/tone are left empty (scraped data only).

---

## Image generation

**Purpose:** Generate on-brand marketing images from a text prompt + brand context (name, colors, description).

| Provider | Model | Env variable | Notes |
|----------|--------|----------------|-------|
| **Replicate** | **FLUX Schnell** (Black Forest Labs) | `REPLICATE_API_TOKEN` | GPU-backed; same family as Stable Diffusion / Flux. |

- **Code:** `src/lib/ai-generator.ts` — `generateImageWithReplicate()`.
- **Infra:** Replicate runs the model on their infrastructure (NVIDIA GPUs). No self-hosted GPU required.
- **Cost:** ~\$0.003 per image (FLUX Schnell).

Without `REPLICATE_API_TOKEN`, the app runs in **demo mode** (placeholder images).

---

## Frontend / UI

**Purpose:** Smooth dashboard, multi-step flow, and responsive UI.

| Layer | Technology |
|-------|------------|
| **Framework** | **Next.js 14** (App Router) |
| **UI** | **React 18** |
| **Styling** | Tailwind CSS |
| **Fonts** | Next.js Google Fonts (Plus Jakarta Sans, JetBrains Mono) |

- **Code:** `src/app/` (pages, layout), `src/components/` (Header, Hero, analyze flow, etc.).
- **Flow:** Landing → URL input → extract brand (steps + timer) → success screen → create dashboard (sidebar + prompt + aspect ratio + idea cards) → asset grid.

---

## Summary

| Role | Typical choice (e.g. Bloom) | BrandBloom |
|------|-----------------------------|------------|
| **LLM** | OpenAI (GPT) or Anthropic (Claude) | ✅ Both supported (OpenAI first, then Claude) |
| **Images** | Stable Diffusion or Flux (GPU) | ✅ Flux via Replicate (GPU on Replicate) |
| **Frontend** | React or Next.js | ✅ Next.js + React |

All three pillars (LLM, image generation, frontend) are aligned with the stack you described.
