import type { BaseShape } from '@/shapes';

export type ClipMaskConfig = {
  type: 'clip';
  shape?: BaseShape;
};

export type AlphaMaskConfig = {
  type: 'alpha';
  source?: string;
};

export type LuminanceMaskConfig = {
  type: 'luminance';
  source?: string;
};

export type MaskConfig = ClipMaskConfig | AlphaMaskConfig | LuminanceMaskConfig;
