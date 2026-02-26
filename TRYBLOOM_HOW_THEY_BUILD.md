# How TryBloom builds (research) and how we map to it

Reference: [trybloom.ai](https://www.trybloom.ai/). This doc captures how TryBloom’s pipeline is described and how BrandBloom implements the same flow.

---

## TryBloom’s three-step pipeline (research)

TryBloom’s stack is designed to turn raw brand data into polished marketing assets through an automated pipeline:

| Step | What TryBloom does | What we call it |
|------|--------------------|------------------|
| **1. Scanning & extraction** | User enters URL → AI instantly scans the website to identify **core brand identity markers**. | **Extract brand** — we fetch the URL and parse HTML/CSS (and optionally call the Python backend for full AI extraction). |
| **2. Visual data analysis** | **Computer vision + ML** to accurately extract **logos, color palettes, fonts**. Analyzes **“design aesthetic”** so generated assets match the original brand’s style. | **Brand data** — we extract logos (img/links), colors (Elementor/WP/Bootstrap/generic CSS variables), fonts (Google Fonts, font-face, font-family). “Design aesthetic” = our **personality/tone** (AI step or Python backend with Claude). |
| **3. Asset generation** | Once brand DNA is “cracked,” **generative AI** produces on-brand social posts, ads, **4K-quality** product shots in seconds. | **Generate assets** — we send full brand context (name, tagline, colors, fonts, description, personality/tone) into the image prompt and use **Replicate (Flux)** for generation; we can target high quality / 4K in the prompt. |

So at a high level we follow the **same pipeline**: scan URL → extract visual + aesthetic data → generate on-brand assets.

---

## TryBloom “cracking” brand DNA — what that implies

- **Scanning & extraction** = get everything we need from the site (markers, structure, styles).
- **Visual data analysis** = logos, color palettes, fonts + **design aesthetic** (so outputs match brand style).
- **Asset generation** = generative AI that uses that “cracked” DNA to produce on-brand assets (social, ads, 4K).

We do the same conceptually: **extract** (HTML/CSS + optional AI/backend) → **represent** as brand data (colors, fonts, logos, tagline, description, personality/tone) → **generate** with that full context in the prompt. No fake brand data.

---

## AI / tech (research) vs what we use

Research mentions the broader “Bloom” ecosystem (e.g. BLOOM 176B, ALiBi, ML, Bloom filters). For **TryBloom the product** (trybloom.ai), the relevant parts are:

- **Extraction / analysis:** Some form of AI + possibly CV/ML to get logos, colors, fonts, and design aesthetic.
- **Generation:** Generative AI for images (on-brand, 4K).

Our stack:

- **Extraction:** Node (HTML/CSS) + optional Anthropic/OpenAI for personality/tone, or **Python backend (Claude)** for full “Bloom learns your brand”–style extraction.
- **Generation:** Replicate (Flux) with a **full brand context** prompt (name, tagline, colors, fonts, description, personality/tone).

So we are **similar in pipeline and intent**: scan → extract visual + aesthetic → generate on-brand. We don’t claim to use the same models (e.g. BLOOM 176B); we aim for **trybloom-level behavior** (same three steps, same quality bar).

---

## Side-by-side summary

| TryBloom (research) | BrandBloom (what we built) |
|---------------------|---------------------------|
| Enter URL → scan site | Enter URL → fetch + extract (Node or backend) |
| Extract logos, colors, fonts | Elementor/WP/Bootstrap/generic CSS + meta + logos from HTML |
| Analyze “design aesthetic” | Personality/tone via AI (Anthropic/OpenAI) or Python backend (Claude) |
| Crack “brand DNA” | Brand object: name, tagline, colors, fonts, description, personality, tone |
| Generate on-brand social, ads, 4K | Replicate (Flux) with full brand context in prompt; 4K-quality wording in prompt |
| No fake data implied | We never pass placeholder brand data; fail → “Try again” |

See `PROJECT_GOAL.md` and `TRYBLOOM_CLONE_STATUS.md` for the product goal and exact parity steps.

---

## TryBloom integration process (research)

TryBloom’s integration is described as a straightforward process that builds a **unified AI-powered brand kit** from your existing digital presence:

| Step | What TryBloom does | BrandBloom |
|------|--------------------|------------|
| **1. Add your website URL** | Enter website address; AI **immediately scans** the site to understand **core brand identity**. | Same: enter URL → we fetch and extract (Node or backend). |
| **2. AI extraction & learning** | System **automatically** extracts **logos, specific hex colors, fonts**. Analyzes **design aesthetic**, **business description**, and **social accounts** to build a **comprehensive brand kit**. | We extract logos, hex colors, fonts, design aesthetic (personality/tone), business description (meta + scraped). We do **not** currently extract or use **social accounts**. |
| **3. Review and configure** | User can **review the pre-filled brand kit** so the “AI Designer” (Debbie) and “AI Copywriter” (Clara) have accurately captured **brand voice and style**. | We show the extracted brand in the sidebar (name, domain, description, tagline, colors, fonts, logo, tone, personality) so the user can **review** before generating. We don’t have named “Debbie”/“Clara” personas. |
| **4. Asset generation** | Once established, **instantly generate 4K-quality on-brand materials**, e.g.: **Marketing visuals** (Instagram carousels, summer sale banners, Google Ads), **corporate identity** (hiring posters, company merchandise), **product content** (product shots, designer-quality visuals). | We generate on-brand images from a prompt + full brand context; 4K wording in prompt. We support marketing/social/ad-style prompts and curated aesthetics; no separate “corporate” vs “product” buckets in UI. |

---

## Key brand management features (research) vs BrandBloom

| TryBloom feature | Description | BrandBloom |
|------------------|-------------|------------|
| **Multi-brand support** | Manage **multiple brand portfolios** at once (agencies, multi-site founders). | **Done:** Dashboard lists all brands per user; user can add multiple URLs (each extraction creates/saves a brand) and switch between them to generate assets. |
| **AI-powered resizing** | Generate an asset **once**, then **click to resize** for different platforms (e.g. Facebook, Instagram Stories). | **Gap:** We only “create from prompt”; no one-click resize to other aspect ratios yet. |
| **Dynamic brand system** | A **“living” brand system** that **updates and stays consistent** across all marketing touchpoints (not static PDFs). | **Partial:** We have a stored brand kit per URL (in DB when logged in) and reuse it for generation. We don’t yet support “update brand and propagate” or export as a living system. |

---

## Summary of new research

- **Business description** → we have it (meta description + scraped content).
- **Social accounts** → we do **not** extract or use them in the brand kit (possible future improvement).
- **Review and configure** → we support review via the create-phase sidebar; no Debbie/Clara personas.
- **Asset types** → we support marketing/social/ad-style generation; no explicit “corporate” or “product” tabs.
- **Multi-brand** → we support it via the dashboard.
- **Resizing** → not implemented.
- **Ideas / feature modules** → **Done:** Categorized idea modules (Social Media, Announcement, Blog & Content, Advertising, Quote Card, Profile Banner, Product Shot, Merchandise) with brand-aware card descriptions and one-click Create.
- **Dynamic/living brand system** → partial (stored brand + generation; no “living” update flow).
