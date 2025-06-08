
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

export function ImagePreview({ imageFile, effects }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (imageFile) {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setBaseImage(img);
        };
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
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
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
            ctx.fillStyle = 'hsl(var(--destructive))'; // Ensure this matches theme for errors
            ctx.textAlign = 'center';
            ctx.font = '16px var(--font-body)';
            ctx.fillText(error, canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    
    const container = canvas.parentElement;
    const maxWidth = container?.clientWidth ? Math.max(container.clientWidth - 32, 300) : 600;
    const maxHeight = 500; 

    let { width: imgWidth, height: imgHeight } = baseImage;
    let ratio = imgWidth / imgHeight;

    let newWidth = imgWidth;
    let newHeight = imgHeight;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / ratio;
    }
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * ratio;
    }
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / ratio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.clearRect(0, 0, newWidth, newHeight);

    // Apply filters
    let filterString = '';
    filterString += `brightness(${effects.brightness}%) `;
    filterString += `contrast(${effects.contrast}%) `;
    filterString += `sepia(${effects.sepia}%) `;
    if (effects.grayscale) {
      filterString += `grayscale(100%) `;
    }
    ctx.filter = filterString.trim();

    // Apply drop shadow if enabled (before drawing image)
    if (effects.dropShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
    }
    
    ctx.drawImage(baseImage, 0, 0, newWidth, newHeight);

    // Reset shadow and filter for subsequent drawing operations
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.filter = 'none';

    // Paper Texture
    if (effects.paperTexture !== 'none') {
      ctx.save();
      ctx.globalAlpha = effects.paperTexture === 'canvas' ? 0.15 : 0.2; // Slightly more prominent
      if (effects.paperTexture === 'canvas') {
        ctx.fillStyle = 'rgba(220, 210, 190, 0.2)'; 
        ctx.fillRect(0, 0, newWidth, newHeight);
      } else if (effects.paperTexture === 'watercolor') {
        for (let i = 0; i < newWidth * newHeight * 0.05; i++) { // More specks
          const x = Math.random() * newWidth;
          const y = Math.random() * newHeight;
          const alpha = Math.random() * 0.08;
          ctx.fillStyle = `rgba(100, 80, 60, ${alpha})`;
          ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
        }
      }
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }

    // Edge Style - Enhanced Torn Edge
    if (effects.edgeStyle === 'torn') {
      ctx.save();
      const path = new Path2D();
      let step = 15; // Smaller step for more detail
      let roughness = Math.min(newWidth, newHeight) * 0.025; // Increased relative roughness

      // Top edge
      path.moveTo(0, (Math.random() - 0.5) * roughness);
      for (let i = 0; i < newWidth; i += (step + (Math.random() -0.5) * step * 0.8)) {
        path.lineTo(Math.min(i, newWidth), (Math.random() - 0.5) * roughness * (Math.random()*0.5 + 0.75) );
      }
      path.lineTo(newWidth, (Math.random() - 0.5) * roughness);

      // Right edge
      for (let i = 0; i < newHeight; i += (step + (Math.random() -0.5) * step * 0.8)) {
        path.lineTo(newWidth + (Math.random() - 0.5) * roughness * (Math.random()*0.5 + 0.75), Math.min(i, newHeight));
      }
      path.lineTo(newWidth + (Math.random() - 0.5) * roughness, newHeight);
      
      // Bottom edge
      for (let i = newWidth; i > 0; i -= (step + (Math.random() -0.5) * step * 0.8)) {
        path.lineTo(Math.max(i,0), newHeight + (Math.random() - 0.5) * roughness * (Math.random()*0.5 + 0.75));
      }
      path.lineTo(0, newHeight + (Math.random() - 0.5) * roughness);

      // Left edge
      for (let i = newHeight; i > 0; i -= (step + (Math.random() -0.5) * step * 0.8)) {
        path.lineTo((Math.random() - 0.5) * roughness * (Math.random()*0.5 + 0.75), Math.max(i,0));
      }
      path.closePath();
      
      ctx.clip(path); // Clip the image to this path first

      // Re-draw the image into the clipped area if globalCompositeOperation not working as expected for all browsers/setups
      // This ensures the original image content is what's clipped.
      // ctx.drawImage(baseImage, 0, 0, newWidth, newHeight); // This might be redundant if original drawImage is still visible

      // Then, draw the "torn edge" highlight/shadow on top of the clipped image
      ctx.strokeStyle = "rgba(0,0,0,0.15)"; // Darker stroke
      ctx.lineWidth = 2; // Slightly thicker
      ctx.stroke(path);

      // Add a very subtle lighter "inner tear" effect
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      // Create a slightly smaller path or offset path for this, or just stroke the same path slightly inside
      // For simplicity, stroking the same path again, relying on line width and color
      ctx.stroke(path);

      ctx.restore();
    }
    
    // Vignette
    if (effects.vignette) {
      ctx.save();
      const outerRadius = Math.sqrt(Math.pow(newWidth / 2, 2) + Math.pow(newHeight / 2, 2));
      const gradient = ctx.createRadialGradient(
        newWidth / 2, newHeight / 2, newWidth / 2.2, // inner circle, slightly smaller for stronger effect
        newWidth / 2, newHeight / 2, outerRadius 
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.35)'); // Darker vignette
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, newWidth, newHeight);
      ctx.restore();
    }

  }, [baseImage, effects, error, imageFile]);

  return (
    <Card className={cn(
        "shadow-xl h-full transition-all duration-500", // Enhanced shadow for depth
        effects.floatingMotion && "animate-float"
      )}>
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
