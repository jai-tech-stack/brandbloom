# Deploy now (one-time)

1. **Open this link:**  
   **https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjai-tech-stack%2Fbrandbloom&project-name=brandbloom**

2. **Branch:** Choose **release/live**.

3. **Environment Variables** — click "Environment Variables" and add:

   - **DATABASE_URL** = your Neon Postgres URL (from `npx neonctl@latest init` or neon.tech dashboard)
   - **NEXTAUTH_SECRET** = run in terminal and paste the output:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```
   - **NEXTAUTH_URL** = leave empty first time; after first deploy set to `https://YOUR_PROJECT.vercel.app` and redeploy

4. Click **Deploy**.

Done. Your app will be at `https://brandbloom-xxx.vercel.app` (or your project name).
