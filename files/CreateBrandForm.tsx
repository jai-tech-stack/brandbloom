// src/components/brand/CreateBrandForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';

export function CreateBrandForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createBrand = trpc.brand.create.useMutation({
    onSuccess: (brand) => {
      toast.success('Brand analysis started!', {
        description: 'We\'re analyzing your website. This may take a minute.',
      });
      router.push(`/dashboard/brands/${brand.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create brand', {
        description: error.message,
      });
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url) {
      toast.error('Please enter a website URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setIsLoading(true);
    createBrand.mutate({ websiteUrl: url });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="website-url" className="text-lg font-semibold">
            Enter your website URL
          </Label>
          <p className="text-sm text-muted-foreground">
            We'll analyze your website to understand your brand identity
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="website-url"
              type="url"
              placeholder="https://yourwebsite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10 h-12 text-base"
              disabled={isLoading}
              required
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="h-12 px-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-sm">What we'll extract:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Your brand colors and palette</li>
            <li>✓ Logo and visual assets</li>
            <li>✓ Typography and fonts</li>
            <li>✓ Brand personality and style</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
