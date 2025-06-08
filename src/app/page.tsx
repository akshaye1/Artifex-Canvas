'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageUploader } from '@/components/image-uploader';
import { ImagePreview } from '@/components/image-preview';
import { EffectsPanel } from '@/components/effects-panel';
import type { AppliedEffects } from '@/types';
import { initialEffects } from '@/types';
import { useToast } from '@/hooks/use-toast';


export default function ArtifexCanvasPage() {
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [effects, setEffects] = useState<AppliedEffects>(initialEffects);
  const { toast } = useToast();

  const handleImageUpload = (file: File) => {
    setUploadedImageFile(file);
    // Optionally reset effects when a new image is uploaded
    // setEffects(initialEffects); 
    toast({ title: "Image Uploaded", description: `${file.name} is ready for editing.` });
  };

  const handleDownload = () => {
    const canvas = document.querySelector('canvas'); // A bit hacky, better to pass ref if possible
    if (canvas && uploadedImageFile) {
      const dataUrl = canvas.toDataURL(uploadedImageFile.type === 'image/png' ? 'image/png' : 'image/jpeg');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `artifex_${uploadedImageFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Image Downloaded", description: "Your artwork is saved!" });
    } else {
      toast({ title: "Download Failed", description: "No image to download or preview not ready.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Uploader and Effects Panel */}
          <div className="lg:col-span-1 flex flex-col gap-6 lg:gap-8">
            <ImageUploader 
              onImageUpload={handleImageUpload} 
              uploadedFileName={uploadedImageFile?.name || null}
            />
            <EffectsPanel
              currentImage={uploadedImageFile}
              effects={effects}
              onEffectsChange={setEffects}
              onDownload={handleDownload}
            />
          </div>

          {/* Right Column: Image Preview */}
          <div className="lg:col-span-2">
            <ImagePreview imageFile={uploadedImageFile} effects={effects} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
