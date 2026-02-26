# Testing BrandBloom – features and modules

Use this checklist to verify all features and modules work.

## Prerequisites

- `npm run dev` (and optionally Replicate token in `.env` for real images)
- Database: `npx prisma db push` or migrations applied
- At least one user (register at `/register`)

---

## 1. Auth

- [ ] **Register** (`/register`): Create account with email + password → redirect to home or login
- [ ] **Login** (`/login`): Sign in → redirect to home (or `callbackUrl` if present)
- [ ] **Login with callback**: Open `/analyze?url=https://example.com` while logged out → redirect to login → after sign-in, land back on `/analyze?url=...`
- [ ] **Session**: After login, reload app → still logged in; Header shows user state

---

## 2. Home & entry

- [ ] **Home** (`/`): Enter URL, click “Analyze” → redirect to `/analyze?url=...` (or login if not signed in)
- [ ] **Dashboard link**: From home or header, go to `/dashboard` (requires login)

---

## 3. Brand extraction (analyze flow)

- [ ] **Extraction**: On `/analyze?url=https://example.com` (logged in), extraction runs automatically; steps tick (Understanding the brand, Mapping visual patterns, etc.)
- [ ] **Success**: When extraction completes → “Brand identity generated” and “Let’s Begin”
- [ ] **Failure**: Use invalid URL or unreachable site → error message and “Try again”
- [ ] **Re-analyze**: From create phase sidebar, “Re-analyze brand from URL” → back to extraction with same URL
- [ ] **No redirect to login**: After extraction completes, you stay on analyze (no unexpected sign-in redirect)

---

## 4. Brand kit (sidebar)

- [ ] **Identity**: Logo or initial, Website, Description, Tagline shown when present
- [ ] **Design language**: Colors (swatches), Fonts (with “Aa Bb Cc” when fonts detected), Tone (chips), Aesthetic paragraph
- [ ] **Deep analysis** (when LLM keys set): Values, Target audience, Key messages appear when returned

---

## 5. Create & ideas

- [ ] **Prompt input**: Type in “What will you create?”, choose aspect ratio, click Create → request sent (401 → redirect to login with callback)
- [ ] **Idea cards**: Click any idea (e.g. “LinkedIn Post”, “Product Launch”) → prompt filled and generation starts
- [ ] **Curated aesthetics**: Click a style (e.g. “Minimal & Clean”) → generation with that style prompt
- [ ] **Upload image**: Paste image URL, “Turn into branded asset” → upload flow (or error if API fails)

---

## 6. Generation & assets

- [ ] **Generation**: After Create, assets load (or demo placeholders if no Replicate token)
- [ ] **Empty result**: If no images generated → “No images generated” and “Back to Create” (no blank page)
- [ ] **Assets view**: When assets exist → grid, Download (PNG/JPG/WebP), “Download All”, “Create more”
- [ ] **Resize for platforms**: Choose platform (e.g. Instagram Story) → new asset in same style
- [ ] **Create variation**: “Create variation” → new asset; both stay in list
- [ ] **Credits**: If credits run out → 402 and error message; no crash

---

## 7. Dashboard

- [ ] **Brands tab**: Lists brands; color swatches and link to analyze (or brand detail if implemented)
- [ ] **Assets tab**: Lists user assets; download works
- [ ] **Delete brand**: Confirm → brand removed (and assets unlinked or removed per schema)
- [ ] **Delete asset**: Confirm → asset removed from list
- [ ] **401**: If session expired, dashboard fetches return 401 → redirect to login with `callbackUrl=/dashboard`

---

## 8. API routes (smoke)

- `GET /api/features` → `{ realImagesAvailable: boolean }`
- `POST /api/extract-brand` with `{ url }` + session → brand object or 401/4xx
- `POST /api/generate-assets` with `{ url, brand, ... }` + session → `{ assets, credits? }` or 401/402/500
- `POST /api/upload-asset` with `{ imageUrl, brand }` + session → `{ url, label }` or 401/4xx
- `GET /api/brands` with session → `{ brands }` or 401
- `GET /api/assets` with session → `{ assets }` or 401
- `DELETE /api/brands/[id]` with session → 200 or 401/404
- `DELETE /api/assets/[id]` with session → 200 or 401/404

---

## 9. Lint & build

- `npm run lint` → no errors (warnings acceptable)
- `npm run build` → completes (note: Prisma generate can hit EPERM on Windows if another process holds the DB; close other Node processes and retry)

---

## 10. TryBloom parity QA

- [ ] **End-to-end parity**: URL -> extraction -> review/approve -> create -> assets -> dashboard library without forced login loop
- [ ] **Idea card parity**: Clicking any idea module triggers generation directly and stays in flow
- [ ] **Editor parity**: In assets view, selected asset shows editable prompt panel and export buttons
- [ ] **Library continuity**: From dashboard asset, Open should return to analyze with project context (`brandId`, prompt, stage)
- [ ] **Persistence parity**: Refresh dashboard and confirm generated assets still render from stored real `url`

---

## 11. Quick smoke (no UI)

1. Start dev server: `npm run dev`
2. Register or log in in browser; copy session cookie if needed.
3. `curl -X POST http://localhost:3000/api/extract-brand -H "Content-Type: application/json" -d "{\"url\":\"https://example.com\"}"` (with cookie) → 200 + brand JSON or 401.
4. `curl http://localhost:3000/api/features` → `{"realImagesAvailable":false}` (or true if token set).
5. `npm run test:integration` (optional env: `AUTH_COOKIE=...`) for automated route smoke.

This covers the main features and modules; run through the list after changes to confirm nothing is broken.
