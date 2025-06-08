
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

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMin === inMax) return outMin; 
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
    
    const imageContentScale = mapRange(effects.animSize, 10, 100, 0.2, 1.0);
    let scaledImgContentWidth = imgOriginalWidth * imageContentScale;
    let scaledImgContentHeight = imgOriginalHeight * imageContentScale;

    let contentAspectRatio = scaledImgContentWidth / scaledImgContentHeight;

    if (scaledImgContentWidth > baseMaxWidth) {
      scaledImgContentWidth = baseMaxWidth;
      scaledImgContentHeight = scaledImgContentWidth / contentAspectRatio;
    }
    if (scaledImgContentHeight > baseMaxHeight) {
      scaledImgContentHeight = baseMaxHeight;
      scaledImgContentWidth = scaledImgContentHeight * contentAspectRatio;
    }
     if (scaledImgContentWidth > baseMaxWidth) { 
        scaledImgContentWidth = baseMaxWidth;
        scaledImgContentHeight = scaledImgContentWidth / contentAspectRatio;
    }
     if (scaledImgContentHeight > baseMaxHeight) {
        scaledImgContentHeight = baseMaxHeight;
        scaledImgContentWidth = scaledImgContentHeight * contentAspectRatio;
    }
    
    const borderThickness = mapRange(effects.animEdgeThickness, 0, 100, 0, Math.min(scaledImgContentWidth, scaledImgContentHeight) * 0.20);

    const finalCanvasWidth = scaledImgContentWidth + 2 * borderThickness;
    const finalCanvasHeight = scaledImgContentHeight + 2 * borderThickness;

    canvas.width = finalCanvasWidth;
    canvas.height = finalCanvasHeight;
    ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);
    
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
      const baseMaxDev = mapRange(effects.animEdgeIntensity, 0, 100, 0, borderThickness * 0.30); 
      const numSegments = Math.max(5, Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 5, 75)));
      const jaggednessFactor = mapRange(effects.animCutoutStyle, 0, 100, 0.1, 0.9);
      let lastDeviation = 0; 

      const getDeviation = (currentLocalMaxDev: number) => {
        const randomComponent = (Math.random() - 0.5) * 2 * currentLocalMaxDev;
        let newDeviation = lastDeviation * (1 - jaggednessFactor) + randomComponent * jaggednessFactor;
        newDeviation = Math.max(-currentLocalMaxDev, Math.min(currentLocalMaxDev, newDeviation));
        lastDeviation = newDeviation;
        return newDeviation;
      };
      
      const getParallelJitter = (currentLocalMaxDev: number) => (Math.random() - 0.5) * (currentLocalMaxDev * 0.2);

      let currentMaxDev = baseMaxDev * (0.8 + Math.random() * 0.4);
      let p1x = 0 + getDeviation(currentMaxDev); 
      let p1y = 0 + getDeviation(currentMaxDev); 
      paperPath.moveTo(p1x, p1y);
      lastDeviation = p1y; 

      for (let i = 1; i < numSegments; i++) {
        currentMaxDev = baseMaxDev * (0.8 + Math.random() * 0.4);
        paperPath.lineTo(
          (finalCanvasWidth / numSegments) * i + getParallelJitter(currentMaxDev), 
          0 + getDeviation(currentMaxDev) 
        );
      }
      currentMaxDev = baseMaxDev * (0.8 + Math.random() * 0.4);
      let p2x = finalCanvasWidth + getDeviation(currentMaxDev); 
      let p2y = 0 + getDeviation(currentMaxDev); 
      paperPath.lineTo(p2x, p2y);
      lastDeviation = p2x - finalCanvasWidth; 

      for (let i = 1; i < numSegments; i++) {
        currentMaxDev = baseMaxDev * (0.8 + Math.random() * 0.4);
        paperPath.lineTo(
          finalCanvasWidth + getDeviation(currentMaxDev), 
          (finalCanvasHeight / numSegments) * i + getParallelJitter(currentMaxDev)
        );
      }
      currentMaxDev = baseMaxDev * (0.8 + Math.random() * 0.4);
      let p3x = finalCanvasWidth + getDeviation(currentMaxDev); 
      let p3y = finalCanvasHeight + getDeviation(currentMaxDev); 
      paperPath.lineTo(p3x, p3y);
      lastDeviation = p3y - finalCanvasHeight; 

      for (let i = numSegments - 1; i > 0; i--) {
        currentMaxDev = baseMaxDev * (0.8 + Math.random() * 0.4);
        paperPath.lineTo(
          (finalCanvasWidth / numSegments) * i + getParallelJitter(currentMaxDev),
          finalCanvasHeight + getDeviation(currentMaxDev) 
        );
      }
      currentMaxDev = baseMaxDev * (0.8 + Math.random() * 0.4);
      let p4x = 0 + getDeviation(currentMaxDev); 
      let p4y = finalCanvasHeight + getDeviation(currentMaxDev); 
      paperPath.lineTo(p4x, p4y);
      lastDeviation = p4x; 

      for (let i = numSegments - 1; i > 0; i--) {
        currentMaxDev = baseMaxDev * (0.8 + Math.random() * 0.4);
        paperPath.lineTo(
          0 + getDeviation(currentMaxDev), 
          (finalCanvasHeight / numSegments) * i + getParallelJitter(currentMaxDev)
        );
      }
      paperPath.closePath();
      ctx.clip(paperPath);
    } else {
      paperPath.rect(0, 0, finalCanvasWidth, finalCanvasHeight);
    }
    
    ctx.fillStyle = 'white';
    ctx.fill(paperPath);

    if (shadowStrengthVal > 0) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    
    if (useTornEffect) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'; 
      ctx.lineWidth = 1.5; 
      ctx.stroke(paperPath);
      ctx.restore();
    }

    const imageX = borderThickness;
    const imageY = borderThickness;
    ctx.drawImage(baseImage, imageX, imageY, scaledImgContentWidth, scaledImgContentHeight);
    
    ctx.restore(); 

    const textureStrength = mapRange(effects.animTextureStrength, 0, 100, 0, 0.25);
    if (textureStrength > 0) {
      ctx.save();
      if (useTornEffect) {
        const textureClipPath = new Path2D(paperPath); 
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

