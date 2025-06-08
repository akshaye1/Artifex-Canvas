export interface AppliedEffects {
  paperTexture: string; // 'none', 'canvas', 'watercolor'
  edgeStyle: string;    // 'none', 'torn'
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  sepia: number;      // 0-100, default 0
  grayscale: boolean; // default false
  vignette: boolean;  // default false
}

export const initialEffects: AppliedEffects = {
  paperTexture: 'none',
  edgeStyle: 'none',
  brightness: 100,
  contrast: 100,
  sepia: 0,
  grayscale: false,
  vignette: false,
};

export const paperTextureOptions = [
  { value: 'none', label: 'None' },
  { value: 'canvas', label: 'Canvas' },
  { value: 'watercolor', label: 'Watercolor' },
];

export const edgeStyleOptions = [
  { value: 'none', label: 'None' },
  { value: 'torn', label: 'Torn Edge (mock)' },
];
