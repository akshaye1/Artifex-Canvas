
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

    let { width: imgWidth, height: imgHeight } = baseImage;
    let ratio = imgWidth / imgHeight;

    let newWidth = imgWidth;
    let newHeight = imgHeight;

    if (newWidth > baseMaxWidth) {
      newWidth = baseMaxWidth;
      newHeight = newWidth / ratio;
    }
    if (newHeight > baseMaxHeight) {
      newHeight = baseMaxHeight;
      newWidth = newHeight * ratio;
    }
    if (newWidth > baseMaxWidth) { // Re-check due to potential adjustment
        newWidth = baseMaxWidth;
        newHeight = newWidth / ratio;
    }
    
    // Apply animSize for overall scale
    const displayScale = mapRange(effects.animSize, 10, 100, 0.1, 1.0);
    const canvasWidth = newWidth * displayScale;
    const canvasHeight = newHeight * displayScale;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Old filter string is removed
    // ctx.filter = filterString.trim();

    // Apply drop shadow from new controls
    const shadowOffsetX = mapRange(effects.animShadowOffsetX, 0, 100, -20, 20);
    const shadowOffsetY = mapRange(effects.animShadowOffsetY, 0, 100, -20, 20);
    const shadowBlur = mapRange(effects.animShadowBlur, 0, 100, 0, 40);
    const shadowStrength = mapRange(effects.animShadowStrength, 0, 100, 0, 0.6);
    
    if (shadowStrength > 0) {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowStrength})`;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = shadowOffsetX;
        ctx.shadowOffsetY = shadowOffsetY;
    }
    
    // Save context before clipping for edge effects
    ctx.save();

    // Edge Style (detailed torn/cutout effect)
    const edgeThickness = mapRange(effects.animEdgeThickness, 0, 100, 0, Math.min(canvasWidth, canvasHeight) * 0.1); // Max 10% of smallest dim

    if (edgeThickness > 0) {
      const edgeIntensity = mapRange(effects.animEdgeIntensity, 0, 100, 0, edgeThickness * 0.8); // Amplitude relative to thickness
      const edgeDetails = Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 5, 50)); // Number of points/segments
      const cutoutStyleParam = effects.animCutoutStyle / 100; // 0 to 1, for varying randomness or style

      const path = new Path2D();
      
      // Top edge
      path.moveTo(-edgeIntensity * cutoutStyleParam, Math.random() * edgeIntensity - edgeIntensity / 2);
      for (let i = 0; i <= edgeDetails; i++) {
        const x = (canvasWidth / edgeDetails) * i;
        const y = Math.random() * edgeIntensity - edgeIntensity / 2 + (Math.sin(i * cutoutStyleParam * Math.PI * 2) * edgeIntensity * (1-cutoutStyleParam))/2;
        path.lineTo(x, Math.max(0, Math.min(edgeThickness, y + edgeThickness / 2)));
      }
      path.lineTo(canvasWidth + edgeIntensity * cutoutStyleParam, Math.random() * edgeIntensity - edgeIntensity / 2);
      
      // Right edge
      for (let i = 0; i <= edgeDetails; i++) {
        const y = (canvasHeight / edgeDetails) * i;
        const x = canvasWidth - (Math.random() * edgeIntensity - edgeIntensity / 2 + (Math.cos(i * cutoutStyleParam * Math.PI*2) * edgeIntensity * (1-cutoutStyleParam))/2 );
        path.lineTo(Math.max(canvasWidth - edgeThickness, Math.min(canvasWidth, x - edgeThickness / 2)), y);
      }
      path.lineTo(canvasWidth + edgeIntensity * cutoutStyleParam, canvasHeight + edgeIntensity * cutoutStyleParam);

      // Bottom edge
      for (let i = edgeDetails; i >= 0; i--) {
        const x = (canvasWidth / edgeDetails) * i;
        const y = canvasHeight - (Math.random() * edgeIntensity - edgeIntensity / 2 + (Math.sin(i * cutoutStyleParam * Math.PI*2 + Math.PI) * edgeIntensity * (1-cutoutStyleParam))/2);
        path.lineTo(x, Math.max(canvasHeight - edgeThickness, Math.min(canvasHeight, y - edgeThickness / 2)));
      }
      path.lineTo(-edgeIntensity * cutoutStyleParam, canvasHeight + edgeIntensity * cutoutStyleParam);
      
      // Left edge
      for (let i = edgeDetails; i >= 0; i--) {
        const y = (canvasHeight / edgeDetails) * i;
        const x = Math.random() * edgeIntensity - edgeIntensity / 2 + (Math.cos(i * cutoutStyleParam * Math.PI*2 + Math.PI) * edgeIntensity * (1-cutoutStyleParam))/2;
        path.lineTo(Math.max(0, Math.min(edgeThickness, x + edgeThickness / 2)), y);
      }
      path.closePath();
      ctx.clip(path);
    }

    ctx.drawImage(baseImage, 0, 0, canvasWidth, canvasHeight);
    ctx.restore(); // Restore context after clipping (and drawing main image)

    // Reset shadow for subsequent drawing operations like texture
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    // ctx.filter = 'none'; // Old filter

    // Paper Texture
    const textureStrength = mapRange(effects.animTextureStrength, 0, 100, 0, 0.25); // Max 25% opacity
    if (textureStrength > 0) {
      ctx.save();
      ctx.globalAlpha = textureStrength;
      // Simple cross-hatch like texture or noise
      ctx.fillStyle = 'rgba(180, 170, 150, 0.5)'; // Muted brown/gray
      for (let i = 0; i < canvasWidth * canvasHeight * 0.001 * (effects.animTextureStrength / 20) ; i++) { // Density based on strength
        const x = Math.random() * canvasWidth;
        const y = Math.random() * canvasHeight;
        const size = Math.random() * 2 + 0.5;
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
    
    // Vignette removed

    // Floating motion CSS variables
    if (cardRef.current) {
      const movementStrength = mapRange(effects.animMovement, 0, 100, 0, 12); // 0px to 12px translation
      const movementDuration = mapRange(effects.animMovement, 0, 100, 15, 5); // 15s (slow) to 5s (fast)
      
      cardRef.current.style.setProperty('--float-translateY', `-${movementStrength}px`);
      cardRef.current.style.setProperty('--float-duration', `${movementDuration}s`);
    }


  }, [baseImage, effects, error, imageFile]);

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "shadow-xl h-full transition-all duration-500",
         effects.animMovement > 0 && "animate-float-dynamic" // Use new dynamic float class
      )}
      // style object for CSS variables will be set in useEffect for animMovement
      >
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-primary" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center aspect-[4/3] bg-muted/20 rounded-b-lg overflow-hidden p-2">
        <canvas ref={canvasRef} className="max-w-full max-h-full rounded shadow-inner bg-card"></canvas>
      </CardContent>
    </Card>
  );
}
