# Image generation setup — Replicate (Flux)

BrandBloom uses **Replicate** for AI image generation. You need an account, a payment method, and an API token.

---

## Which service to use

| Service | Used by BrandBloom? | What to do |
|--------|----------------------|------------|
| **Replicate** | **Yes** — this is what the app uses | Sign up, add billing, create API token, put in `.env` |
| OpenAI (DALL·E) | No | Not used for image gen in this app |
| Anthropic | No (for extraction only) | Optional for brand extraction, not for images |
| Freepik | Optional / future | Not required for current image generation |

**Use Replicate only** for real images in this app.

---

## Step 1: Create a Replicate account

1. Go to **[replicate.com](https://replicate.com)** and click **Sign up**.
2. Sign up with **GitHub** or **email**.
3. Verify your email if asked.

---

## Step 2: Add a payment method (billing)

Replicate charges per run (pay-as-you-go). You must add a payment method before the API will return images.

1. Log in at **[replicate.com](https://replicate.com)**.
2. Open **[replicate.com/account/billing](https://replicate.com/account/billing)** (or click your profile → **Billing**).
3. Click **Add payment method** and add a **card** (credit/debit).
4. Optionally add **prepaid credits** if you prefer not to attach a card (see Replicate’s current options on the billing page).

**Approximate cost:** FLUX Schnell is about **$0.003–0.005 per image**. A few dollars of credit can generate hundreds of images.

---

## Step 3: Create an API token

1. Go to **[replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)**.
2. Click **Create token**.
3. Give it a name (e.g. `BrandBloom`) and create it.
4. **Copy the token** (it starts with `r8_`). You won’t see it again in full.

---

## Step 4: Put the token in your app

1. Open your **project root** (the folder that contains `package.json`).
2. Open or create the **`.env`** file in that folder (not inside `backend/`).
3. Add this line (paste your real token):

   ```env
   REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. Save the file.
5. **Restart the dev server:** stop it with **Ctrl+C**, then run:

   ```bash
   npm run dev
   ```

---

## Step 5: Test

1. In the app: enter a URL → **Let’s begin** → enter a prompt → click **Create**.
2. You should see **real AI-generated images** instead of placeholders.
3. If you still see placeholders, check:
   - Token is in the **root** `.env` (same folder as `package.json`).
   - You **restarted** the app after adding the token.
   - **Billing** is set up on Replicate (payment method or credits).
   - Token is **valid** at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) (no revoke).

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| Still placeholder images | Ensure billing is set up on Replicate and token is in root `.env`; restart app. |
| "401" or "Unauthorized" | Token is wrong or revoked. Create a new token and update `.env`. |
| "402" or "Payment required" | Add a payment method or credits at [replicate.com/account/billing](https://replicate.com/account/billing). |
| Token not read | Use the **root** `.env` only (not `backend/.env`). Restart after changing `.env`. |

---

## Summary

1. **Sign up** at [replicate.com](https://replicate.com).  
2. **Billing:** [replicate.com/account/billing](https://replicate.com/account/billing) → add card or credits.  
3. **Token:** [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) → create → copy.  
4. **App:** Add `REPLICATE_API_TOKEN=r8_...` to the **root** `.env` and **restart** (`npm run dev`).

After that, image generation in BrandBloom will use Replicate and show real images instead of placeholders.
