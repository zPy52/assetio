import type { BaseShape } from '@/shapes';
import type { MaskConfig } from '@/mask/types';

export class Mask {
  public static clip(shape?: BaseShape): MaskConfig {
    return { type: 'clip', shape };
  }

  public static alpha(config?: { source?: string }): MaskConfig {
    if (config?.source !== undefined && config.source.trim().length === 0) {
      throw new Error('Mask alpha source cannot be empty.');
    }
    return { type: 'alpha', source: config?.source };
  }

  public static luminance(config?: { source?: string }): MaskConfig {
    if (config?.source !== undefined && config.source.trim().length === 0) {
      throw new Error('Mask luminance source cannot be empty.');
    }
    return { type: 'luminance', source: config?.source };
  }
}

export type {
  AlphaMaskConfig,
  ClipMaskConfig,
  LuminanceMaskConfig,
  MaskConfig,
} from '@/mask/types';
