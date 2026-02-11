/**
 * Gemini Nano Banana Image Generator
 * Uses emergentintegrations for AI image generation
 */

const EMERGENT_API_URL = "https://integrations.emergentagent.com/api/llm/chat/multimodal";

export type BrandContext = {
  name?: string;
  colors?: string[];
  description?: string;
};

/**
 * Build a prompt string from brand context and a base prompt.
 */
export function buildImagePrompt(basePrompt: string, brand: BrandContext | null): string {
  const parts: string[] = [];
  if (brand?.name) parts.push(`Brand: ${brand.name}.`);
  if (brand?.colors?.length) parts.push(`Use these brand colors: ${brand.colors.slice(0, 3).join(", ")}.`);
  if (brand?.description) parts.push(`Context: ${brand.description.slice(0, 120)}.`);
  parts.push(basePrompt);
  parts.push("High quality, professional, modern design.");
  return parts.join(" ");
}

/**
 * Generate an image using Gemini Nano Banana via Emergent API
 */
export async function generateImageWithGemini(
  apiKey: string,
  prompt: string,
  sessionId: string = "brandbloom-" + Date.now()
): Promise<{ url: string; base64?: string } | null> {
  try {
    const response = await fetch(EMERGENT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        api_key: apiKey,
        session_id: sessionId,
        system_message: "You are an AI image generator. Generate high-quality brand images based on the given prompt.",
        provider: "gemini",
        model: "gemini-3-pro-image-preview",
        params: {
          modalities: ["image", "text"]
        },
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for image generation
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return null;
    }

    const data = await response.json() as {
      text?: string;
      images?: Array<{ data: string; mime_type: string }>;
      error?: string;
    };

    if (data.error) {
      console.error("Gemini API returned error:", data.error);
      return null;
    }

    // Check for images in response
    if (data.images && data.images.length > 0) {
      const imageData = data.images[0];
      // Return as data URL
      const dataUrl = `data:${imageData.mime_type};base64,${imageData.data}`;
      return { url: dataUrl, base64: imageData.data };
    }

    console.log("No images in Gemini response");
    return null;
  } catch (error) {
    console.error("Gemini image generation error:", error);
    return null;
  }
}

/**
 * Generate multiple images with Gemini
 */
export async function generateMultipleImages(
  apiKey: string,
  prompts: Array<{ prompt: string; label: string; width: number; height: number; type: string }>,
): Promise<Array<{ id: string; url: string; label: string; type: string; width: number; height: number }>> {
  const results: Array<{ id: string; url: string; label: string; type: string; width: number; height: number }> = [];
  
  for (let i = 0; i < prompts.length; i++) {
    const spec = prompts[i];
    const sessionId = `brandbloom-${Date.now()}-${i}`;
    
    try {
      const result = await generateImageWithGemini(apiKey, spec.prompt, sessionId);
      if (result) {
        results.push({
          id: String(i + 1),
          url: result.url,
          label: spec.label,
          type: spec.type,
          width: spec.width,
          height: spec.height,
        });
      }
    } catch (error) {
      console.error(`Failed to generate image ${i + 1}:`, error);
    }
  }
  
  return results;
}
