-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColors" TEXT,
    "headingFont" TEXT,
    "bodyFont" TEXT,
    "toneOfVoice" TEXT,
    "personalityTraits" TEXT,
    "industry" TEXT,
    "targetAudience" TEXT,
    "visualStyle" TEXT,
    "brandArchetype" TEXT,
    "tagline" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "brandStory" TEXT,
    "deepAnalysis" TEXT,
    "siteUrl" TEXT,
    "domain" TEXT,
    "description" TEXT,
    "colors" TEXT,
    "image" TEXT,
    "fonts" TEXT,
    "logos" TEXT,
    "socialAccounts" TEXT,
    "personality" TEXT,
    "tone" TEXT,
    "strategyProfile" TEXT,
    "source" TEXT,
    "isBrandLockEnabled" BOOLEAN NOT NULL DEFAULT false,
    "designConstraints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "strategySummary" TEXT NOT NULL,
    "consistencyScore" DOUBLE PRECISION,
    "objective" TEXT,
    "targetPersona" TEXT,
    "mode" TEXT,
    "duration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "assetPlanSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT,
    "campaignId" TEXT,
    "url" TEXT,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "type" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "prompt" TEXT,
    "aspectRatio" TEXT,
    "model" TEXT,
    "sourceIdea" TEXT,
    "brandSnapshot" TEXT,
    "blueprint" TEXT,
    "finalPrompt" TEXT,
    "ideaType" TEXT,
    "consistencyScore" DOUBLE PRECISION,
    "backgroundUrl" TEXT,
    "finalImageUrl" TEXT,
    "objective" TEXT,
    "messagingFramework" TEXT,
    "emotionalTone" TEXT,
    "performanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
