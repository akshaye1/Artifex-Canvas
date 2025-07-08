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

// Smooth interpolation for natural curves
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Generate natural paper tear using multiple noise octaves
function generateNaturalTear(length: number, intensity: number, detail: number): number[] {
  const points: number[] = [];
  const numPoints = Math.max(20, Math.floor(detail * 0.8));
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    let value = 0;
    
    // Multiple octaves of noise for natural variation
    value += Math.sin(t * Math.PI * 2) * 0.3; // Base wave
    value += Math.sin(t * Math.PI * 6) * 0.2; // Medium frequency
    value += Math.sin(t * Math.PI * 12) * 0.1; // High frequency
    value += (Math.random() - 0.5) * 0.4; // Random variation
    
    // Apply intensity and create natural fade at edges
    const edgeFade = Math.sin(t * Math.PI);
    value *= intensity * edgeFade;
    
    points.push(value);
  }
  
  return points;
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
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        setError("Could not read file. Please try again.");
        setBaseImage(null);
      };
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

    const borderThickness = mapRange(effects.animEdgeThickness, 0, 100, 0, Math.min(scaledImgContentWidth, scaledImgContentHeight) * 0.15);
    const finalCanvasWidth = scaledImgContentWidth + 2 * borderThickness;
    const finalCanvasHeight = scaledImgContentHeight + 2 * borderThickness;

    canvas.width = finalCanvasWidth;
    canvas.height = finalCanvasHeight;
    ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);

    // Shadow settings
    const shadowOffsetXVal = mapRange(effects.animShadowOffsetX, 0, 100, -15, 15);
    const shadowOffsetYVal = mapRange(effects.animShadowOffsetY, 0, 100, -15, 15);
    const shadowBlurVal = mapRange(effects.animShadowBlur, 0, 100, 0, 30);
    const shadowStrengthVal = mapRange(effects.animShadowStrength, 0, 100, 0, 0.6);

    const useTornEffect = borderThickness > 2 && effects.animEdgeIntensity > 5;

    if (useTornEffect) {
      // Generate natural torn paper shape
      const tearIntensity = mapRange(effects.animEdgeIntensity, 0, 100, 0, borderThickness * 0.8);
      const tearDetail = mapRange(effects.animEdgeDetails, 0, 100, 20, 80);
      
      // Generate tear patterns for each edge
      const topTear = generateNaturalTear(finalCanvasWidth, tearIntensity, tearDetail);
      const rightTear = generateNaturalTear(finalCanvasHeight, tearIntensity, tearDetail);
      const bottomTear = generateNaturalTear(finalCanvasWidth, tearIntensity, tearDetail);
      const leftTear = generateNaturalTear(finalCanvasHeight, tearIntensity, tearDetail);

      // Create the torn paper path
      const paperPath = new Path2D();
      
      // Start from top-left corner
      paperPath.moveTo(leftTear[0], topTear[0]);
      
      // Top edge - left to right
      for (let i = 0; i < topTear.length; i++) {
        const x = (i / (topTear.length - 1)) * finalCanvasWidth;
        const y = topTear[i];
        if (i === 0) {
          paperPath.moveTo(x, y);
        } else {
          // Use smooth curves instead of straight lines
          const prevX = ((i - 1) / (topTear.length - 1)) * finalCanvasWidth;
          const prevY = topTear[i - 1];
          const cpX = (prevX + x) / 2;
          const cpY = (prevY + y) / 2;
          paperPath.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
      }
      
      // Right edge - top to bottom
      for (let i = 1; i < rightTear.length; i++) {
        const x = finalCanvasWidth + rightTear[i];
        const y = (i / (rightTear.length - 1)) * finalCanvasHeight;
        const prevX = finalCanvasWidth + rightTear[i - 1];
        const prevY = ((i - 1) / (rightTear.length - 1)) * finalCanvasHeight;
        const cpX = (prevX + x) / 2;
        const cpY = (prevY + y) / 2;
        paperPath.quadraticCurveTo(prevX, prevY, cpX, cpY);
      }
      
      // Bottom edge - right to left
      for (let i = bottomTear.length - 2; i >= 0; i--) {
        const x = (i / (bottomTear.length - 1)) * finalCanvasWidth;
        const y = finalCanvasHeight + bottomTear[i];
        const nextX = ((i + 1) / (bottomTear.length - 1)) * finalCanvasWidth;
        const nextY = finalCanvasHeight + bottomTear[i + 1];
        const cpX = (nextX + x) / 2;
        const cpY = (nextY + y) / 2;
        paperPath.quadraticCurveTo(nextX, nextY, cpX, cpY);
      }
      
      // Left edge - bottom to top
      for (let i = leftTear.length - 2; i >= 0; i--) {
        const x = leftTear[i];
        const y = (i / (leftTear.length - 1)) * finalCanvasHeight;
        const nextX = leftTear[i + 1];
        const nextY = ((i + 1) / (leftTear.length - 1)) * finalCanvasHeight;
        const cpX = (nextX + x) / 2;
        const cpY = (nextY + y) / 2;
        paperPath.quadraticCurveTo(nextX, nextY, cpX, cpY);
      }
      
      paperPath.closePath();

      // Apply shadow
      if (shadowStrengthVal > 0) {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowStrengthVal})`;
        ctx.shadowBlur = shadowBlurVal;
        ctx.shadowOffsetX = shadowOffsetXVal;
        ctx.shadowOffsetY = shadowOffsetYVal;
        
        // Create paper background with slight texture
        const gradient = ctx.createLinearGradient(0, 0, finalCanvasWidth, finalCanvasHeight);
        gradient.addColorStop(0, '#fefefe');
        gradient.addColorStop(0.5, '#fdfdfd');
        gradient.addColorStop(1, '#fcfcfc');
        ctx.fillStyle = gradient;
        ctx.fill(paperPath);
        
        ctx.restore();
      } else {
        // No shadow version
        const gradient = ctx.createLinearGradient(0, 0, finalCanvasWidth, finalCanvasHeight);
        gradient.addColorStop(0, '#fefefe');
        gradient.addColorStop(0.5, '#fdfdfd');
        gradient.addColorStop(1, '#fcfcfc');
        ctx.fillStyle = gradient;
        ctx.fill(paperPath);
      }

      // Add subtle edge shading for depth
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke(paperPath);
      ctx.restore();

      // Clip to the torn shape for the image
      ctx.clip(paperPath);
    } else {
      // Simple rectangle with shadow
      if (shadowStrengthVal > 0) {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowStrengthVal})`;
        ctx.shadowBlur = shadowBlurVal;
        ctx.shadowOffsetX = shadowOffsetXVal;
        ctx.shadowOffsetY = shadowOffsetYVal;
      }
      
      ctx.fillStyle = '#fefefe';
      ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);
      
      if (shadowStrengthVal > 0) {
        ctx.restore();
      }
    }

    // Reset shadow for image drawing
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw the image
    const imageX = borderThickness;
    const imageY = borderThickness;
    ctx.drawImage(baseImage, imageX, imageY, scaledImgContentWidth, scaledImgContentHeight);

    // Add paper texture
    const textureStrength = mapRange(effects.animTextureStrength, 0, 100, 0, 0.3);
    if (textureStrength > 0) {
      ctx.save();
      ctx.globalAlpha = textureStrength;
      
      // Create subtle paper grain
      const imageData = ctx.getImageData(0, 0, finalCanvasWidth, finalCanvasHeight);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      
      ctx.putImageData(imageData, 0, 0);
      ctx.restore();
    }

    // Apply floating animation
    if (cardRef.current) {
      const movementStrength = mapRange(effects.animMovement, 0, 100, 0, 8);
      const movementDuration = mapRange(effects.animMovement, 0, 100, 12, 4);
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