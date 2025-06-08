'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { AppliedEffects } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';

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
      // Clear canvas if no file
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
    if (!baseImage || !canvasRef.current) {
        // If no base image, ensure canvas is cleared or shows a placeholder
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Optionally draw a placeholder message
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
            }
        }
        return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    const maxWidth = container?.clientWidth ? Math.max(container.clientWidth - 32, 300) : 600; // Max width of container (CardContent padding)
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
    // Second pass to ensure maxWidth is still respected after height adjustment
     if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / ratio;
    }


    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.clearRect(0, 0, newWidth, newHeight);

    let filterString = '';
    filterString += `brightness(${effects.brightness}%) `;
    filterString += `contrast(${effects.contrast}%) `;
    filterString += `sepia(${effects.sepia}%) `;
    if (effects.grayscale) {
      filterString += `grayscale(100%) `;
    }
    ctx.filter = filterString.trim();
    
    ctx.drawImage(baseImage, 0, 0, newWidth, newHeight);
    ctx.filter = 'none'; // Reset filter for subsequent drawing operations

    // Paper Texture
    if (effects.paperTexture !== 'none') {
      ctx.save();
      if (effects.paperTexture === 'canvas') {
        ctx.fillStyle = 'rgba(220, 210, 190, 0.1)'; // Light beige overlay
        ctx.fillRect(0, 0, newWidth, newHeight);
      } else if (effects.paperTexture === 'watercolor') {
        for (let i = 0; i < newWidth * newHeight * 0.03; i++) {
          const x = Math.random() * newWidth;
          const y = Math.random() * newHeight;
          const alpha = Math.random() * 0.05;
          ctx.fillStyle = `rgba(100, 80, 60, ${alpha})`; // Brownish specks
          ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
        }
      }
      ctx.restore();
    }

    // Edge Style
    if (effects.edgeStyle === 'torn') {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = Math.min(newWidth, newHeight) * 0.015; // Relative to image size
      ctx.beginPath();
      let step = 20;
      for(let side = 0; side < 4; side++) {
          for(let i = 0; i < (side % 2 === 0 ? newWidth : newHeight); i+=step) {
              let x, y;
              let roughness = 5;
              if(side === 0) { x = i; y = (Math.random()-0.5)*roughness; } // top
              else if(side === 1) { x = newWidth + (Math.random()-0.5)*roughness; y = i; } // right
              else if(side === 2) { x = newWidth - i; y = newHeight + (Math.random()-0.5)*roughness; } // bottom
              else { x = (Math.random()-0.5)*roughness; y = newHeight - i; } // left
              if(i === 0 && side === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
      }
      ctx.closePath();
      // Instead of stroke for torn edge, use it as a clipping path
      // For simplicity here, we will draw a subtle darker border to simulate roughness
      ctx.globalCompositeOperation = 'destination-in'; // This will clip the existing image
      ctx.fill(); // Fill the path
      ctx.globalCompositeOperation = 'source-over'; // Reset composite operation

      // Add a subtle shadow/darkening to the "torn" area
      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 2;
      ctx.stroke(); // Stroke the same path again but with different style
      ctx.restore();
    }
    
    // Vignette
    if (effects.vignette) {
      ctx.save();
      const outerRadius = Math.sqrt(Math.pow(newWidth / 2, 2) + Math.pow(newHeight / 2, 2));
      const gradient = ctx.createRadialGradient(
        newWidth / 2, newHeight / 2, newWidth / 2.5, // inner circle
        newWidth / 2, newHeight / 2, outerRadius    // outer circle
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, newWidth, newHeight);
      ctx.restore();
    }

  }, [baseImage, effects, error, imageFile]); // Added error and imageFile to re-render placeholder text

  return (
    <Card className="shadow-lg h-full">
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
