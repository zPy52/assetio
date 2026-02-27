import type { BlendModeValue } from '@/blend-mode/types';

export class BlendMode {
  public static readonly Normal: BlendModeValue = 'normal';
  public static readonly Darken: BlendModeValue = 'darken';
  public static readonly Multiply: BlendModeValue = 'multiply';
  public static readonly ColorBurn: BlendModeValue = 'color-burn';
  public static readonly Lighten: BlendModeValue = 'lighten';
  public static readonly Screen: BlendModeValue = 'screen';
  public static readonly ColorDodge: BlendModeValue = 'color-dodge';
  public static readonly Overlay: BlendModeValue = 'overlay';
  public static readonly SoftLight: BlendModeValue = 'soft-light';
  public static readonly HardLight: BlendModeValue = 'hard-light';
  public static readonly Difference: BlendModeValue = 'difference';
  public static readonly Exclusion: BlendModeValue = 'exclusion';
  public static readonly Hue: BlendModeValue = 'hue';
  public static readonly Saturation: BlendModeValue = 'saturation';
  public static readonly Color: BlendModeValue = 'color';
  public static readonly Luminosity: BlendModeValue = 'luminosity';
}

export type { BlendModeValue } from '@/blend-mode/types';
export { BLEND_MODE_VALUES } from '@/blend-mode/types';
