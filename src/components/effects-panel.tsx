
'use client';

import React from 'react';
import type { AppliedEffects } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Download, Wand2, Settings } from 'lucide-react'; // Changed icon
// import { suggestFilters, type SuggestFiltersInput } from '@/ai/flows/suggest-filters'; // AI suggestions removed for now
// import { useToast } from '@/hooks/use-toast'; // Toast might be used if AI comes back

interface EffectsPanelProps {
  currentImage: File | null;
  effects: AppliedEffects;
  onEffectsChange: (newEffects: AppliedEffects) => void;
  onDownload: () => void;
}

export function EffectsPanel({ currentImage, effects, onEffectsChange, onDownload }: EffectsPanelProps) {
  // const [isLoadingAi, setIsLoadingAi] = useState(false); // AI suggestions removed
  // const [aiSuggestions, setAiSuggestions] = useState<string[]>([]); // AI suggestions removed
  // const { toast } = useToast(); // AI suggestions removed

  const handleEffectChange = <K extends keyof AppliedEffects>(key: K, value: AppliedEffects[K]) => {
    onEffectsChange({ ...effects, [key]: value });
  };

  const animationControls: Array<{ id: keyof AppliedEffects; label: string; min: number; max: number; step: number; defaultValue: number }> = [
    { id: 'animSize', label: 'Size', min: 10, max: 100, step: 1, defaultValue: 50 },
    { id: 'animEdgeThickness', label: 'Edge thickness', min: 0, max: 100, step: 1, defaultValue: 35 },
    { id: 'animEdgeIntensity', label: 'Edge intensity', min: 0, max: 100, step: 1, defaultValue: 50 },
    { id: 'animEdgeDetails', label: 'Edge details', min: 0, max: 100, step: 1, defaultValue: 50 },
    { id: 'animCutoutStyle', label: 'Cutout style', min: 0, max: 100, step: 1, defaultValue: 50 },
    { id: 'animTextureStrength', label: 'Texture strength', min: 0, max: 100, step: 1, defaultValue: 30 },
    { id: 'animShadowOffsetX', label: 'Shadow offset X', min: 0, max: 100, step: 1, defaultValue: 50 },
    { id: 'animShadowOffsetY', label: 'Shadow offset Y', min: 0, max: 100, step: 1, defaultValue: 50 },
    { id: 'animShadowBlur', label: 'Shadow blur', min: 0, max: 100, step: 1, defaultValue: 20 },
    { id: 'animShadowStrength', label: 'Shadow strength', min: 0, max: 100, step: 1, defaultValue: 50 },
    { id: 'animMovement', label: 'Movement', min: 0, max: 100, step: 1, defaultValue: 50 },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> {/* Changed icon */}
          Animation Settings
        </CardTitle>
        <CardDescription>Adjust animation properties for your image.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {animationControls.map(control => (
          <div key={control.id}>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor={control.id} className="text-sm font-medium">
                {control.label}
              </Label>
              <span className="text-sm text-muted-foreground w-8 text-right">{effects[control.id]}</span>
            </div>
            <Slider
              id={control.id}
              min={control.min}
              max={control.max}
              step={control.step}
              value={[effects[control.id] as number]}
              onValueChange={([value]) => handleEffectChange(control.id, value)}
              className="mt-1"
            />
          </div>
        ))}
        
        <Separator />

        {/* AI Suggestions Removed For Now
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
            // ... AI suggestion display logic
          )}
        </div>
        
        <Separator /> 
        */}

        <Button onClick={onDownload} disabled={!currentImage} className="w-full bg-primary hover:bg-primary/90">
          <Download className="mr-2 h-4 w-4" />
          Download Image
        </Button>
      </CardContent>
    </Card>
  );
}
