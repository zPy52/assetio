import type {
  BackgroundBlurConfig,
  DropShadowConfig,
  EffectConfig,
  GlassConfig,
  InnerShadowConfig,
  LayerBlurConfig,
  NoiseConfig,
  TextureConfig,
} from '@/effects/types';

export class Effect {
  public static dropShadow(config: DropShadowConfig): EffectConfig {
    return {
      type: 'drop-shadow',
      config: {
        ...config,
        offset: { ...config.offset },
        blur: this.toNonNegative(config.blur, 'Drop shadow blur'),
        spread: config.spread === undefined ? 0 : this.toFinite(config.spread, 'Drop shadow spread'),
      },
    };
  }

  public static innerShadow(config: InnerShadowConfig): EffectConfig {
    return {
      type: 'inner-shadow',
      config: {
        ...config,
        offset: { ...config.offset },
        blur: this.toNonNegative(config.blur, 'Inner shadow blur'),
        spread: config.spread === undefined ? 0 : this.toFinite(config.spread, 'Inner shadow spread'),
      },
    };
  }

  public static layerBlur(config: LayerBlurConfig): EffectConfig {
    return {
      type: 'layer-blur',
      config: {
        radius: this.toNonNegative(config.radius, 'Layer blur radius'),
      },
    };
  }

  public static backgroundBlur(config: BackgroundBlurConfig): EffectConfig {
    return {
      type: 'background-blur',
      config: {
        radius: this.toNonNegative(config.radius, 'Background blur radius'),
      },
    };
  }

  public static noise(config: NoiseConfig): EffectConfig {
    return {
      type: 'noise',
      config: {
        opacity: this.toUnit(config.opacity, 'Noise opacity'),
        size: this.toPositive(config.size, 'Noise size'),
        mode: config.mode ?? 'grayscale',
      },
    };
  }

  public static texture(config: TextureConfig): EffectConfig {
    if (config.source.trim().length === 0) {
      throw new Error('Texture source cannot be empty.');
    }
    return {
      type: 'texture',
      config: {
        ...config,
        source: config.source,
        opacity: config.opacity === undefined ? 1 : this.toUnit(config.opacity, 'Texture opacity'),
        scale: config.scale === undefined ? 1 : this.toPositive(config.scale, 'Texture scale'),
      },
    };
  }

  public static glass(config: GlassConfig): EffectConfig {
    return {
      type: 'glass',
      config: {
        ...config,
        blur: this.toNonNegative(config.blur, 'Glass blur'),
        opacity: config.opacity === undefined ? 0.6 : this.toUnit(config.opacity, 'Glass opacity'),
        refraction:
          config.refraction === undefined
            ? 0.05
            : this.toNonNegative(config.refraction, 'Glass refraction'),
      },
    };
  }

  private static toFinite(value: number, label: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number.`);
    }
    return value;
  }

  private static toPositive(value: number, label: string): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be greater than zero.`);
    }
    return value;
  }

  private static toNonNegative(value: number, label: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${label} must be zero or greater.`);
    }
    return value;
  }

  private static toUnit(value: number, label: string): number {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${label} must be between 0 and 1.`);
    }
    return value;
  }
}

export type {
  BackgroundBlurConfig,
  BackgroundBlurEffect,
  DropShadowConfig,
  DropShadowEffect,
  EffectConfig,
  EffectOffset,
  GlassConfig,
  GlassEffect,
  InnerShadowConfig,
  InnerShadowEffect,
  LayerBlurConfig,
  LayerBlurEffect,
  NoiseConfig,
  NoiseEffect,
  NoiseMode,
  TextureConfig,
  TextureEffect,
} from '@/effects/types';
