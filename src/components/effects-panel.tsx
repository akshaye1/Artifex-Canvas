'use client';

import React, { useState } from 'react';
import type { AppliedEffects } from '@/types';
import { paperTextureOptions, edgeStyleOptions } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Download, Lightbulb, SlidersHorizontal, Sparkles } from 'lucide-react';
import { suggestFilters, type SuggestFiltersInput } from '@/ai/flows/suggest-filters';
import { useToast } from '@/hooks/use-toast';

interface EffectsPanelProps {
  currentImage: File | null;
  effects: AppliedEffects;
  onEffectsChange: (newEffects: AppliedEffects) => void;
  onDownload: () => void;
}

export function EffectsPanel({ currentImage, effects, onEffectsChange, onDownload }: EffectsPanelProps) {
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const handleEffectChange = <K extends keyof AppliedEffects>(key: K, value: AppliedEffects[K]) => {
    onEffectsChange({ ...effects, [key]: value });
  };

  const handleAiSuggest = async () => {
    if (!currentImage) {
      toast({ title: "Upload an image first", description: "AI needs an image to suggest filters.", variant: "destructive" });
      return;
    }
    setIsLoadingAi(true);
    setAiSuggestions([]);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoDataUri = reader.result as string;
        const input: SuggestFiltersInput = { photoDataUri };
        const result = await suggestFilters(input);
        setAiSuggestions(result.suggestedFilters);
        if (result.suggestedFilters.length === 0) {
          toast({ title: "AI Suggestions", description: "No specific suggestions found, try general filters!" });
        } else {
          toast({ title: "AI Suggestions Loaded", description: "Check the suggestions below." });
        }
      };
      reader.onerror = () => {
        toast({ title: "Error reading image", description: "Could not process the image for AI suggestions.", variant: "destructive" });
        setIsLoadingAi(false);
      };
      reader.readAsDataURL(currentImage);
    } catch (error) {
      console.error("AI suggestion error:", error);
      toast({ title: "AI Suggestion Error", description: "Could not fetch suggestions.", variant: "destructive" });
      setIsLoadingAi(false);
    } finally {
      // Delay setting isLoadingAi to false to allow reader.onloadend to complete fully if successful
      // This is a bit of a hack, ideally the promise structure would be cleaner
      setTimeout(() => setIsLoadingAi(false), 500);
    }
  };
  
  const handleApplySuggestion = (suggestion: string) => {
    // Basic parsing attempt, can be expanded
    let newEffects = { ...effects };
    const lowerSuggestion = suggestion.toLowerCase();

    if (lowerSuggestion.includes('canvas texture')) newEffects.paperTexture = 'canvas';
    else if (lowerSuggestion.includes('watercolor texture')) newEffects.paperTexture = 'watercolor';
    
    if (lowerSuggestion.includes('torn edge')) newEffects.edgeStyle = 'torn';

    if (lowerSuggestion.includes('sepia')) newEffects.sepia = 70;
    if (lowerSuggestion.includes('grayscale') || lowerSuggestion.includes('black and white')) newEffects.grayscale = true;
    if (lowerSuggestion.includes('vignette')) newEffects.vignette = true;

    if (lowerSuggestion.includes('bright')) newEffects.brightness = Math.min(effects.brightness + 20, 200);
    if (lowerSuggestion.includes('dark')) newEffects.brightness = Math.max(effects.brightness - 20, 0);
    if (lowerSuggestion.includes('high contrast')) newEffects.contrast = Math.min(effects.contrast + 30, 200);
    if (lowerSuggestion.includes('low contrast')) newEffects.contrast = Math.max(effects.contrast - 30, 0);
    
    onEffectsChange(newEffects);
    toast({ title: "Suggestion Applied", description: `Applied: ${suggestion}` });
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6 text-primary" />
          Artistic Effects
        </CardTitle>
        <CardDescription>Adjust filters and textures for your image.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Paper Texture */}
        <div>
          <Label htmlFor="paperTexture" className="text-sm font-medium">Paper Texture</Label>
          <Select
            value={effects.paperTexture}
            onValueChange={(value) => handleEffectChange('paperTexture', value)}
          >
            <SelectTrigger id="paperTexture" className="mt-1">
              <SelectValue placeholder="Select texture" />
            </SelectTrigger>
            <SelectContent>
              {paperTextureOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Edge Style */}
        <div>
          <Label htmlFor="edgeStyle" className="text-sm font-medium">Edge Style</Label>
          <Select
            value={effects.edgeStyle}
            onValueChange={(value) => handleEffectChange('edgeStyle', value)}
          >
            <SelectTrigger id="edgeStyle" className="mt-1">
              <SelectValue placeholder="Select edge style" />
            </SelectTrigger>
            <SelectContent>
              {edgeStyleOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Separator />

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="brightness" className="text-sm font-medium">Brightness ({effects.brightness}%)</Label>
            <Slider
              id="brightness"
              min={0} max={200} step={1}
              value={[effects.brightness]}
              onValueChange={([value]) => handleEffectChange('brightness', value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="contrast" className="text-sm font-medium">Contrast ({effects.contrast}%)</Label>
            <Slider
              id="contrast"
              min={0} max={200} step={1}
              value={[effects.contrast]}
              onValueChange={([value]) => handleEffectChange('contrast', value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sepia" className="text-sm font-medium">Sepia ({effects.sepia}%)</Label>
            <Slider
              id="sepia"
              min={0} max={100} step={1}
              value={[effects.sepia]}
              onValueChange={([value]) => handleEffectChange('sepia', value)}
              className="mt-1"
            />
          </div>
        </div>

        <Separator />
        
        {/* Switches */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="grayscale" className="text-sm font-medium">Grayscale</Label>
            <Switch
              id="grayscale"
              checked={effects.grayscale}
              onCheckedChange={(checked) => handleEffectChange('grayscale', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="vignette" className="text-sm font-medium">Vignette</Label>
            <Switch
              id="vignette"
              checked={effects.vignette}
              onCheckedChange={(checked) => handleEffectChange('vignette', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* AI Suggestions */}
        <div>
          <h3 className="font-headline text-lg mb-2 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            AI Suggestions
          </h3>
          <Button onClick={handleAiSuggest} disabled={isLoadingAi || !currentImage} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            {isLoadingAi ? 'Thinking...' : 'Suggest Filters with AI'}
          </Button>
          {aiSuggestions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Click a suggestion to apply (experimental):</p>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <Separator />

        <Button onClick={onDownload} disabled={!currentImage} className="w-full bg-primary hover:bg-primary/90">
          <Download className="mr-2 h-4 w-4" />
          Download Image
        </Button>
      </CardContent>
    </Card>
  );
}
