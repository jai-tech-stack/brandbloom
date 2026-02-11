# Deployment Guide - AI Brand Asset Generator

## 📦 Prerequisites

Before deploying, ensure you have:

- **Node.js 18+** installed
- **PostgreSQL database** (Supabase recommended)
- **Redis instance** (Upstash recommended for serverless)
- **OpenAI API key**
- **Stripe account** (for payments)
- **Cloudflare R2** account (for image storage)
- **Vercel account** (for hosting)

---

## 🚀 Step-by-Step Deployment

### 1. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your connection string from Settings → Database
3. Copy the connection string (it should start with `postgresql://`)

### 2. Redis Setup (Upstash)

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the Redis URL from the dashboard

### 3. OpenAI API Setup

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key under API Keys section
3. Copy your API key (starts with `sk-`)

### 4. Cloudflare R2 Setup

1. Log in to Cloudflare dashboard
2. Go to R2 Object Storage
3. Create a new bucket (e.g., `brand-assets`)
4. Go to Manage R2 API Tokens
5. Create API token with edit permissions
6. Save the Access Key ID and Secret Access Key

### 5. Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Go to Developers → API Keys
3. Copy your Secret Key and Publishable Key
4. Create products and prices:
   - **Pro Plan**: $20/month
   - **Business Plan**: $50/month
5. Copy the Price IDs for each plan

### 6. Repository Setup

```bash
# Clone your repository
git clone <your-repo-url>
cd brand-ai-generator

# Install dependencies
npm install

# Set up Prisma
npx prisma generate
npx prisma db push
```

### 7. Environment Variables

Create `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..." # Get this after setting up webhook
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_BUSINESS_PRICE_ID="price_..."

# Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="brand-assets"

# Clerk Auth (or NextAuth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 8. Deploy to Vercel

#### A. Deploy Frontend

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### B. Add Environment Variables in Vercel

1. Go to your project settings in Vercel
2. Navigate to Environment Variables
3. Add all variables from `.env.local`

#### C. Set up Workers (Railway or Render)

**Option 1: Railway**

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Deploy from GitHub
4. Set environment variables
5. Add two services:
   - `brand-analyzer-worker`
   - `image-generator-worker`

Create `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run worker:brand"
  }
}
```

**Option 2: Render**

1. Create account at [render.com](https://render.com)
2. Create Background Worker service
3. Set build command: `npm install && npm run build`
4. Set start command: `npm run worker:brand`
5. Repeat for image generator worker

### 9. Stripe Webhook Setup

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. Copy Webhook Signing Secret
5. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

### 10. Test the Deployment

1. Visit your deployed site
2. Create an account
3. Add a brand (test with your website)
4. Generate an image
5. Test payment flow with Stripe test cards

---

## 📝 package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "worker:brand": "tsx workers/brand-analyzer.ts",
    "worker:image": "tsx workers/image-generator.ts",
    "workers": "concurrently \"npm run worker:brand\" \"npm run worker:image\""
  }
}
```

---

## 🔧 Production Checklist

### Security
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Set up CORS policies
- [ ] Configure rate limiting
- [ ] Enable Stripe webhook signature verification
- [ ] Use environment-specific API keys

### Performance
- [ ] Enable caching for brand data
- [ ] Set up CDN for generated images
- [ ] Optimize image sizes
- [ ] Enable database connection pooling

### Monitoring
- [ ] Set up Sentry for error tracking
- [ ] Enable Vercel Analytics
- [ ] Configure log aggregation (LogDNA, Datadog)
- [ ] Set up uptime monitoring (UptimeRobot)

### Database
- [ ] Set up automated backups
- [ ] Configure read replicas (for scale)
- [ ] Enable query performance insights

### Compliance
- [ ] Add Terms of Service
- [ ] Add Privacy Policy
- [ ] Set up GDPR compliance (for EU users)
- [ ] Configure cookie consent

---

## 🐛 Troubleshooting

### Workers Not Processing Jobs

```bash
# Check Redis connection
redis-cli -u $REDIS_URL ping

# Check worker logs
vercel logs <deployment-url>
```

### Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset
```

### Image Generation Failing

1. Check OpenAI API credits
2. Verify API key is correct
3. Check worker logs for errors
4. Ensure R2 credentials are valid

---

## 📊 Scaling Considerations

### When to Scale

- **5,000+ users**: Add read replicas for database
- **10,000+ generations/day**: Increase worker concurrency
- **High traffic**: Use CDN for static assets
- **Global users**: Deploy workers in multiple regions

### Cost Optimization

1. **Images**: Use Stable Diffusion for bulk generations (cheaper)
2. **Storage**: Set up lifecycle policies to delete old images
3. **Database**: Use connection pooling (PgBouncer)
4. **Workers**: Scale down during off-peak hours

---

## 🔄 Continuous Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 🎉 Post-Deployment

1. **Marketing Setup**
   - Add Google Analytics
   - Set up Meta Pixel (Facebook)
   - Configure email marketing (Resend, SendGrid)

2. **Support**
   - Add Intercom/Crisp chat widget
   - Set up support email
   - Create knowledge base

3. **SEO**
   - Submit sitemap to Google
   - Add meta tags
   - Set up Google Search Console

4. **Community**
   - Create Discord server
   - Set up Twitter account
   - Launch on Product Hunt

---

## 💰 Estimated Monthly Costs

### Minimum (0-100 users)
- Vercel: $0 (Hobby plan)
- Supabase: $0 (Free tier)
- Upstash Redis: $0 (Free tier)
- Railway Workers: $5/month
- Cloudflare R2: $1-5/month
- **Total: ~$10/month**

### Growth (100-1,000 users)
- Vercel: $20/month (Pro)
- Supabase: $25/month
- Upstash Redis: $10/month
- Railway Workers: $20/month
- Cloudflare R2: $10-20/month
- OpenAI API: Variable (depends on usage)
- **Total: ~$100-150/month**

### Scale (1,000-10,000 users)
- Vercel: $20/month
- Supabase: $100/month
- Upstash Redis: $40/month
- Railway Workers: $100/month
- Cloudflare R2: $50/month
- OpenAI API: Variable
- **Total: ~$400-600/month**

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Guides](https://www.prisma.io/docs)
- [Stripe Integration](https://stripe.com/docs/payments)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [BullMQ Guide](https://docs.bullmq.io/)

---

Need help? Create an issue or reach out to support@yourapp.com
