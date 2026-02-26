import { z } from "zod";

export const assetPlanItemSchema = z.object({
  assetType: z.string(),
  platform: z.string(),
  purpose: z.string(),
  headlineConcept: z.string(),
  visualDirection: z.string(),
  cta: z.string(),
});

export const strategicCampaignOutputSchema = z.object({
  campaignName: z.string(),
  objective: z.string(),
  strategySummary: z.string(),
  duration: z.string(),
  assetPlan: z.array(assetPlanItemSchema).min(1).max(12),
});

export type AssetPlanItem = z.infer<typeof assetPlanItemSchema>;
export type StrategicCampaignOutput = z.infer<typeof strategicCampaignOutputSchema>;

export function parseStrategicCampaignOutput(raw: unknown): StrategicCampaignOutput | null {
  const result = strategicCampaignOutputSchema.safeParse(raw);
  return result.success ? result.data : null;
}
