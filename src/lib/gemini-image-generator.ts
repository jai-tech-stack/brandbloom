/**
 * Gemini Nano Banana Image Generator
 * Uses emergentintegrations for AI image generation via Emergent API
 */

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
  parts.push("High quality, professional, modern design, 4K resolution.");
  return parts.join(" ");
}

/**
 * Generate an image using Gemini Nano Banana via Emergent Integration Proxy
 */
export async function generateImageWithGemini(
  apiKey: string,
  prompt: string,
  sessionId: string = "brandbloom-" + Date.now()
): Promise<{ url: string; base64?: string } | null> {
  // Use the integration proxy URL for server-side calls
  const INTEGRATION_PROXY_URL = process.env.INTEGRATION_PROXY_URL || "https://integrations.emergentagent.com";
  
  try {
    console.log("[Gemini] Starting image generation...");
    console.log("[Gemini] Prompt:", prompt.substring(0, 100) + "...");
    
    const response = await fetch(`${INTEGRATION_PROXY_URL}/api/llm/chat/multimodal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        session_id: sessionId,
        system_message: "You are an expert brand designer. Create stunning, professional brand imagery based on the prompt. Always generate a visually appealing image.",
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
      signal: AbortSignal.timeout(180000), // 3 minute timeout for image generation
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini] API error:", response.status, errorText);
      return null;
    }

    const data = await response.json() as {
      text?: string;
      images?: Array<{ data: string; mime_type: string }>;
      error?: string;
    };

    console.log("[Gemini] Response received, images:", data.images?.length || 0);

    if (data.error) {
      console.error("[Gemini] API returned error:", data.error);
      return null;
    }

    // Check for images in response
    if (data.images && data.images.length > 0) {
      const imageData = data.images[0];
      // Return as data URL for immediate display
      const dataUrl = `data:${imageData.mime_type};base64,${imageData.data}`;
      console.log("[Gemini] Image generated successfully!");
      return { url: dataUrl, base64: imageData.data };
    }

    console.log("[Gemini] No images in response");
    return null;
  } catch (error) {
    console.error("[Gemini] Image generation error:", error);
    return null;
  }
}
