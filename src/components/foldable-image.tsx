
'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FoldableImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  foldMessage?: string;
  ['data-ai-hint']?: string;
}

export function FoldableImage({
  src,
  alt,
  width = 256,
  height = 160,
  foldMessage = "Hover to see effect",
  "data-ai-hint": dataAiHint
}: FoldableImageProps) {
  return (
    <div className="my-4 flex flex-col items-center">
      <p className="text-sm text-muted-foreground mb-2 text-center">{foldMessage}</p>
      <div
        className={cn("fold-over-container mx-auto group")}
        style={{ width: `${width}px`, height: `${height}px` }}
        data-ai-hint={dataAiHint || "abstract paper"}
      >
        <div className="fold-over-panel">
          <div className="fold-over-panel-inner">
            <div className="fold-over-front">
              <Image
                src={src}
                alt={alt}
                layout="fill"
                objectFit="cover"
                className="rounded-md"
              />
            </div>
            <div className="fold-over-back rounded-md">
              <p className="text-center text-sm font-headline">Revealed!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
