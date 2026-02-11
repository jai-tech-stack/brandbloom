/**
 * Server-side brand scraping service (same logic as lib/brand-scraper).
 * Used by tRPC routers and workers.
 */
export {
  scrapeBrandFromUrl,
  type ScrapedBrand,
} from "@/lib/brand-scraper";

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
