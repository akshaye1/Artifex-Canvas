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

function cosineInterpolate(y1: number, y2: number, mu: number): number {
  const mu2 = (1 - Math.cos(mu * Math.PI)) / 2;
  return y1 * (1 - mu2) + y2 * mu2;
}

// Enhanced noise generation for more realistic paper tears
function generatePerlinNoise(width: number, height: number, scale: number = 0.1): number[][] {
  const noise: number[][] = [];
  for (let x = 0; x < width; x++) {
    noise[x] = [];
    for (let y = 0; y < height; y++) {
      noise[x][y] = Math.random();
    }
  }
  return noise;
}

function smoothNoise(baseNoise: number[][], x: number, y: number): number {
  const intX = Math.floor(x);
  const intY = Math.floor(y);
  const fracX = x - intX;
  const fracY = y - intY;

  const v1 = baseNoise[intX % baseNoise.length]?.[intY % baseNoise[0].length] || 0;
  const v2 = baseNoise[(intX + 1) % baseNoise.length]?.[intY % baseNoise[0].length] || 0;
  const v3 = baseNoise[intX % baseNoise.length]?.[((intY + 1) % baseNoise[0].length)] || 0;
  const v4 = baseNoise[(intX + 1) % baseNoise.length]?.[((intY + 1) % baseNoise[0].length)] || 0;

  const i1 = cosineInterpolate(v1, v2, fracX);
  const i2 = cosineInterpolate(v3, v4, fracX);
  return cosineInterpolate(i1, i2, fracY);
}

type NoiseProfile = number[];
interface EdgeNoiseProfiles {
  top: NoiseProfile;
  right: NoiseProfile;
  bottom: NoiseProfile;
  left: NoiseProfile;
}

export function ImagePreview({ imageFile, effects }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [edgeNoiseProfiles, setEdgeNoiseProfiles] = useState<EdgeNoiseProfiles | null>(null);

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

  // Enhanced noise profile generation for more realistic torn paper
  useEffect(() => {
    const generateTornEdgeProfile = (numKeyPoints: number): NoiseProfile => {
      const profile: NoiseProfile = [];
      
      // Create base wave with varying amplitude
      for (let i = 0; i < numKeyPoints; i++) {
        const progress = i / (numKeyPoints - 1);
        
        // Create natural variation in tear depth
        const baseAmplitude = 0.3 + 0.7 * Math.sin(progress * Math.PI * 2.3) * Math.sin(progress * Math.PI * 1.7);
        
        // Add multiple octaves of noise for complexity
        let noise = 0;
        noise += Math.sin(progress * Math.PI * 8) * 0.4;
        noise += Math.sin(progress * Math.PI * 16) * 0.2;
        noise += Math.sin(progress * Math.PI * 32) * 0.1;
        noise += (Math.random() - 0.5) * 0.6; // Random component
        
        profile.push(baseAmplitude * noise);
      }
      
      return profile;
    };

    const numKeyPoints = Math.max(8, Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 8, 40)));
    
    setEdgeNoiseProfiles({
      top: generateTornEdgeProfile(numKeyPoints),
      right: generateTornEdgeProfile(numKeyPoints),
      bottom: generateTornEdgeProfile(numKeyPoints),
      left: generateTornEdgeProfile(numKeyPoints),
    });
  }, [effects.animEdgeDetails, effects.animEdgeIntensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !edgeNoiseProfiles) return;
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

    const borderThickness = mapRange(effects.animEdgeThickness, 0, 100, 0, Math.min(scaledImgContentWidth, scaledImgContentHeight) * 0.25);
    const finalCanvasWidth = scaledImgContentWidth + 2 * borderThickness;
    const finalCanvasHeight = scaledImgContentHeight + 2 * borderThickness;

    canvas.width = finalCanvasWidth;
    canvas.height = finalCanvasHeight;
    ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);
    ctx.save();

    // Enhanced shadow with multiple layers for depth
    const shadowOffsetXVal = mapRange(effects.animShadowOffsetX, 0, 100, -25, 25);
    const shadowOffsetYVal = mapRange(effects.animShadowOffsetY, 0, 100, -25, 25);
    const shadowBlurVal = mapRange(effects.animShadowBlur, 0, 100, 0, 50);
    const shadowStrengthVal = mapRange(effects.animShadowStrength, 0, 100, 0, 0.8);

    const useTornEffect = borderThickness > 0.01 && effects.animEdgeIntensity > 0;
    const paperPath = new Path2D();

    if (useTornEffect) {
      // Enhanced torn paper generation
      const baseMaxDeviation = mapRange(effects.animEdgeIntensity, 0, 100, 0, borderThickness * 0.8);
      const numSegmentsPerEdge = Math.max(20, Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 20, 100)));
      const fibrousJitterStrength = mapRange(effects.animCutoutStyle, 0, 100, 0, baseMaxDeviation * 0.4);

      const getEnhancedDeviation = (profile: NoiseProfile, segmentIndex: number, totalSegments: number): number => {
        const progress = segmentIndex / totalSegments;
        const numKeyPoints = profile.length;
        const keyPointIndexFloat = progress * (numKeyPoints - 1);
        const keyPointIndex = Math.floor(keyPointIndexFloat);
        
        const y1 = profile[keyPointIndex] || 0;
        const y2 = profile[Math.min(keyPointIndex + 1, numKeyPoints - 1)] || 0;
        const segmentProgressInKeyPoint = keyPointIndexFloat - keyPointIndex;
        
        const interpolatedDeviation = cosineInterpolate(y1, y2, segmentProgressInKeyPoint) * baseMaxDeviation;
        
        // Add multiple layers of noise for realistic paper fiber effect
        const fiberNoise1 = (Math.random() - 0.5) * fibrousJitterStrength;
        const fiberNoise2 = (Math.random() - 0.5) * fibrousJitterStrength * 0.5;
        const fiberNoise3 = (Math.random() - 0.5) * fibrousJitterStrength * 0.25;
        
        return interpolatedDeviation + fiberNoise1 + fiberNoise2 + fiberNoise3;
      };

      // Create more organic torn edges with micro-variations
      const addTornEdgeSegments = (startX: number, startY: number, endX: number, endY: number, profile: NoiseProfile, isHorizontal: boolean) => {
        const segments = Math.floor(numSegmentsPerEdge * Math.abs(isHorizontal ? (endX - startX) : (endY - startY)) / Math.max(finalCanvasWidth, finalCanvasHeight));
        
        for (let i = 0; i <= segments; i++) {
          const progress = i / segments;
          const baseX = startX + (endX - startX) * progress;
          const baseY = startY + (endY - startY) * progress;
          
          const deviation = getEnhancedDeviation(profile, i, segments);
          
          // Add perpendicular deviation for torn effect
          let finalX = baseX;
          let finalY = baseY;
          
          if (isHorizontal) {
            finalY += deviation;
            // Add small parallel variations for more organic look
            finalX += (Math.random() - 0.5) * fibrousJitterStrength * 0.3;
          } else {
            finalX += deviation;
            finalY += (Math.random() - 0.5) * fibrousJitterStrength * 0.3;
          }
          
          if (i === 0) {
            paperPath.moveTo(finalX, finalY);
          } else {
            // Use quadratic curves for smoother, more natural tears
            const prevProgress = (i - 1) / segments;
            const prevBaseX = startX + (endX - startX) * prevProgress;
            const prevBaseY = startY + (endY - startY) * prevProgress;
            const controlX = (prevBaseX + baseX) / 2 + (Math.random() - 0.5) * fibrousJitterStrength * 0.2;
            const controlY = (prevBaseY + baseY) / 2 + (Math.random() - 0.5) * fibrousJitterStrength * 0.2;
            
            paperPath.quadraticCurveTo(controlX, controlY, finalX, finalY);
          }
        }
      };

      // Generate all four torn edges
      paperPath.moveTo(getEnhancedDeviation(edgeNoiseProfiles.left, numSegmentsPerEdge, numSegmentsPerEdge), getEnhancedDeviation(edgeNoiseProfiles.top, 0, numSegmentsPerEdge));
      
      // Top edge
      addTornEdgeSegments(0, 0, finalCanvasWidth, 0, edgeNoiseProfiles.top, true);
      
      // Right edge  
      addTornEdgeSegments(finalCanvasWidth, 0, finalCanvasWidth, finalCanvasHeight, edgeNoiseProfiles.right, false);
      
      // Bottom edge
      addTornEdgeSegments(finalCanvasWidth, finalCanvasHeight, 0, finalCanvasHeight, edgeNoiseProfiles.bottom, true);
      
      // Left edge
      addTornEdgeSegments(0, finalCanvasHeight, 0, 0, edgeNoiseProfiles.left, false);
      
      paperPath.closePath();

      // Apply multiple shadow layers for depth
      if (shadowStrengthVal > 0) {
        ctx.save();
        
        // Main shadow
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowStrengthVal})`;
        ctx.shadowBlur = shadowBlurVal;
        ctx.shadowOffsetX = shadowOffsetXVal;
        ctx.shadowOffsetY = shadowOffsetYVal;
        ctx.fillStyle = 'white';
        ctx.fill(paperPath);
        
        // Secondary softer shadow for more depth
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowStrengthVal * 0.3})`;
        ctx.shadowBlur = shadowBlurVal * 2;
        ctx.shadowOffsetX = shadowOffsetXVal * 0.5;
        ctx.shadowOffsetY = shadowOffsetYVal * 0.5;
        ctx.fill(paperPath);
        
        ctx.restore();
      }

      // Clip to the torn shape
      ctx.clip(paperPath);
    } else {
      // Simple rectangle for no torn effect
      paperPath.rect(0, 0, finalCanvasWidth, finalCanvasHeight);
      
      if (shadowStrengthVal > 0) {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowStrengthVal})`;
        ctx.shadowBlur = shadowBlurVal;
        ctx.shadowOffsetX = shadowOffsetXVal;
        ctx.shadowOffsetY = shadowOffsetYVal;
      }
    }

    // Fill the paper background
    ctx.fillStyle = '#fefefe'; // Slightly off-white for more realistic paper
    ctx.fill(paperPath);

    // Reset shadow for subsequent operations
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Add paper edge effects
    if (useTornEffect) {
      ctx.save();
      
      // Inner shadow/depth on torn edges
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke(paperPath);
      
      // Highlight on torn edges for 3D effect
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.stroke(paperPath);
      ctx.setLineDash([]);
      
      ctx.restore();
    }

    // Draw the image
    const imageX = borderThickness;
    const imageY = borderThickness;
    ctx.drawImage(baseImage, imageX, imageY, scaledImgContentWidth, scaledImgContentHeight);

    // Enhanced paper texture
    const textureStrength = mapRange(effects.animTextureStrength, 0, 100, 0, 0.4);
    if (textureStrength > 0) {
      ctx.save();
      if (useTornEffect) {
        ctx.clip(paperPath);
      }
      
      // Create paper grain texture
      const imageData = ctx.getImageData(0, 0, finalCanvasWidth, finalCanvasHeight);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * textureStrength * 50;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // Red
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // Green  
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // Blue
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Add subtle paper fibers
      ctx.globalAlpha = textureStrength * 0.3;
      for (let i = 0; i < finalCanvasWidth * finalCanvasHeight * 0.0005; i++) {
        const x = Math.random() * finalCanvasWidth;
        const y = Math.random() * finalCanvasHeight;
        const length = Math.random() * 3 + 1;
        const angle = Math.random() * Math.PI * 2;
        
        ctx.strokeStyle = `rgba(${180 + Math.random() * 40}, ${170 + Math.random() * 40}, ${150 + Math.random() * 40}, 0.6)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }

    ctx.restore();

    // Apply floating animation
    if (cardRef.current) {
      const movementStrength = mapRange(effects.animMovement, 0, 100, 0, 12);
      const movementDuration = mapRange(effects.animMovement, 0, 100, 15, 5);
      cardRef.current.style.setProperty('--float-translateY', `-${movementStrength}px`);
      cardRef.current.style.setProperty('--float-duration', `${movementDuration}s`);
    }

  }, [baseImage, effects, error, imageFile, edgeNoiseProfiles]);

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