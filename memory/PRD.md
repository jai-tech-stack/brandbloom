# BrandBloom - AI Brand Asset Generator PRD

## Original Problem Statement
Clone trybloom.ai - an AI-powered brand asset generator that:
1. Scans website URLs to extract brand elements (colors, fonts, logos, tone)
2. Generates AI brand assets using those extracted elements
3. Provides a credit-based system with auth and payments

## User Personas
- **Marketers**: Need quick branded assets for campaigns
- **Small Business Owners**: Want professional brand materials without designers
- **Agencies**: Need to scale asset production for clients
- **Content Creators**: Want consistent brand imagery for social media

## Core Requirements
- [x] URL-based brand extraction (meta, colors, fonts, logos)
- [x] AI brand personality analysis (OpenAI GPT)
- [x] AI image generation (Gemini Nano Banana via Emergent)
- [x] Credit system (10 free on signup)
- [x] User authentication (NextAuth)
- [x] Dashboard for managing brands & assets
- [x] Download assets in multiple formats (PNG, JPG, WebP)
- [x] Multiple asset types (social, ads, banners, merchandise)
- [x] Curated aesthetics presets

## What's Been Implemented (Jan 2026)

### Backend
- `/api/extract-brand` - Scrapes URL, extracts brand data, AI personality analysis
- `/api/generate-assets` - Generates AI images using Gemini Nano Banana
- `/api/brands` - CRUD for saved brands
- `/api/assets` - CRUD for generated assets
- `/api/auth/*` - NextAuth authentication
- `/api/me` - Current user info + credits

### Frontend
- Landing page with URL input
- Analyze page with extraction progress
- Create page with idea cards + curated aesthetics
- Assets page with download buttons
- Dashboard for brand/asset management
- Login/Register pages

### Features
- 6 Idea card templates (Blog Header, Social Post, Merchandise, Banner Ad, Product Shot, Story Cover)
- 8 Curated aesthetics (Streetwear, Premium Editorial, Epic Landscape, Minimal, Vintage, Tech, Organic, Luxury)
- Multiple aspect ratio options
- Download in PNG/JPG/WebP formats
- Brand dashboard with delete functionality

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Prisma + SQLite
- NextAuth (Credentials)
- Tailwind CSS
- Gemini Nano Banana (Image Gen)
- OpenAI GPT (Brand Analysis)

## Prioritized Backlog

### P0 - Critical
- [x] Core brand extraction
- [x] Image generation integration
- [x] User authentication

### P1 - Important
- [ ] Real-time image generation (currently using demo fallback)
- [ ] Stripe payment integration for credits
- [ ] Image storage (Cloudflare R2)

### P2 - Nice to Have
- [ ] Asset editing/customization
- [ ] Brand templates
- [ ] Team collaboration
- [ ] API access for programmatic use
- [ ] Social media direct posting

## Next Tasks
1. Fix Gemini API integration for real-time image generation
2. Add Stripe checkout for credit purchases
3. Implement R2 storage for generated images
4. Add more asset templates and presets
