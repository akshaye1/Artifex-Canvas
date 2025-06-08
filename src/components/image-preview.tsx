
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
    const baseMaxWidth = container?.clientWidth ? Math.max(container.clientWidth - 32, 300) : 600; 
    const baseMaxHeight = 500; 

    let { width: imgOriginalWidth, height: imgOriginalHeight } = baseImage;
    let ratio = imgOriginalWidth / imgOriginalHeight;

    let scaledImgWidth = imgOriginalWidth;
    let scaledImgHeight = imgOriginalHeight;

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

    const imageContentScale = mapRange(effects.animSize, 10, 100, 0.2, 1.0);
    scaledImgWidth *= imageContentScale;
    scaledImgHeight *= imageContentScale;

    const borderSize = mapRange(effects.animEdgeThickness, 0, 100, 0, Math.min(scaledImgWidth, scaledImgHeight) * 0.20);

    const finalCanvasWidth = scaledImgWidth + 2 * borderSize;
    const finalCanvasHeight = scaledImgHeight + 2 * borderSize;

    canvas.width = finalCanvasWidth;
    canvas.height = finalCanvasHeight;
    ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);

    const imageX = borderSize;
    const imageY = borderSize;
    
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
    const useTornEffect = borderSize > 0.01 && effects.animEdgeIntensity > 0;

    if (useTornEffect) {
      const maxDev = mapRange(effects.animEdgeIntensity, 0, 100, 0, borderSize * 0.98);
      const numSegments = Math.max(3, Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 3, 25)));
      
      // animCutoutStyle (0-100) influences the tear's character
      // Low style: smoother, wavier (more "memory" of last deviation). High style: more jagged, frequent details (more randomness).
      const jaggednessFactor = mapRange(effects.animCutoutStyle, 0, 100, 0.3, 0.8);

      let lastDeviation = 0; 

      const getDeviation = () => {
        const randomComponent = (Math.random() - 0.5) * 2 * maxDev; // Deviation can be positive or negative
        let newDeviation = lastDeviation * (1 - jaggednessFactor) + randomComponent * jaggednessFactor;
        newDeviation = Math.max(-maxDev, Math.min(maxDev, newDeviation));
        lastDeviation = newDeviation;
        return newDeviation;
      };
      
      const parallelJitter = () => (Math.random() - 0.5) * (maxDev * 0.3); // Smaller jitter along the edge

      // Start at top-left, applying deviation
      let p1x = 0 + getDeviation(); 
      let p1y = 0 + getDeviation(); 
      paperPath.moveTo(p1x, p1y);
      lastDeviation = p1y; // Initialize for top edge (Y deviation)

      // Top edge (horizontal: x changes, y deviates from y=0)
      for (let i = 1; i < numSegments; i++) {
        paperPath.lineTo(
          (finalCanvasWidth / numSegments) * i + parallelJitter(), 
          0 + getDeviation() 
        );
      }
      let p2x = finalCanvasWidth + getDeviation(); 
      let p2y = 0 + getDeviation(); 
      paperPath.lineTo(p2x, p2y);
      lastDeviation = p2x - finalCanvasWidth; // Initialize for right edge (X deviation relative to edge)

      // Right edge (vertical: y changes, x deviates from x=finalCanvasWidth)
      for (let i = 1; i < numSegments; i++) {
        paperPath.lineTo(
          finalCanvasWidth + getDeviation(), 
          (finalCanvasHeight / numSegments) * i + parallelJitter()
        );
      }
      let p3x = finalCanvasWidth + getDeviation(); 
      let p3y = finalCanvasHeight + getDeviation(); 
      paperPath.lineTo(p3x, p3y);
      lastDeviation = p3y - finalCanvasHeight; // Initialize for bottom edge (Y deviation relative to edge)

      // Bottom edge (horizontal: x changes, y deviates from y=finalCanvasHeight) - from right to left
      for (let i = numSegments - 1; i > 0; i--) {
        paperPath.lineTo(
          (finalCanvasWidth / numSegments) * i + parallelJitter(),
          finalCanvasHeight + getDeviation() 
        );
      }
      let p4x = 0 + getDeviation(); 
      let p4y = finalCanvasHeight + getDeviation(); 
      paperPath.lineTo(p4x, p4y);
      lastDeviation = p4x; // Initialize for left edge (X deviation relative to edge)

      // Left edge (vertical: y changes, x deviates from x=0) - from bottom to top
      for (let i = numSegments - 1; i > 0; i--) {
        paperPath.lineTo(
          0 + getDeviation(), 
          (finalCanvasHeight / numSegments) * i + parallelJitter()
        );
      }
      paperPath.closePath();
      ctx.clip(paperPath);
    }
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);

    if (shadowStrengthVal > 0) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    ctx.drawImage(baseImage, imageX, imageY, scaledImgWidth, scaledImgHeight);
    
    ctx.restore(); 


    const textureStrength = mapRange(effects.animTextureStrength, 0, 100, 0, 0.25);
    if (textureStrength > 0) {
      ctx.save();
      if (useTornEffect) {
        ctx.clip(paperPath); 
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
        <canvas ref={canvasRef} className="max-w-full max-h-full rounded shadow-inner"></canvas>
      </CardContent>
    </Card>
  );
}

