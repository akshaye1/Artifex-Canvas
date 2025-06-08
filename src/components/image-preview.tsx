
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
      if (!canvas.width || !canvas.height) {
        const container = canvas.parentElement;
        const defaultWidth = container?.clientWidth ? Math.max(container.clientWidth - 32, 300) : 300;
        const defaultHeight = defaultWidth * (3/4); 
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
    const baseMaxWidth = container?.clientWidth ? Math.max(container.clientWidth - 32, 300) : 600; 
    const baseMaxHeight = 500; 

    let { width: imgOriginalWidth, height: imgOriginalHeight } = baseImage;
    let ratio = imgOriginalWidth / imgOriginalHeight;

    let scaledImgContentWidth = imgOriginalWidth;
    let scaledImgContentHeight = imgOriginalHeight;

    // Scale content based on animSize
    const imageContentScale = mapRange(effects.animSize, 10, 100, 0.2, 1.0);
    scaledImgContentWidth *= imageContentScale;
    scaledImgContentHeight *= imageContentScale;

    // Adjust aspect ratio if content scaling distorts it (it shouldn't with current logic, but good to be aware)
    // Re-calculate ratio for the scaled content
    ratio = scaledImgContentWidth / scaledImgContentHeight;


    // Fit scaled content within max dimensions while preserving its new aspect ratio
    if (scaledImgContentWidth > baseMaxWidth) {
      scaledImgContentWidth = baseMaxWidth;
      scaledImgContentHeight = scaledImgContentWidth / ratio;
    }
    if (scaledImgContentHeight > baseMaxHeight) {
      scaledImgContentHeight = baseMaxHeight;
      scaledImgContentWidth = scaledImgContentHeight * ratio;
    }
    // Final check if width adjustment pushed height over limit, or vice-versa
     if (scaledImgContentWidth > baseMaxWidth) { 
        scaledImgContentWidth = baseMaxWidth;
        scaledImgContentHeight = scaledImgContentWidth / ratio;
    }
     if (scaledImgContentHeight > baseMaxHeight) {
        scaledImgContentHeight = baseMaxHeight;
        scaledImgContentWidth = scaledImgContentHeight * ratio;
    }


    const borderThickness = mapRange(effects.animEdgeThickness, 0, 100, 0, Math.min(scaledImgContentWidth, scaledImgContentHeight) * 0.20);

    const finalCanvasWidth = scaledImgContentWidth + 2 * borderThickness;
    const finalCanvasHeight = scaledImgContentHeight + 2 * borderThickness;

    canvas.width = finalCanvasWidth;
    canvas.height = finalCanvasHeight;
    ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);

    const imageX = borderThickness;
    const imageY = borderThickness;
    
    ctx.save(); 

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

    const paperPath = new Path2D();
    const useTornEffect = borderThickness > 0.01 && effects.animEdgeIntensity > 0;

    if (useTornEffect) {
      const maxDev = mapRange(effects.animEdgeIntensity, 0, 100, 0, borderThickness * 0.35); // Shallower tears
      const numSegments = Math.max(5, Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 5, 50))); // More segments for detail
      const jaggednessFactor = mapRange(effects.animCutoutStyle, 0, 100, 0.3, 0.8);
      let lastDeviation = 0; 

      const getDeviation = () => {
        const randomComponent = (Math.random() - 0.5) * 2 * maxDev;
        let newDeviation = lastDeviation * (1 - jaggednessFactor) + randomComponent * jaggednessFactor;
        newDeviation = Math.max(-maxDev, Math.min(maxDev, newDeviation));
        lastDeviation = newDeviation;
        return newDeviation;
      };
      
      const parallelJitter = () => (Math.random() - 0.5) * (maxDev * 0.3);

      let p1x = 0 + getDeviation(); 
      let p1y = 0 + getDeviation(); 
      paperPath.moveTo(p1x, p1y);
      lastDeviation = p1y; 

      for (let i = 1; i < numSegments; i++) {
        paperPath.lineTo(
          (finalCanvasWidth / numSegments) * i + parallelJitter(), 
          0 + getDeviation() 
        );
      }
      let p2x = finalCanvasWidth + getDeviation(); 
      let p2y = 0 + getDeviation(); 
      paperPath.lineTo(p2x, p2y);
      lastDeviation = p2x - finalCanvasWidth; 

      for (let i = 1; i < numSegments; i++) {
        paperPath.lineTo(
          finalCanvasWidth + getDeviation(), 
          (finalCanvasHeight / numSegments) * i + parallelJitter()
        );
      }
      let p3x = finalCanvasWidth + getDeviation(); 
      let p3y = finalCanvasHeight + getDeviation(); 
      paperPath.lineTo(p3x, p3y);
      lastDeviation = p3y - finalCanvasHeight; 

      for (let i = numSegments - 1; i > 0; i--) {
        paperPath.lineTo(
          (finalCanvasWidth / numSegments) * i + parallelJitter(),
          finalCanvasHeight + getDeviation() 
        );
      }
      let p4x = 0 + getDeviation(); 
      let p4y = finalCanvasHeight + getDeviation(); 
      paperPath.lineTo(p4x, p4y);
      lastDeviation = p4x; 

      for (let i = numSegments - 1; i > 0; i--) {
        paperPath.lineTo(
          0 + getDeviation(), 
          (finalCanvasHeight / numSegments) * i + parallelJitter()
        );
      }
      paperPath.closePath();
      ctx.clip(paperPath);
    } else {
      // If no torn effect, just draw a rectangle for the paper base
      paperPath.rect(0, 0, finalCanvasWidth, finalCanvasHeight);
      // No clip needed here if not torn, but if shadow applied, it's on this rect
    }
    
    // Fill the paper base (clipped or rectangular)
    ctx.fillStyle = 'white';
    ctx.fill(paperPath); // Use fill(path) for complex shapes

    // Clear shadow for subsequent drawing operations if it was applied for the paper shape
    if (shadowStrengthVal > 0) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    
    // Inner dark edge for torn effect
    if (useTornEffect) {
      ctx.save();
      // No need to re-clip if already clipped, but ensure stroke is within the filled area
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'; 
      ctx.lineWidth = 1.5; 
      ctx.stroke(paperPath); // Stroke along the existing (clipped) path
      ctx.restore();
    }

    // Draw the actual image content
    ctx.drawImage(baseImage, imageX, imageY, scaledImgContentWidth, scaledImgContentHeight);
    
    ctx.restore(); // This restore matches the save() before shadow setup & potential clip

    // Apply texture if needed (needs to be done after main drawing and shadow restore)
    const textureStrength = mapRange(effects.animTextureStrength, 0, 100, 0, 0.25);
    if (textureStrength > 0) {
      ctx.save();
      if (useTornEffect) {
        // Re-apply clip for texture to conform to torn edges
        // Note: The paperPath coordinates are relative to the canvas (0,0)
        // This clip should be applied *before* texture drawing.
        const textureClipPath = new Path2D(paperPath); // Create a new instance if paperPath was modified
         ctx.clip(textureClipPath); 
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
    
    // Floating animation control
    if (cardRef.current) {
      const movementStrength = mapRange(effects.animMovement, 0, 100, 0, 12);
      // Make duration inversely proportional to movement strength for more natural effect
      // Faster/shorter duration for stronger movement, slower/longer for subtle movement
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
        {/* Ensure canvas does not exceed its parent's bounds due to high border/shadow values */}
        <canvas ref={canvasRef} className="max-w-full max-h-full rounded shadow-inner"></canvas>
      </CardContent>
    </Card>
  );
}
