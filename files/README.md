# 🎨 AI Brand Asset Generator

> **Create on-brand marketing assets instantly using AI** - Just like [Bloom.ai](https://trybloom.ai)

A complete SaaS platform that analyzes your website, extracts your brand identity, and generates professional marketing images that perfectly match your brand guidelines.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

---

## ✨ Features

### Core Functionality
- 🔍 **Automatic Brand Analysis** - Scrape and analyze any website
- 🎨 **Color Palette Extraction** - Automatically detect brand colors
- 📝 **Font Detection** - Identify typography
- 🤖 **AI Brand Personality** - Understand brand tone and style
- 🖼️ **AI Image Generation** - Create on-brand assets with DALL-E 3, Stable Diffusion, or Flux
- 💳 **Credit-Based System** - Flexible usage-based pricing
- 💰 **Stripe Payments** - Secure subscription management

### Technical Features
- ⚡ **Real-time Processing** - Background job queue with BullMQ
- 🔐 **Secure Authentication** - Clerk integration
- 📊 **Usage Analytics** - Track generations and credits
- 🎯 **Type-Safe API** - End-to-end TypeScript with tRPC
- 🌐 **Serverless Architecture** - Deploy on Vercel
- 📦 **Scalable Storage** - Cloudflare R2 for images

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+
PostgreSQL database
Redis instance
OpenAI API key
Stripe account
```

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/brand-ai-generator.git
cd brand-ai-generator
npm install
```

### 2. Environment Setup

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/brandai"

# Redis
REDIS_URL="redis://localhost:6379"

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Cloudflare R2
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
# Terminal 1 - Next.js app
npm run dev

# Terminal 2 - Workers
npm run workers
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
brand-ai-generator/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn UI components
│   │   ├── brand/            # Brand-related components
│   │   └── generation/       # Image generation components
│   ├── server/               # Server-side code
│   │   ├── api/              # tRPC routers
│   │   ├── services/         # Business logic
│   │   │   ├── brand-scraper.ts
│   │   │   ├── ai-generator.ts
│   │   │   └── storage.ts
│   │   └── db.ts             # Prisma client
│   ├── lib/                  # Utilities
│   │   ├── stripe.ts
│   │   ├── queue.ts
│   │   └── redis.ts
│   └── hooks/                # React hooks
├── workers/                   # Background workers
│   ├── brand-analyzer.ts
│   └── image-generator.ts
├── prisma/
│   └── schema.prisma         # Database schema
└── public/                   # Static assets
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui
- **Animations**: Framer Motion
- **State**: Zustand, React Query

### Backend
- **API**: tRPC (type-safe)
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Queue**: BullMQ
- **Auth**: Clerk
- **Payments**: Stripe

### AI/ML
- **Image Generation**: OpenAI DALL-E 3, Stable Diffusion, Flux
- **Text Analysis**: GPT-4
- **Web Scraping**: Puppeteer

### Infrastructure
- **Hosting**: Vercel
- **Storage**: Cloudflare R2
- **Workers**: Railway/Render
- **Monitoring**: Sentry

---

## 💻 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push Prisma schema to database
npm run db:studio    # Open Prisma Studio
npm run workers      # Run background workers
```

### Code Quality

```bash
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking
npm run test         # Run tests
```

---

## 🔧 Configuration

### API Keys Required

1. **OpenAI** - For image generation and text analysis
   - Get from: https://platform.openai.com/api-keys
   - Cost: ~$0.04 per DALL-E 3 image

2. **Replicate** (Optional) - For Stable Diffusion
   - Get from: https://replicate.com/account
   - Cost: ~$0.01 per image

3. **Stripe** - For payments
   - Get from: https://dashboard.stripe.com/apikeys
   - Free to start, 2.9% + $0.30 per transaction

4. **Clerk** - For authentication
   - Get from: https://dashboard.clerk.com
   - Free up to 10,000 users

5. **Cloudflare R2** - For image storage
   - Get from: https://dash.cloudflare.com/
   - Free up to 10GB storage

### Database Setup

**Option 1: Local PostgreSQL**
```bash
# macOS
brew install postgresql
brew services start postgresql

# Linux
sudo apt-get install postgresql
sudo systemctl start postgresql
```

**Option 2: Supabase (Recommended)**
1. Create project at https://supabase.com
2. Copy connection string from Settings → Database
3. Add to `.env.local` as `DATABASE_URL`

### Redis Setup

**Option 1: Local Redis**
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

**Option 2: Upstash (Recommended for production)**
1. Create database at https://upstash.com
2. Copy Redis URL
3. Add to `.env.local` as `REDIS_URL`

---

## 🚀 Deployment

### Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy Workers (Railway)

1. Create Railway account
2. Connect GitHub repository
3. Create two services:
   - Service 1: `npm run worker:brand`
   - Service 2: `npm run worker:image`
4. Add environment variables

**See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete instructions**

---

## 📊 Usage Example

### 1. Create a Brand

```typescript
const brand = await trpc.brand.create.mutate({
  websiteUrl: 'https://yourwebsite.com'
});
```

### 2. Generate an Image

```typescript
const generation = await trpc.generation.create.mutate({
  brandId: brand.id,
  prompt: 'Social media post announcing our new product',
  model: 'dall-e-3',
  size: '1024x1024'
});
```

### 3. Download Result

```typescript
const result = await trpc.generation.getById.query({
  id: generation.id
});

console.log(result.imageUrl); // Download URL
```

---

## 💰 Pricing Strategy

### Recommended Plans

| Plan | Credits/Month | Price | Best For |
|------|--------------|-------|----------|
| **Free** | 10 | $0 | Testing |
| **Pro** | 100 | $20 | Small businesses |
| **Business** | 300 | $50 | Agencies |
| **Enterprise** | Custom | Custom | Large teams |

**1 Credit = 1 Image Generation**

---

## 🎯 Roadmap

### ✅ Phase 1 - MVP (Done)
- [x] Brand scraping
- [x] AI image generation
- [x] Credit system
- [x] Stripe payments

### 🚧 Phase 2 - Enhancement (In Progress)
- [ ] Template library
- [ ] Batch generation
- [ ] Image editing tools
- [ ] API for developers

### 📋 Phase 3 - Advanced
- [ ] Video generation
- [ ] Team collaboration
- [ ] Brand style guide export
- [ ] Figma plugin

**See [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) for details**

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [Bloom.ai](https://trybloom.ai)
- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

## 📞 Support

- **Documentation**: [docs.yourapp.com](https://docs.yourapp.com)
- **Email**: support@yourapp.com
- **Discord**: [Join our community](https://discord.gg/yourapp)
- **Twitter**: [@yourapp](https://twitter.com/yourapp)

---

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐!

---

**Made with ❤️ by [Your Name](https://github.com/yourusername)**

---

## 📸 Screenshots

### Landing Page
![Landing Page](./screenshots/landing.png)

### Brand Analysis
![Brand Analysis](./screenshots/brand-analysis.png)

### Image Generation
![Image Generation](./screenshots/generation.png)

### Dashboard
![Dashboard](./screenshots/dashboard.png)

---

## 🔗 Useful Links

- [Complete Development Guide](./AI_BRAND_GENERATOR_COMPLETE_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Development Roadmap](./DEVELOPMENT_ROADMAP.md)
- [API Documentation](./API_DOCS.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
