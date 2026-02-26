/**
 * Campaign Memory System — track campaign intelligence over time.
 * Fetches past campaigns and assets for a brand; analyzes objectives, frameworks, emotional tone;
 * suggests alternative framework when repetition is detected.
 */

import { prisma } from "@/lib/db";

export type CampaignMemorySummary = {
  brandId: string;
  objectives: string[];
  messagingFrameworks: string[];
  emotionalTones: string[];
  recentCampaignIds: string[];
  assetCount: number;
};

/**
 * Fetch campaign memory for a brand: past objectives, messaging frameworks, emotional tones.
 */
export async function getCampaignMemory(brandId: string): Promise<CampaignMemorySummary> {
  const [campaigns, assets] = await Promise.all([
    prisma.campaign.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, objective: true, targetPersona: true },
    }),
    prisma.asset.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { objective: true, messagingFramework: true, emotionalTone: true },
    }),
  ]);

  const objectives = [
    ...campaigns.map((c) => c.objective).filter((o): o is string => !!o),
    ...assets.map((a) => a.objective).filter((o): o is string => !!o),
  ];
  const messagingFrameworks = assets
    .map((a) => a.messagingFramework)
    .filter((f): f is string => !!f);
  const emotionalTones = assets
    .map((a) => a.emotionalTone)
    .filter((t): t is string => !!t);

  const recentCampaignIds = campaigns.map((c) => c.id);

  return {
    brandId,
    objectives: [...new Set(objectives)].slice(0, 20),
    messagingFrameworks: [...new Set(messagingFrameworks)].slice(0, 20),
    emotionalTones: [...new Set(emotionalTones)].slice(0, 20),
    recentCampaignIds,
    assetCount: assets.length,
  };
}

const ALTERNATIVE_FRAMEWORKS: Record<string, string[]> = {
  awareness: ["AIDA", "PAS", "before-after-bridge", "storytelling", "problem-agitate-solve"],
  engagement: ["PAS", "AIDA", "curiosity gap", "social proof", "benefit-led"],
  conversion: ["urgency", "scarcity", "clear CTA", "risk-reversal", "before-after-bridge"],
  retention: ["loyalty narrative", "community", "value reminder", "benefit-led", "storytelling"],
};

/**
 * If the current objective/framework is overused for this brand, suggest an alternative.
 * Returns null if no repetition or no suggestion.
 */
export async function suggestAlternativeFramework(
  brandId: string,
  currentObjective: string,
  currentFramework: string
): Promise<{ objective?: string; messagingFramework?: string } | null> {
  const memory = await getCampaignMemory(brandId);
  const objNorm = currentObjective.trim().toLowerCase();
  const fwNorm = currentFramework.trim().toLowerCase();

  const objectiveCount = memory.objectives.filter((o) => o.toLowerCase() === objNorm).length;
  const frameworkCount = memory.messagingFrameworks.filter((f) => f.toLowerCase() === fwNorm).length;

  const repeated = objectiveCount >= 2 || frameworkCount >= 2;
  if (!repeated) return null;

  const suggestions: { objective?: string; messagingFramework?: string } = {};
  const altFrameworks = ALTERNATIVE_FRAMEWORKS[objNorm] ?? ALTERNATIVE_FRAMEWORKS.awareness;
  const notYetUsed = altFrameworks.filter(
    (f) => !memory.messagingFrameworks.some((m) => m.toLowerCase().includes(f.toLowerCase()))
  );
  if (frameworkCount >= 2 && notYetUsed.length > 0) {
    suggestions.messagingFramework = notYetUsed[0];
  }
  if (objectiveCount >= 2) {
    const otherObjectives = ["awareness", "engagement", "conversion", "retention"].filter(
      (o) => o !== objNorm && !memory.objectives.some((m) => m.toLowerCase() === o)
    );
    if (otherObjectives.length > 0) suggestions.objective = otherObjectives[0];
  }

  return Object.keys(suggestions).length > 0 ? suggestions : null;
}
