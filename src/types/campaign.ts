export interface CampaignBrief {
  type: "quick" | "advanced";
  goal?: string;
  description?: string;
  platform?: string[];
  timeline?: string;
  budget?: string;
}

export interface Campaign {
  id: string;
  brandId: string;
  title: string;
  goal: string;
  strategySummary: string;
  status: "draft" | "generating" | "complete";
}
