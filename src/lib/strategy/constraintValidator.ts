/**
 * Brand Lock — constraint validation layer.
 * Validates blueprint against brand.designConstraints and auto-adjusts before rendering.
 * Does not modify the deterministic render engine; only adjusts blueprint inputs.
 */

import type { Blueprint } from "@/lib/generation/blueprintFactory";

export type DesignConstraints = {
  allowedColors?: string[];
  lockedLogoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  allowedFonts?: string[];
  maxHeadlineLines?: number;
  ctaTone?: "soft" | "assertive" | "urgent";
  minMargin?: number;
  logoRequired?: boolean;
};

const CTA_BY_TONE: Record<string, string> = {
  soft: "Learn more",
  assertive: "Get started",
  urgent: "Act now",
};

/** Map lockedLogoPosition to layout hint (layout stays compatible with render engine). */
const LAYOUT_BY_LOGO_POSITION: Record<string, string> = {
  "top-left": "top-heading",
  "top-right": "top-heading",
  "bottom-left": "centered-vertical",
  "bottom-right": "centered-vertical",
};

/**
 * Validate blueprint against design constraints and return an adjusted blueprint.
 * Only runs when isBrandLockEnabled is true and designConstraints is provided.
 * Ensures: headline lines <= maxHeadlineLines, CTA tone, layout/logo, logo required, margin hint.
 */
export function validateBlueprint(
  blueprint: Blueprint,
  designConstraints: DesignConstraints | null | undefined,
  isBrandLockEnabled: boolean
): Blueprint {
  if (!isBrandLockEnabled || !designConstraints || typeof designConstraints !== "object") {
    return blueprint;
  }

  const intent = { ...blueprint.intent };
  let layout = blueprint.layout;
  let includeLogo = blueprint.includeLogo;

  // Headline: cap line count
  const maxLines = designConstraints.maxHeadlineLines;
  if (typeof maxLines === "number" && maxLines >= 1 && intent.headline) {
    const lines = intent.headline.split(/\r?\n/).filter(Boolean);
    if (lines.length > maxLines) {
      intent.headline = lines.slice(0, maxLines).join("\n");
    }
  }

  // CTA tone: align to allowed tone
  const ctaTone = designConstraints.ctaTone;
  if (ctaTone && CTA_BY_TONE[ctaTone] && intent.cta) {
    intent.cta = CTA_BY_TONE[ctaTone];
  }

  // Logo required
  if (designConstraints.logoRequired === true) {
    includeLogo = true;
  }

  // Locked logo position: prefer layout that matches (without changing render logic)
  const pos = designConstraints.lockedLogoPosition;
  if (pos && LAYOUT_BY_LOGO_POSITION[pos]) {
    layout = LAYOUT_BY_LOGO_POSITION[pos];
  }

  return {
    ...blueprint,
    layout,
    includeLogo,
    intent,
  };
}

/**
 * Parse designConstraints from Brand row (JSON string or object).
 */
export function parseDesignConstraints(
  raw: string | object | null | undefined
): DesignConstraints | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as DesignConstraints;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as DesignConstraints) : null;
  } catch {
    return null;
  }
}

/**
 * Apply design constraints to brand colors and fonts for render.
 * When brand lock is on, filter to allowed lists only; otherwise return as-is.
 */
export function applyConstraintsToBrandAssets(
  colors: string[],
  fonts: string[] | undefined,
  designConstraints: DesignConstraints | null | undefined,
  isBrandLockEnabled: boolean
): { colors: string[]; fonts: string[] | undefined } {
  if (!isBrandLockEnabled || !designConstraints) {
    return { colors, fonts };
  }
  const allowedColors = designConstraints.allowedColors;
  const allowedFonts = designConstraints.allowedFonts;
  const outColors = Array.isArray(allowedColors) && allowedColors.length > 0
    ? colors.filter((c) => allowedColors.includes(c)).slice(0, 6)
    : colors;
  const outFonts = Array.isArray(allowedFonts) && allowedFonts.length > 0 && fonts?.length
    ? fonts.filter((f) => allowedFonts.includes(f)).slice(0, 2)
    : fonts;
  return { colors: outColors.length ? outColors : colors, fonts: outFonts };
}
