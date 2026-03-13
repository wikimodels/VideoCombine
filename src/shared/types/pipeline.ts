// ─── Pipeline Types ────────────────────────────────────────────────────────
// A RenderJob represents one video clip to produce.
// Pass an array to pipeline.config.ts → Root.tsx registers each as a Composition.

export interface ParticleConfig {
  /** CSS hex colors, one picked randomly per particle */
  colors?: string[];
  /** Travel speed multiplier. 1.0 = fast, 0.2 = slow sparks */
  speed?: number;
  maxHeight?: number;
  fadeStart?: number;
  fadeRange?: number;
  spreadStart?: number;
  spreadAmplitude?: number;
  decelerationStrength?: number;
  rotationSpeed?: number;
}

export interface EQConfig {
  enabled: boolean;
  bands?: number;
  freqMin?: number;
  freqMax?: number;
  color?: string;
  secondaryColor?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
  cornerRadius?: number;
  decayFactor?: number;
  attackFactor?: number;
  bottom?: number;
  reflex?: boolean;
  reflexAlpha?: number;
  roundBars?: boolean;
  heightCurve?: number;
  weightingFilter?: 'A' | 'none';
}

export interface PromoConfig {
  enabled: boolean;
  text?: string;
  /** Path relative to public/, e.g. 'icons/spotify.svg' */
  icon?: string;
  cycleSeconds?: number;
  offsetSeconds?: number;
  holdSeconds?: number;
}

export interface VCRConfig {
  enabled: boolean;
  text?: string;
  cycleSeconds?: number;
  offsetSeconds?: number;
  holdSeconds?: number;
}

export interface GlitchConfig {
  enabled: boolean;
  /** Path relative to public/, e.g. 'images/boy_1.jpg' */
  image?: string;
  intensity?: number;
  tearProbability?: number;
  enableDigitalTear?: boolean;
  gridProbability?: number;
  enableStaticGrid?: boolean;
  enableTrackingRoll?: boolean;
  enableRGBBreathing?: boolean;
  enableCRTVignette?: boolean;
  scanlines?: boolean;
}

export interface RenderJob {
  /** Unique ID → composition name in Remotion Studio + output filename */
  id: string;
  /** Which composition template to use */
  composition: 'VinylStreamOverlay';
  /** Duration override in seconds. If omitted, auto-detected from audio length */
  durationSec?: number;

  // ── Media ────────────────────────────────────────────────────────────────
  /** Path relative to public/, e.g. 'audio/track.mp3' */
  audio: string;
  /** Background image, path relative to public/ */
  image?: string;

  // ── Vinyl / Origin ───────────────────────────────────────────────────────
  /** SVG for the spinning origin disc, path relative to public/ */
  originGraphic?: string;
  originScale?: number;
  originBgColor?: string;
  vinylSizePercent?: number;

  // ── Components ───────────────────────────────────────────────────────────
  /** SVG for emitted particles, path relative to public/ */
  particleGraphic?: string;
  particles?: ParticleConfig;
  eq?: EQConfig;
  promo?: PromoConfig;
  vcr?: VCRConfig;
  glitch?: GlitchConfig;
}
