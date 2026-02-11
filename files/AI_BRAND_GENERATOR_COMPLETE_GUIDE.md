# AI Brand Asset Generator - Complete Development Guide

## 🎯 Project Overview

Build a SaaS platform like Bloom.ai that:
1. Analyzes websites to extract brand identity
2. Generates on-brand marketing assets using AI
3. Provides credit-based subscription model
4. Delivers production-ready images for social media, ads, etc.

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Development Phases](#development-phases)
5. [Complete Code Implementation](#complete-code-implementation)
6. [Deployment Strategy](#deployment-strategy)
7. [Cost Analysis](#cost-analysis)
8. [Scaling Strategy](#scaling-strategy)

---

## 🛠 Tech Stack

### Frontend
- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Shadcn/ui** (Component library)
- **Framer Motion** (Animations)
- **Zustand** (State management)
- **React Query** (Server state)

### Backend
- **Next.js API Routes** (Serverless functions)
- **tRPC** (Type-safe API)
- **Prisma** (ORM)
- **PostgreSQL** (Database)
- **Redis** (Caching & Queue)
- **BullMQ** (Job queue)

### AI/ML Services
- **OpenAI API** (GPT-4 for analysis, DALL-E 3 for images)
- **Anthropic Claude** (Alternative for text analysis)
- **Replicate** (Stable Diffusion, Flux models)
- **Hugging Face** (Open source models)

### Infrastructure
- **Vercel** (Frontend hosting)
- **Railway/Render** (Backend services)
- **Supabase** (PostgreSQL + Storage)
- **Cloudflare R2** (Image storage)
- **Upstash Redis** (Serverless Redis)

### Payment & Auth
- **Stripe** (Payments)
- **Clerk** or **NextAuth.js** (Authentication)
- **Resend** (Transactional emails)

### Monitoring
- **Sentry** (Error tracking)
- **Vercel Analytics**
- **PostHog** (Product analytics)

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Landing Page│  │  Dashboard   │  │  Generator   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ tRPC API
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    API Layer (Next.js API)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Brand Scraper│  │AI Generation │  │  Payments    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────┬───────────────────┬───────────────────┬────────────┘
         │                   │                   │
         │                   │                   │
┌────────▼──────┐  ┌─────────▼────────┐  ┌──────▼────────┐
│  Job Queue    │  │  PostgreSQL DB   │  │    Stripe     │
│   (BullMQ)    │  │    (Prisma)      │  │               │
└────────┬──────┘  └──────────────────┘  └───────────────┘
         │
         │
┌────────▼──────────────────────────────────────────────────┐
│                   Background Workers                       │
│  ┌────────────────┐  ┌────────────────┐                  │
│  │ Website Scraper│  │ Image Generator│                  │
│  │   (Puppeteer)  │  │  (OpenAI/SD)   │                  │
│  └────────────────┘  └────────────────┘                  │
└────────┬──────────────────────┬───────────────────────────┘
         │                      │
         │                      │
┌────────▼──────┐      ┌────────▼──────────┐
│  Redis Cache  │      │  R2 Storage       │
│               │      │  (Generated Imgs) │
└───────────────┘      └───────────────────┘
```

---

## 💾 Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  imageUrl      String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  credits       Int       @default(10) // Free tier credits
  
  subscriptionId String?  @unique
  subscription   Subscription?
  
  brands        Brand[]
  generations   Generation[]
}

model Subscription {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  stripeCustomerId       String?  @unique
  stripeSubscriptionId   String?  @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  
  plan            String   // 'free', 'pro', 'business', 'enterprise'
  status          String   // 'active', 'canceled', 'incomplete', 'past_due'
  
  monthlyCredits  Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Brand {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  websiteUrl  String
  name        String?
  
  // Extracted brand data
  logoUrls    String[] // Array of logo URLs
  colors      Json     // { primary: '#...', secondary: '#...', palette: [...] }
  fonts       Json     // { primary: 'Font Name', secondary: 'Font Name' }
  
  // AI-analyzed data
  brandPersonality  String? // Tone, voice, style
  designStyle       String? // Modern, minimalist, bold, etc.
  industry          String?
  
  status      String   @default("processing") // processing, ready, failed
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  generations Generation[]
  
  @@index([userId])
}

model Generation {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  brandId     String
  brand       Brand    @relation(fields: [brandId], references: [id], onDelete: Cascade)
  
  prompt      String
  imageUrl    String?
  
  // Generation parameters
  model       String   // 'dall-e-3', 'stable-diffusion', etc.
  size        String   @default("1024x1024")
  style       String?  // 'photorealistic', 'illustration', 'minimal', etc.
  
  status      String   @default("pending") // pending, processing, completed, failed
  errorMessage String?
  
  creditsUsed Int      @default(1)
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([brandId])
}

model CreditTransaction {
  id          String   @id @default(cuid())
  userId      String
  
  amount      Int      // Positive for additions, negative for usage
  type        String   // 'purchase', 'subscription', 'generation', 'refund'
  description String?
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
}
```

---

## 🚀 Development Phases

### Phase 1: Project Setup (Week 1)
### Phase 2: Authentication & User Management (Week 1-2)
### Phase 3: Brand Scraping Engine (Week 2-3)
### Phase 4: AI Image Generation (Week 3-4)
### Phase 5: Credit System & Payments (Week 4-5)
### Phase 6: UI/UX Polish (Week 5-6)
### Phase 7: Testing & Deployment (Week 6-7)
### Phase 8: Marketing & Launch (Week 7-8)

---

## 💻 Complete Code Implementation

I'll provide complete, production-ready code for each component.

### 1. Project Initialization

```bash
# Create Next.js project
npx create-next-app@latest brand-ai-generator --typescript --tailwind --app
cd brand-ai-generator

# Install dependencies
npm install @prisma/client prisma
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next
npm install @tanstack/react-query
npm install zustand
npm install stripe @stripe/stripe-js
npm install @clerk/nextjs
npm install bullmq ioredis
npm install puppeteer
npm install openai
npm install replicate
npm install colorthief
npm install sharp
npm install zod
npm install framer-motion
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install sonner # Toast notifications
npm install react-dropzone
npm install @uploadthing/react # File uploads

# Dev dependencies
npm install -D @types/node
npm install -D tsx
```

### 2. Environment Variables

```env
# .env.local

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/brandai"

# Redis (Upstash)
REDIS_URL="redis://..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Replicate (Optional)
REPLICATE_API_TOKEN="r8_..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# R2 Storage (Cloudflare)
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="brand-assets"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 📁 Project Structure

```
brand-ai-generator/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── brands/
│   │   │   ├── generate/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── trpc/
│   │   │   ├── webhooks/
│   │   │   └── cron/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── brand/
│   │   ├── generation/
│   │   └── layout/
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   ├── trpc.ts
│   │   │   └── root.ts
│   │   ├── services/
│   │   │   ├── brand-scraper.ts
│   │   │   ├── ai-generator.ts
│   │   │   └── storage.ts
│   │   └── db.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── stripe.ts
│   │   └── redis.ts
│   ├── hooks/
│   ├── types/
│   └── config/
├── prisma/
│   └── schema.prisma
├── workers/
│   ├── brand-analyzer.ts
│   └── image-generator.ts
├── public/
└── package.json
```

---

This is the foundation. Let me continue with the complete implementation in the next file...
