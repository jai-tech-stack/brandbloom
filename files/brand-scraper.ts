// src/server/services/brand-scraper.ts

import puppeteer, { Browser, Page } from 'puppeteer';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface BrandData {
  websiteUrl: string;
  name?: string;
  logoUrls: string[];
  colors: {
    primary: string;
    secondary: string;
    palette: string[];
  };
  fonts: {
    primary: string;
    secondary?: string;
    families: string[];
  };
  brandPersonality?: string;
  designStyle?: string;
  industry?: string;
}

/**
 * Main function to scrape and analyze a website's brand
 */
export async function scrapeBrand(websiteUrl: string): Promise<BrandData> {
  let browser: Browser | null = null;

  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Navigate to website
    await page.goto(websiteUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Extract all brand data in parallel
    const [logoUrls, colors, fonts, textContent, screenshots] = await Promise.all([
      extractLogos(page),
      extractColors(page),
      extractFonts(page),
      extractTextContent(page),
      takeScreenshots(page),
    ]);

    // Analyze with AI
    const aiAnalysis = await analyzeWithAI({
      websiteUrl,
      textContent,
      colors: colors.palette,
      fonts: fonts.families,
      logoUrls,
    });

    const brandData: BrandData = {
      websiteUrl,
      name: aiAnalysis.brandName,
      logoUrls,
      colors,
      fonts,
      brandPersonality: aiAnalysis.personality,
      designStyle: aiAnalysis.designStyle,
      industry: aiAnalysis.industry,
    };

    return brandData;
  } catch (error) {
    console.error('Error scraping brand:', error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract logo URLs from the page
 */
async function extractLogos(page: Page): Promise<string[]> {
  const logos = await page.evaluate(() => {
    const logoSelectors = [
      'img[alt*="logo" i]',
      'img[src*="logo" i]',
      'img[class*="logo" i]',
      'svg[class*="logo" i]',
      'header img',
      'nav img',
      '.header img',
      '.navbar img',
    ];

    const logoUrls: string[] = [];
    const seenUrls = new Set<string>();

    logoSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        let url: string | null = null;

        if (el.tagName === 'IMG') {
          url = (el as HTMLImageElement).src;
        } else if (el.tagName === 'SVG') {
          // For SVG, we'd need to serialize it
          const svgString = new XMLSerializer().serializeToString(el);
          url = `data:image/svg+xml;base64,${btoa(svgString)}`;
        }

        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          logoUrls.push(url);
        }
      });
    });

    return logoUrls;
  });

  // Filter out small images (likely not logos)
  const validLogos: string[] = [];
  for (const url of logos) {
    try {
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      // Only include images that are reasonably sized for logos
      if (img.width >= 50 && img.height >= 30) {
        validLogos.push(url);
      }
    } catch (error) {
      // Skip invalid images
    }
  }

  return validLogos.slice(0, 5); // Return top 5 logos
}

/**
 * Extract color palette from the page
 */
async function extractColors(page: Page) {
  const colors = await page.evaluate(() => {
    const colorSet = new Set<string>();
    
    // Get computed styles for all elements
    const elements = document.querySelectorAll('*');
    elements.forEach((el) => {
      const styles = window.getComputedStyle(el);
      
      // Extract background colors
      const bgColor = styles.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
        colorSet.add(bgColor);
      }

      // Extract text colors
      const textColor = styles.color;
      if (textColor) {
        colorSet.add(textColor);
      }

      // Extract border colors
      const borderColor = styles.borderColor;
      if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
        colorSet.add(borderColor);
      }
    });

    // Convert RGB to HEX
    const rgbToHex = (rgb: string): string => {
      const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return '';
      
      const hex = (n: number) => {
        const h = n.toString(16);
        return h.length === 1 ? '0' + h : h;
      };

      return `#${hex(parseInt(match[1]))}${hex(parseInt(match[2]))}${hex(parseInt(match[3]))}`;
    };

    return Array.from(colorSet)
      .map(rgbToHex)
      .filter((hex) => hex !== '' && hex !== '#000000' && hex !== '#ffffff');
  });

  // Get most dominant colors
  const palette = getMostDominantColors(colors, 6);

  return {
    primary: palette[0] || '#000000',
    secondary: palette[1] || '#333333',
    palette,
  };
}

/**
 * Extract fonts from the page
 */
async function extractFonts(page: Page) {
  const fonts = await page.evaluate(() => {
    const fontSet = new Set<string>();
    
    const elements = document.querySelectorAll('*');
    elements.forEach((el) => {
      const styles = window.getComputedStyle(el);
      const fontFamily = styles.fontFamily;
      
      if (fontFamily) {
        // Split by comma and clean up
        fontFamily.split(',').forEach((font) => {
          const cleanFont = font.trim().replace(/['"]/g, '');
          if (cleanFont && !cleanFont.includes('system') && !cleanFont.includes('sans-serif')) {
            fontSet.add(cleanFont);
          }
        });
      }
    });

    return Array.from(fontSet);
  });

  return {
    primary: fonts[0] || 'Arial',
    secondary: fonts[1],
    families: fonts.slice(0, 5),
  };
}

/**
 * Extract relevant text content for AI analysis
 */
async function extractTextContent(page: Page): Promise<string> {
  const text = await page.evaluate(() => {
    // Get text from main content areas
    const selectors = [
      'h1',
      'h2',
      '.hero',
      '.tagline',
      '.description',
      'meta[name="description"]',
      'title',
    ];

    let content = '';
    
    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (el.tagName === 'META') {
          content += (el as HTMLMetaElement).content + ' ';
        } else {
          content += el.textContent + ' ';
        }
      });
    });

    return content.trim().slice(0, 2000); // Limit to 2000 chars
  });

  return text;
}

/**
 * Take screenshots for visual analysis
 */
async function takeScreenshots(page: Page): Promise<Buffer[]> {
  const screenshots: Buffer[] = [];

  // Full page screenshot
  const fullPage = await page.screenshot({
    fullPage: false,
    type: 'png',
  });
  screenshots.push(fullPage);

  return screenshots;
}

/**
 * Analyze brand with AI (GPT-4 Vision + Text)
 */
async function analyzeWithAI(data: {
  websiteUrl: string;
  textContent: string;
  colors: string[];
  fonts: string[];
  logoUrls: string[];
}): Promise<{
  brandName?: string;
  personality: string;
  designStyle: string;
  industry: string;
}> {
  const prompt = `Analyze this brand based on the following information from their website:

Website: ${data.websiteUrl}
Content: ${data.textContent}
Color Palette: ${data.colors.join(', ')}
Fonts: ${data.fonts.join(', ')}

Provide a concise analysis in JSON format:
{
  "brandName": "The brand/company name",
  "personality": "The brand personality and tone (e.g., professional, playful, luxurious, minimalist)",
  "designStyle": "The overall design aesthetic (e.g., modern, classic, bold, minimal, vintage)",
  "industry": "The industry or sector (e.g., technology, fashion, finance, healthcare)"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a brand analyst expert. Analyze websites and extract brand identity.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      brandName: analysis.brandName,
      personality: analysis.personality || 'Professional and modern',
      designStyle: analysis.designStyle || 'Modern',
      industry: analysis.industry || 'General',
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Return defaults if AI fails
    return {
      personality: 'Professional and approachable',
      designStyle: 'Modern and clean',
      industry: 'Business',
    };
  }
}

/**
 * Helper: Get most dominant colors from array
 */
function getMostDominantColors(colors: string[], count: number): string[] {
  // Simple frequency count (in production, use more sophisticated clustering)
  const colorCount = new Map<string, number>();
  
  colors.forEach((color) => {
    colorCount.set(color, (colorCount.get(color) || 0) + 1);
  });

  return Array.from(colorCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([color]) => color);
}

/**
 * Helper: Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
