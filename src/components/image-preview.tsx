
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
      // Clear canvas if no image
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [imageFile]);


  // Regenerate noise profiles when relevant effects change
  useEffect(() => {
    const maxDeviationBase = 1.0; // This will be scaled by animEdgeIntensity later
    
    const generateProfile = (numKeyPoints: number): NoiseProfile => {
      return Array.from({ length: numKeyPoints }, () => (Math.random() - 0.5) * 2 * maxDeviationBase);
    };

    // Fewer key points for smoother underlying wave, controlled by animEdgeDetails
    const numKeyPoints = Math.max(3, Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 3, 15)));

    setEdgeNoiseProfiles({
      top: generateProfile(numKeyPoints),
      right: generateProfile(numKeyPoints),
      bottom: generateProfile(numKeyPoints),
      left: generateProfile(numKeyPoints),
    });
  }, [effects.animEdgeDetails]);


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
      const baseMaxDeviation = mapRange(effects.animEdgeIntensity, 0, 100, 0, borderThickness * 0.45); // Max depth of tear
      const numSegmentsPerEdge = Math.max(5, Math.floor(mapRange(effects.animEdgeDetails, 0, 100, 10, 50))); // More segments for finer detail overall
      const fibrousJitterStrength = mapRange(effects.animCutoutStyle, 0, 100, 0, baseMaxDeviation * 0.2); // Strength of fine, fibrous jitter

      const getDeviationForSegment = (profile: NoiseProfile, segmentIndex: number, totalSegments: number): number => {
        const progress = segmentIndex / totalSegments;
        const numKeyPoints = profile.length;
        const keyPointIndexFloat = progress * (numKeyPoints - 1);
        const keyPointIndex = Math.floor(keyPointIndexFloat);
        
        const y1 = profile[keyPointIndex];
        const y2 = profile[Math.min(keyPointIndex + 1, numKeyPoints - 1)];
        const segmentProgressInKeyPoint = keyPointIndexFloat - keyPointIndex;
        
        const interpolatedDeviation = cosineInterpolate(y1, y2, segmentProgressInKeyPoint) * baseMaxDeviation;
        const fibrousJitter = (Math.random() - 0.5) * 2 * fibrousJitterStrength;
        return interpolatedDeviation + fibrousJitter;
      };
      
      // Top edge
      paperPath.moveTo(getDeviationForSegment(edgeNoiseProfiles.left, numSegmentsPerEdge, numSegmentsPerEdge), getDeviationForSegment(edgeNoiseProfiles.top, 0, numSegmentsPerEdge));
      for (let i = 1; i <= numSegmentsPerEdge; i++) {
        paperPath.lineTo(
          (finalCanvasWidth / numSegmentsPerEdge) * i + (Math.random() -0.5) * fibrousJitterStrength * 0.5, // Small parallel jitter
          getDeviationForSegment(edgeNoiseProfiles.top, i, numSegmentsPerEdge)
        );
      }
      // Right edge
      for (let i = 1; i <= numSegmentsPerEdge; i++) {
        paperPath.lineTo(
          finalCanvasWidth + getDeviationForSegment(edgeNoiseProfiles.right, i, numSegmentsPerEdge),
          (finalCanvasHeight / numSegmentsPerEdge) * i + (Math.random() -0.5) * fibrousJitterStrength * 0.5
        );
      }
      // Bottom edge
      for (let i = numSegmentsPerEdge -1 ; i >= 0; i--) {
        paperPath.lineTo(
          (finalCanvasWidth / numSegmentsPerEdge) * i + (Math.random() -0.5) * fibrousJitterStrength * 0.5,
          finalCanvasHeight + getDeviationForSegment(edgeNoiseProfiles.bottom, i, numSegmentsPerEdge)
        );
      }
      // Left edge
      for (let i = numSegmentsPerEdge - 1; i >= 0; i--) { // Iterate downwards to close path correctly
        paperPath.lineTo(
          getDeviationForSegment(edgeNoiseProfiles.left, i, numSegmentsPerEdge),
          (finalCanvasHeight / numSegmentsPerEdge) * i + (Math.random() -0.5) * fibrousJitterStrength * 0.5
        );
      }
      paperPath.closePath();
      ctx.clip(paperPath);
    } else {
      paperPath.rect(0, 0, finalCanvasWidth, finalCanvasHeight);
      // No clip if not torn, but fill will respect this path
    }

    ctx.fillStyle = 'white';
    ctx.fill(paperPath);

    if (shadowStrengthVal > 0) { // Remove shadow for subsequent drawing operations
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    if (useTornEffect) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'; // Darker inner edge for depth
      ctx.lineWidth = 1.5;
      ctx.stroke(paperPath); // Stroke the *inside* of the clipped white area
      ctx.restore();
    }

    const imageX = borderThickness;
    const imageY = borderThickness;
    ctx.drawImage(baseImage, imageX, imageY, scaledImgContentWidth, scaledImgContentHeight);
    ctx.restore(); // Restore to pre-clip state if not already (though clip is on main context for now)

    const textureStrength = mapRange(effects.animTextureStrength, 0, 100, 0, 0.25);
    if (textureStrength > 0) {
      ctx.save();
      if (useTornEffect) {
         ctx.clip(paperPath); // Re-apply clip for texture if torn
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
