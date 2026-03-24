export interface BrandIdentity {
  primaryColor?: string | null;
  secondaryColors?: string[];
  headingFont?: string | null;
  bodyFont?: string | null;
  logoUrl?: string | null;
}

export interface BrandProfile {
  toneOfVoice?: string | null;
  personalityTraits?: string[];
  targetAudience?: string | null;
  industry?: string | null;
  visualStyle?: string | null;
}

export interface Brand {
  id: string;
  userId: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  identity: BrandIdentity;
  profile: BrandProfile;
}
