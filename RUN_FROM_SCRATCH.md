# Run BrandBloom from scratch

Use this checklist so sign-in, sign-up, brand extraction, and asset generation work as expected.

---

## 1. Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+ (only if you run the optional Python backends)

---

## 2. Install and database

From the project root:

```bash
npm install
```

Copy env and set **required** keys:

```bash
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | e.g. `file:./dev.db` for SQLite |
| `NEXTAUTH_SECRET` | Yes | Any random string (e.g. `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` in dev |

Create the database and generate Prisma client:

```bash
npx prisma generate
npx prisma db push
```

---

## 3. Run the app

```bash
npm run dev
```

Open **http://localhost:3000**.

- **Home** → Enter a URL (e.g. `https://stripe.com`) → you’re sent to `/analyze?url=...`.
- **Extract** runs automatically (Node scraper; no extra keys needed).
- **Let’s Begin** → Create assets. Without an image key you get **demo mode** (placeholders).

---

## 4. Sign up / Sign in

- **Sign up**: `/register` → email, password (min 8 chars), optional name. Creates user and signs you in.
- **Sign in**: `/login` → email + password. Session is stored in a JWT (email is normalized to lowercase).

**If auth “doesn’t work”:**

- Ensure `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set in `.env`.
- After changing auth code, sign out and sign in again (old JWTs don’t have the new fields).

---

## 5. Optional: real AI images (Flux)

To get real AI-generated images instead of placeholders:

1. Get a token from [Replicate](https://replicate.com).
2. In `.env` add: `REPLICATE_API_TOKEN=your_token`
3. Restart `npm run dev`. No extra server needed.

Asset generation will use Flux (Replicate). If the token is missing, the app falls back to demo placeholders.

---

## 6. Optional: better brand extraction (Brand BLOOM+)

For more accurate colors, fonts, and logo (trybloom-style):

1. In `backend/`: create a venv, install deps, set `ANTHROPIC_API_KEY` in `backend/.env`.
2. Run: `cd backend && uvicorn api.main:app --reload` (port 8000).
3. In **root** `.env` add: `BACKEND_BLOOM_URL=http://localhost:8000`
4. Restart the Next.js app. `/api/extract-brand` will use the Python backend.

---

## 7. Optional: image backend (Emergent) as fallback

Only if you don’t use Replicate and want a second image source:

- Set `EMERGENT_LLM_KEY` in `.env`.
- Run `python backend/server.py` (port 8001).  
The app will try Replicate first, then this backend.

---

## 8. Quick check

| Step | What to do | Expected |
|------|------------|----------|
| 1 | Open http://localhost:3000 | Homepage loads |
| 2 | Enter `https://example.com` and submit | Redirect to `/analyze?url=...` |
| 3 | Wait for extraction | “Brand identity generated” → **Let’s Begin** |
| 4 | Click **Let’s Begin** | Create-assets screen |
| 5 | Enter a prompt and generate | Placeholder images (demo) or real images (if REPLICATE_API_TOKEN set) |
| 6 | Sign up at `/register` | Account created, redirected to home |
| 7 | Sign in at `/login` | Redirected to home, session active |

---

## 9. Troubleshooting

- **“Invalid email or password”**  
  Email is matched case-insensitive. Ensure you’re not mixing another account. Try signing up again with a new email.

- **“Could not fetch URL” / “Could not analyze URL”**  
  The URL must be public and reachable from the server. Use `https://` (or the app will prepend it). If you use Brand BLOOM+, ensure the backend is running on 8000 and `BACKEND_BLOOM_URL` is set.

- **Session lost after login**  
  Ensure `NEXTAUTH_URL` matches the URL you use (e.g. `http://localhost:3000`). Clear cookies and sign in again.

- **Demo mode only**  
  Set `REPLICATE_API_TOKEN` for Flux images. No Python image server required.
