'use client';

import type React from 'react';
import { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  uploadedFileName: string | null;
}

export function ImageUploader({ onImageUpload, uploadedFileName }: ImageUploaderProps) {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  }, [onImageUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  }, [onImageUpload]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <UploadCloud className="h-6 w-6 text-primary" />
          Upload Your Image
        </CardTitle>
        <CardDescription>Drag & drop an image or click to select.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/50 rounded-lg cursor-pointer hover:border-primary transition-colors h-48"
          onClick={() => document.getElementById('fileInput')?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            id="fileInput"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <UploadCloud className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">
            {uploadedFileName ? `Selected: ${uploadedFileName}` : 'Click or drag file to this area to upload'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG, GIF, WEBP</p>
        </div>
      </CardContent>
    </Card>
  );
}
