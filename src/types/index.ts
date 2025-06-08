
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
  animEdgeIntensity: 60, // Slightly more intense tear by default
  animEdgeDetails: 60,   // More detail in tear by default
  animCutoutStyle: 50,
  animTextureStrength: 30,
  animShadowOffsetX: 55, // Default to a slight positive X offset
  animShadowOffsetY: 60, // Default to a more noticeable positive Y offset
  animShadowBlur: 60,    // Default to a softer blur
  animShadowStrength: 55, // Default to a moderate shadow strength
  animMovement: 0,       // No movement by default to better see static effects
};
