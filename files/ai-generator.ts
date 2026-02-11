// src/server/services/ai-generator.ts

import { OpenAI } from 'openai';
import Replicate from 'replicate';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

export interface GenerationParams {
  prompt: string;
  brandData: {
    colors: {
      primary: string;
      secondary: string;
      palette: string[];
    };
    fonts: {
      primary: string;
      families: string[];
    };
    brandPersonality?: string;
    designStyle?: string;
    logoUrls?: string[];
  };
  model?: 'dall-e-3' | 'stable-diffusion' | 'flux';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
}

export interface GenerationResult {
  imageUrl: string;
  revisedPrompt?: string;
  model: string;
  size: string;
}

/**
 * Main function to generate brand-consistent images
 */
export async function generateBrandedImage(
  params: GenerationParams
): Promise<GenerationResult> {
  const enhancedPrompt = buildEnhancedPrompt(params);

  switch (params.model || 'dall-e-3') {
    case 'dall-e-3':
      return await generateWithDallE(enhancedPrompt, params);
    
    case 'stable-diffusion':
      return await generateWithStableDiffusion(enhancedPrompt, params);
    
    case 'flux':
      return await generateWithFlux(enhancedPrompt, params);
    
    default:
      throw new Error(`Unsupported model: ${params.model}`);
  }
}

/**
 * Build enhanced prompt with brand guidelines
 */
function buildEnhancedPrompt(params: GenerationParams): string {
  const { prompt, brandData } = params;
  
  const colorPalette = brandData.colors.palette
    .slice(0, 3)
    .join(', ');

  const styleDescriptor = brandData.designStyle || 'modern and professional';
  const personality = brandData.brandPersonality || 'professional';

  const enhancedPrompt = `
Create a ${styleDescriptor} image for: ${prompt}

Brand Guidelines:
- Color Palette: Use these colors: ${colorPalette}
- Primary Color: ${brandData.colors.primary}
- Brand Personality: ${personality}
- Design Style: ${styleDescriptor}
- Typography Style: ${brandData.fonts.primary}

Requirements:
- Match the brand's visual identity
- Use the specified color palette prominently
- Maintain ${personality} tone
- High quality, professional composition
- Suitable for marketing and social media
`.trim();

  return enhancedPrompt;
}

/**
 * Generate image using DALL-E 3
 */
async function generateWithDallE(
  prompt: string,
  params: GenerationParams
): Promise<GenerationResult> {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: params.size || '1024x1024',
      quality: 'standard',
      style: params.style || 'vivid',
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    return {
      imageUrl,
      revisedPrompt: response.data[0].revised_prompt,
      model: 'dall-e-3',
      size: params.size || '1024x1024',
    };
  } catch (error: any) {
    console.error('DALL-E generation error:', error);
    throw new Error(`Failed to generate with DALL-E: ${error.message}`);
  }
}

/**
 * Generate image using Stable Diffusion (via Replicate)
 */
async function generateWithStableDiffusion(
  prompt: string,
  params: GenerationParams
): Promise<GenerationResult> {
  try {
    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt: prompt,
          negative_prompt: 'ugly, blurry, low quality, distorted, watermark',
          width: 1024,
          height: 1024,
          num_outputs: 1,
          scheduler: 'DPMSolverMultistep',
          num_inference_steps: 50,
          guidance_scale: 7.5,
        },
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;

    return {
      imageUrl: imageUrl as string,
      model: 'stable-diffusion-xl',
      size: '1024x1024',
    };
  } catch (error: any) {
    console.error('Stable Diffusion error:', error);
    throw new Error(`Failed to generate with Stable Diffusion: ${error.message}`);
  }
}

/**
 * Generate image using Flux (via Replicate)
 */
async function generateWithFlux(
  prompt: string,
  params: GenerationParams
): Promise<GenerationResult> {
  try {
    const output = await replicate.run(
      'black-forest-labs/flux-schnell',
      {
        input: {
          prompt: prompt,
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'png',
          output_quality: 80,
        },
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;

    return {
      imageUrl: imageUrl as string,
      model: 'flux-schnell',
      size: '1024x1024',
    };
  } catch (error: any) {
    console.error('Flux generation error:', error);
    throw new Error(`Failed to generate with Flux: ${error.message}`);
  }
}

/**
 * Apply brand elements to generated image (logo overlay, etc.)
 */
export async function applyBrandElements(
  imageUrl: string,
  brandData: {
    logoUrls?: string[];
    colors: {
      primary: string;
    };
  }
): Promise<string> {
  // This would use Sharp or similar library to:
  // 1. Download the generated image
  // 2. Overlay the logo in a corner
  // 3. Add subtle brand color border/frame
  // 4. Upload to R2 storage
  
  // For now, return the original URL
  // In production, implement image processing here
  return imageUrl;
}

/**
 * Generate multiple variations of an image
 */
export async function generateVariations(
  params: GenerationParams,
  count: number = 3
): Promise<GenerationResult[]> {
  const promises = Array.from({ length: count }, () =>
    generateBrandedImage(params)
  );

  return await Promise.all(promises);
}

/**
 * Validate generation parameters
 */
export function validateGenerationParams(params: GenerationParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.prompt || params.prompt.trim().length < 3) {
    errors.push('Prompt must be at least 3 characters long');
  }

  if (params.prompt && params.prompt.length > 1000) {
    errors.push('Prompt must be less than 1000 characters');
  }

  if (!params.brandData || !params.brandData.colors) {
    errors.push('Brand data is required');
  }

  const validSizes = ['1024x1024', '1792x1024', '1024x1792'];
  if (params.size && !validSizes.includes(params.size)) {
    errors.push(`Size must be one of: ${validSizes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate generation cost
 */
export function estimateGenerationCost(
  model: string,
  size: string
): number {
  const costs = {
    'dall-e-3': {
      '1024x1024': 0.04,
      '1792x1024': 0.08,
      '1024x1792': 0.08,
    },
    'stable-diffusion': {
      '1024x1024': 0.01,
    },
    'flux': {
      '1024x1024': 0.02,
    },
  };

  return costs[model]?.[size] || 0.04;
}
