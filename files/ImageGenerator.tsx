// src/components/generation/ImageGenerator.tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Download } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface ImageGeneratorProps {
  brandId: string;
  brandName?: string;
}

export function ImageGenerator({ brandId, brandName }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'dall-e-3' | 'stable-diffusion' | 'flux'>('dall-e-3');
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const utils = trpc.useContext();
  
  const { data: user } = trpc.user.getCredits.useQuery();

  const generateImage = trpc.generation.create.useMutation({
    onSuccess: (generation) => {
      toast.success('Generation started!', {
        description: 'Your image is being created...',
      });
      
      // Poll for completion
      pollGenerationStatus(generation.id);
    },
    onError: (error) => {
      toast.error('Failed to generate image', {
        description: error.message,
      });
    },
  });

  const { data: generationData, refetch: refetchGeneration } = trpc.generation.getById.useQuery(
    { id: generateImage.data?.id || '' },
    {
      enabled: false,
    }
  );

  // Poll for generation completion
  const pollGenerationStatus = async (generationId: string) => {
    const interval = setInterval(async () => {
      const result = await refetchGeneration();
      
      if (result.data?.status === 'completed') {
        clearInterval(interval);
        setGeneratedImage(result.data.imageUrl || null);
        toast.success('Image generated!');
        utils.user.getCredits.invalidate();
      } else if (result.data?.status === 'failed') {
        clearInterval(interval);
        toast.error('Generation failed', {
          description: result.data.errorMessage || 'Unknown error',
        });
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!user || user.credits < 1) {
      toast.error('Insufficient credits', {
        description: 'Please upgrade your plan to continue generating images.',
      });
      return;
    }

    generateImage.mutate({
      brandId,
      prompt,
      model,
      size,
    });
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brandName || 'brand'}-generated-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const isGenerating = generateImage.isLoading || generationData?.status === 'processing';

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left side - Controls */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Generate Brand Assets</h2>
          <p className="text-muted-foreground">
            Describe what you want to create and we'll generate it using your brand guidelines
          </p>
        </div>

        {/* Credits Display */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Available Credits</span>
            <span className="text-2xl font-bold">{user?.credits || 0}</span>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt">What would you like to create?</Label>
          <Textarea
            id="prompt"
            placeholder="E.g., A modern social media post announcing our new product launch with vibrant colors"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            Be specific about what you want. Include details about composition, mood, and use case.
          </p>
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={model}
              onValueChange={(value: any) => setModel(value)}
              disabled={isGenerating}
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dall-e-3">
                  DALL-E 3 (Highest Quality)
                </SelectItem>
                <SelectItem value="flux">
                  Flux (Fast & Good)
                </SelectItem>
                <SelectItem value="stable-diffusion">
                  Stable Diffusion (Budget)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Size</Label>
            <Select
              value={size}
              onValueChange={(value: any) => setSize(value)}
              disabled={isGenerating}
            >
              <SelectTrigger id="size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024x1024">Square (1:1)</SelectItem>
                <SelectItem value="1792x1024">Landscape (16:9)</SelectItem>
                <SelectItem value="1024x1792">Portrait (9:16)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          size="lg"
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Image (1 Credit)
            </>
          )}
        </Button>

        {/* Example Prompts */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Example prompts:</Label>
          <div className="space-y-1">
            {[
              'Instagram post announcing Black Friday sale',
              'Professional LinkedIn header image',
              'Product showcase for email campaign',
              'Twitter banner with motivational quote',
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded hover:bg-muted"
                disabled={isGenerating}
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Preview */}
      <div className="space-y-4">
        <div className="aspect-square bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Creating your image...</p>
                <p className="text-sm text-muted-foreground">
                  This usually takes 10-30 seconds
                </p>
              </div>
            </div>
          ) : generatedImage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full h-full"
            >
              <Image
                src={generatedImage}
                alt="Generated image"
                fill
                className="object-contain"
              />
            </motion.div>
          ) : (
            <div className="text-center space-y-2 p-8">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Your generated image will appear here
              </p>
            </div>
          )}
        </div>

        {generatedImage && !isGenerating && (
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              onClick={() => {
                setPrompt('');
                setGeneratedImage(null);
              }}
              className="flex-1"
            >
              Generate Another
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
