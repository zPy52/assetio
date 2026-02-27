import type { BlendModeValue } from '@/blend-mode';
import type { ColorValue } from '@/color';

export type EffectOffset = {
  x: number;
  y: number;
};

export type DropShadowConfig = {
  offset: EffectOffset;
  blur: number;
  spread?: number;
  color: ColorValue;
};

export type InnerShadowConfig = {
  offset: EffectOffset;
  blur: number;
  spread?: number;
  color: ColorValue;
};

export type LayerBlurConfig = {
  radius: number;
};

export type BackgroundBlurConfig = {
  radius: number;
};

export type NoiseMode = 'color' | 'grayscale';

export type NoiseConfig = {
  opacity: number;
  size: number;
  mode?: NoiseMode;
};

export type TextureConfig = {
  source: string;
  opacity?: number;
  blendMode?: BlendModeValue;
  scale?: number;
};

export type GlassConfig = {
  blur: number;
  opacity?: number;
  tint?: ColorValue;
  refraction?: number;
};

export type DropShadowEffect = {
  type: 'drop-shadow';
  config: DropShadowConfig;
};

export type InnerShadowEffect = {
  type: 'inner-shadow';
  config: InnerShadowConfig;
};

export type LayerBlurEffect = {
  type: 'layer-blur';
  config: LayerBlurConfig;
};

export type BackgroundBlurEffect = {
  type: 'background-blur';
  config: BackgroundBlurConfig;
};

export type NoiseEffect = {
  type: 'noise';
  config: NoiseConfig;
};

export type TextureEffect = {
  type: 'texture';
  config: TextureConfig;
};

export type GlassEffect = {
  type: 'glass';
  config: GlassConfig;
};

export type EffectConfig =
  | DropShadowEffect
  | InnerShadowEffect
  | LayerBlurEffect
  | BackgroundBlurEffect
  | NoiseEffect
  | TextureEffect
  | GlassEffect;
