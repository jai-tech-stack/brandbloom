export interface AssetGeneration {
  prompt: string;
  width: number;
  height: number;
  type: "social" | "ad" | "thumbnail" | "banner";
}

export interface Asset {
  id: string;
  brandId?: string | null;
  campaignId?: string | null;
  url?: string | null;
  label: string;
  status: "pending" | "generating" | "complete" | "failed";
  type: "social" | "ad" | "thumbnail" | "banner";
  width: number;
  height: number;
}
