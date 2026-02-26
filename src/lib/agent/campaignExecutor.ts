/**
 * Campaign Executor
 * Runs the generation orchestrator for each asset in the campaign plan, sequentially.
 * Does not persist; returns generated assets with blueprint + finalPrompt for the API to store.
 */

import { runGenerationPipeline } from "@/lib/generation/orchestrator";
import type { OrchestratorBrand } from "@/lib/generation/orchestrator";
import type { CampaignPlan } from "./campaignPlanner";
import type { OrchestratorResult } from "@/lib/generation/orchestrator";
import type { DesignConstraints } from "@/lib/strategy/constraintValidator";

export type ExecutedCampaignAsset = OrchestratorResult & {
  label: string;
  type: "social" | "ad" | "thumbnail" | "banner";
};

function ideaTypeToAssetType(ideaType: string): "social" | "ad" | "thumbnail" | "banner" {
  if (/ad|display|social_media_ad/.test(ideaType)) return "ad";
  if (/thumbnail|youtube_thumbnail/.test(ideaType)) return "thumbnail";
  if (/banner|cover|header|channel_art/.test(ideaType)) return "banner";
  return "social";
}

export type ExecuteCampaignOptions = {
  logoImageUrl?: string | null;
  sessionIdPrefix?: string;
  isBrandLockEnabled?: boolean;
  designConstraints?: DesignConstraints | null;
  campaignMemoryHint?: string | null;
};

/**
 * Execute campaign: for each asset in the plan, call the orchestrator with ideaType + intent as userPrompt.
 * Runs sequentially to maintain consistent tone. Returns generated assets (with imageUrl, blueprint, finalPrompt).
 * Caps at 6 assets.
 */
export async function executeCampaign(
  brand: OrchestratorBrand | null,
  campaignPlan: CampaignPlan,
  options: ExecuteCampaignOptions = {}
): Promise<ExecutedCampaignAsset[]> {
  const {
    logoImageUrl = null,
    sessionIdPrefix = "campaign",
    isBrandLockEnabled = false,
    designConstraints = null,
    campaignMemoryHint = null,
  } = options;
  const assets = campaignPlan.assets.slice(0, 6);
  const results: ExecutedCampaignAsset[] = [];

  for (let i = 0; i < assets.length; i++) {
    const spec = assets[i];
    const result = await runGenerationPipeline({
      brand,
      ideaType: spec.ideaType,
      userPrompt: spec.intent,
      brandLock: false,
      logoImageUrl,
      sessionId: `${sessionIdPrefix}-${Date.now()}-${i}`,
      isBrandLockEnabled,
      designConstraints: designConstraints ?? undefined,
      campaignMemoryHint: campaignMemoryHint ?? undefined,
    });

    const label = result.blueprint.intent?.headline?.slice(0, 40) || spec.ideaType.replace(/_/g, " ") || "Asset";
    const type = ideaTypeToAssetType(result.ideaType);

    results.push({
      ...result,
      label,
      type,
    });
  }

  return results;
}
