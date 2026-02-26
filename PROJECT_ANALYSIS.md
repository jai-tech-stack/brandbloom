# Brand BLOOM+ (trybloom.ai) — Project Analysis & Completion

## What Exists Now

### Backend (FastAPI) — `backend/`

| Component | Role |
|-----------|------|
| **Brand extraction** | `POST /api/brands/analyze` — `BrandAnalyzer` fetches URL, parses CSS (hex + rgb + vars), extracts fonts and logo URL, then Claude refines. Returns `primary_colors`, `secondary_colors`, `fonts`, `style`, `mood`, `logo_url`, `logo_description`. |
| **Logo generation** | `POST /api/generations/logo` — `run_logo_generation` → strategy (positioning, attributes, style_direction) → concepts (5 prompts for Flux) → returns strategy + concepts (image gen / critique stubbed). |
| **Asset creation** | `POST /api/generations/asset` — `AssetCreatorAgent` builds brand brief (colors, style, fonts, mood) and generates one Flux-ready prompt + suggested formats. |
| **Design system** | `POST /api/generations/design-system` — `DesignSystemAgent` returns style guide + tokens from profile. |
| **Agentic API** | `POST /api/agentic/run` — `Coordinator.route_and_run(request_type, payload)` dispatches to `brand_onboarding` \| `logo_generation` \| `create_asset`. |
| **Health** | `GET /health`. |
| **Tools** | Stubs for upload-transform, quality, research, resizer. |

### Agents (agentic AI)

- **BrandAnalyzer** — Extracts brand from URL (no browser; httpx + BeautifulSoup + Claude).
- **LogoGeneratorAgent** — Strategy → concepts → critique_and_rank (concepts returned; image gen optional).
- **AssetCreatorAgent** — On-brand prompt from profile (explicit hex colors, style, fonts, mood).
- **DesignSystemAgent** — Style guide + tokens.
- **Coordinator** — Single entry: `route_and_run(type, payload)` for brand_onboarding, logo_generation, create_asset.

### Frontend (Next.js) — `frontend/`

- **`lib/api.ts`** — `analyzeBrandUrl(url)`, `generateLogo(profile)`, `createAsset(...)`, `checkBackendHealth()`.
- If your app lives in **`New folder/frontend`**, point it at the same backend (e.g. `NEXT_PUBLIC_API_URL=http://localhost:8000`) and use the same API helpers there.

## trybloom.ai Flow (Implemented)

1. **Add your website** — User enters URL.
2. **Brand extraction** — `POST /api/brands/analyze` → colors, fonts, logo_url, style, mood.
3. **Learn my brand** — Frontend stores profile (Zustand or API); shows logo, colors, fonts.
4. **Generate assets** — Create (asset prompt), Edit, Resize, Upload, 4K — all can use `POST /api/generations/asset` with brand_profile.
5. **Logo** — `POST /api/generations/logo` → strategy + concepts; frontend can show and optionally send concepts to an image model.

## How to Run

1. **Backend**
   ```bash
   cd backend
   python -m venv venv
   # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   # Set ANTHROPIC_API_KEY in .env or backend/.env
   uvicorn api.main:app --reload
   ```
2. **Frontend** (use your existing Next app in `New folder/frontend` or this repo’s `frontend/`)
   - Set `NEXT_PUBLIC_API_URL=http://localhost:8000` and Clerk keys.
   - Dashboard: no brands → “Add your website” + “Learn my brand” (calls `analyzeBrandUrl`).
   - Create asset: describe + type + dimensions → “Generate prompt” (calls `createAsset`).
   - Logo: select brand → “Generate logo strategy & concepts” (calls `generateLogo`).

## Optional: Use Agentic Endpoint

From the frontend you can call one endpoint for all three flows:

- **Brand onboarding:** `POST /api/agentic/run` with `{ "request_type": "brand_onboarding", "payload": { "url": "https://..." } }`.
- **Logo:** `{ "request_type": "logo_generation", "payload": { "brand_profile": { ... } } }`.
- **Asset:** `{ "request_type": "create_asset", "payload": { "brand_profile": {...}, "asset_type": "social", "dimensions": "1080x1080", "copy_text": null } }`.

This keeps the agentic coordinator as the single entry for backend orchestration.
