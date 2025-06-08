
'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { AppliedEffects } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePreviewProps {
  imageFile: File | null;
  effects: AppliedEffects;
}

// Helper function to map a value from one range to another
function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMin === inMax) return outMin; // Avoid division by zero
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}


export function ImagePreview({ imageFile, effects }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imageFile) {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => setBaseImage(img);
        img.onerror = () => {
          setError("Could not load image. Please try a different file.");
          setBaseImage(null);
        }
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        setError("Could not read file. Please try again.");
        setBaseImage(null);
      }
      reader.readAsDataURL(imageFile);
    } else {
      setBaseImage(null);
      setError(null);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [imageFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!baseImage) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
       // Set canvas to a default size if no image, to allow text to be centered
      if (!canvas.width || !canvas.height) {
        const container = canvas.parentElement;
        const defaultWidth = container?.clientWidth ? Math.max(container.clientWidth - 32, 300) : 300;
        const defaultHeight = defaultWidth * (3/4); // Maintain aspect ratio for placeholder
        canvas.width = defaultWidth;
        canvas.height = defaultHeight;
      }
      if (!imageFile && !error) {
        ctx.fillStyle = 'hsl(var(--muted-foreground))';
        ctx.textAlign = 'center';
        ctx.font = '16px var(--font-body)';
        ctx.fillText('Upload an image to see the preview', canvas.width / 2, canvas.height / 2);
      } else if (error) {
        ctx.fillStyle = 'hsl(var(--destructive))';
        ctx.textAlign = 'center';
        ctx.font = '16px var(--font-body)';
        ctx.fillText(error, canvas.width / 2, canvas.height / 2);
      }
      return;
    }
    
    const container = canvas.parentElement;
    const baseMaxWidth = container?.clientWidth ? Math.max(container.clientWidth - 32, 300) : 600; // Max width for the image content itself
    const baseMaxHeight = 500; // Max height for the image content itself

    let { width: imgOriginalWidth, height: imgOriginalHeight } = baseImage;
    let ratio = imgOriginalWidth / imgOriginalHeight;

    let scaledImgWidth = imgOriginalWidth;
    let scaledImgHeight = imgOriginalHeight;

    // Scale based on container limits
    if (scaledImgWidth > baseMaxWidth) {
      scaledImgWidth = baseMaxWidth;
      scaledImgHeight = scaledImgWidth / ratio;
    }
    if (scaledImgHeight > baseMaxHeight) {
      scaledImgHeight = baseMaxHeight;
      scaledImgWidth = scaledImgHeight * ratio;
    }
     if (scaledImgWidth > baseMaxWidth) { 
        scaledImgWidth = baseMaxWidth;
        scaledImgHeight = scaledImgWidth / ratio;
    }

    // Apply animSize for overall scale of the image content
    const imageContentScale = mapRange(effects.animSize, 10, 100, 0.2, 1.0);
    scaledImgWidth *= imageContentScale;
    scaledImgHeight *= imageContentScale;

    // Calculate border size based on animEdgeThickness
    // Border size is relative to the smaller dimension of the scaled image content
    const borderSize = mapRange(effects.animEdgeThickness, 0, 100, 0, Math.min(scaledImgWidth, scaledImgHeight) * 0.20);

    // Final canvas dimensions include the border
    const finalCanvasWidth = scaledImgWidth + 2 * borderSize;
    const finalCanvasHeight = scaledImgHeight + 2 * borderSize;

    canvas.width = finalCanvasWidth;
    canvas.height = finalCanvasHeight;
    ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);

    // Image position within the canvas (offset by borderSize)
    const imageX = borderSize;
    const imageY = borderSize;
    
    ctx.save(); // Save context state before any effects

    // Apply drop shadow (from animShadow controls) to the entire paper shape
    const shadowOffsetXVal = mapRange(effects.animShadowOffsetX, 0, 100, -25, 25);
    const shadowOffsetYVal = mapRange(effects.animShadowOffsetY, 0, 100, -25, 25);
    const shadowBlurVal = mapRange(effects.animShadowBlur, 0, 100, 0, 50);
    const shadowStrengthVal = mapRange(effects.animShadowStrength, 0, 100, 0, 0.75);
    
    if (shadowStrengthVal > 0) {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowStrengthVal})`;
        ctx.shadowBlur = shadowBlurVal;
        ctx.shadowOffsetX = shadowOffsetXVal;
        ctx.shadowOffsetY = shadowOffsetYVal;
    }

    // Path for torn/cutout border
    const paperPath = new Path2D();
    const useTornEffect = borderSize > 0.1 && effects.animEdgeIntensity > 0;

    if (useTornEffect) {
      const maxDeviation = mapRange(effects.animEdgeIntensity, 0, 100, 0, borderSize * 0.98);
      const numSegments = Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 3, 15)); // Segments per edge
      // const cutoutStyleParam = effects.animCutoutStyle / 100; // For future use if varying tear style

      const jitter = () => (Math.random() - 0.5) * 2 * maxDeviation * 0.5; // Smaller general jitter
      const deviationY = () => Math.random() * maxDeviation;
      const deviationX = () => Math.random() * maxDeviation;

      // Start at top-left
      paperPath.moveTo(deviationX(), deviationY());

      // Top edge
      for (let i = 1; i < numSegments; i++) {
          paperPath.lineTo((finalCanvasWidth / numSegments) * i + jitter(), deviationY());
      }
      paperPath.lineTo(finalCanvasWidth - deviationX(), deviationY()); // Top-right corner

      // Right edge
      for (let i = 1; i < numSegments; i++) {
          paperPath.lineTo(finalCanvasWidth - deviationX(), (finalCanvasHeight / numSegments) * i + jitter());
      }
      paperPath.lineTo(finalCanvasWidth - deviationX(), finalCanvasHeight - deviationY()); // Bottom-right

      // Bottom edge
      for (let i = numSegments - 1; i > 0; i--) {
          paperPath.lineTo((finalCanvasWidth / numSegments) * i + jitter(), finalCanvasHeight - deviationY());
      }
      paperPath.lineTo(deviationX(), finalCanvasHeight - deviationY()); // Bottom-left

      // Left edge
      for (let i = numSegments - 1; i > 0; i--) {
          paperPath.lineTo(deviationX(), (finalCanvasHeight / numSegments) * i + jitter());
      }
      paperPath.closePath();
      ctx.clip(paperPath);
    }
    
    // Draw the white paper base (will be clipped if torn effect is active)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);

    // Reset shadow for drawing the image itself if it was applied for the paper
    if (shadowStrengthVal > 0) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // Draw the actual image, scaled and positioned
    ctx.drawImage(baseImage, imageX, imageY, scaledImgWidth, scaledImgHeight);
    
    ctx.restore(); // Restore context (removes paper clip and paper's shadow settings)


    // Paper Texture (applied over image and border, respecting outer clip if any)
    const textureStrength = mapRange(effects.animTextureStrength, 0, 100, 0, 0.25);
    if (textureStrength > 0) {
      ctx.save();
      if (useTornEffect) {
        ctx.clip(paperPath); // Re-apply the same path for texture
      }
      ctx.globalAlpha = textureStrength;
      ctx.fillStyle = 'rgba(180, 170, 150, 0.5)'; 
      for (let i = 0; i < finalCanvasWidth * finalCanvasHeight * 0.001 * (effects.animTextureStrength / 20) ; i++) {
        const x = Math.random() * finalCanvasWidth;
        const y = Math.random() * finalCanvasHeight;
        const size = Math.random() * 2 + 0.5;
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
    
    // Floating motion CSS variables
    if (cardRef.current) {
      const movementStrength = mapRange(effects.animMovement, 0, 100, 0, 12);
      const movementDuration = mapRange(effects.animMovement, 0, 100, 15, 5); 
      
      cardRef.current.style.setProperty('--float-translateY', `-${movementStrength}px`);
      cardRef.current.style.setProperty('--float-duration', `${movementDuration}s`);
    }

  }, [baseImage, effects, error, imageFile]);

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "shadow-xl h-full transition-all duration-500",
         effects.animMovement > 0 && "animate-float-dynamic"
      )}
      >
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-primary" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center aspect-[4/3] bg-muted/20 rounded-b-lg overflow-hidden p-2">
        {/* Ensure canvas itself doesn't have a conflicting background if transparent areas are expected */}
        <canvas ref={canvasRef} className="max-w-full max-h-full rounded shadow-inner"></canvas>
      </CardContent>
    </Card>
  );
}

