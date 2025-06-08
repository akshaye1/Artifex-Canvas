
export interface AppliedEffects {
  // New Animation Settings
  animSize: number; // 0-100, for overall scale/effect magnitude
  animEdgeThickness: number; // 0-100, maps to pixel thickness for edges
  animEdgeIntensity: number; // 0-100, maps to amplitude of edge cuts
  animEdgeDetails: number; // 0-100, maps to complexity/frequency of edge cuts
  animCutoutStyle: number; // 0-100, general parameter for edge style variation
  animTextureStrength: number; // 0-100, for opacity of canvas texture
  animShadowOffsetX: number; // 0-100, maps to px offset (-val to +val)
  animShadowOffsetY: number; // 0-100, maps to px offset (-val to +val)
  animShadowBlur: number; // 0-100, maps to px blur radius
  animShadowStrength: number; // 0-100, maps to shadow alpha
  animMovement: number; // 0-100, controls floating animation intensity

  // Old properties to be removed (or kept if some base functionality remains)
  // For now, we are removing them as the new controls are comprehensive.
}

export const initialEffects: AppliedEffects = {
  animSize: 50,
  animEdgeThickness: 35,
  animEdgeIntensity: 50,
  animEdgeDetails: 50,
  animCutoutStyle: 50,
  animTextureStrength: 30,
  animShadowOffsetX: 50, // Mid-point, will map to 0 offset initially
  animShadowOffsetY: 50, // Mid-point, will map to 0 offset initially
  animShadowBlur: 20,
  animShadowStrength: 50,
  animMovement: 50,
};

// paperTextureOptions and edgeStyleOptions are no longer needed.
// export const paperTextureOptions = [
//   { value: 'none', label: 'None' },
//   { value: 'canvas', label: 'Canvas' },
//   { value: 'watercolor', label: 'Watercolor' },
// ];

// export const edgeStyleOptions = [
//   { value: 'none', label: 'None' },
//   { value: 'torn', label: 'Torn Edge' },
// ];
