import type { EffectConfig } from '@/effects';
import type { FillValue, ShapeKind, ShapeStyleState, StrokeConfig } from '@/shapes/types';

export abstract class BaseShape {
  protected fillValue: FillValue | null = null;
  protected strokeValue: StrokeConfig | null = null;
  protected readonly effects: EffectConfig[] = [];

  public constructor(public readonly shapeType: ShapeKind) {}

  public fill(value: FillValue): this {
    this.fillValue = value;
    return this;
  }

  public stroke(config: StrokeConfig): this {
    this.strokeValue = {
      ...config,
      dash: config.dash ? [...config.dash] : undefined,
    };
    return this;
  }

  public effect(config: EffectConfig): this {
    this.effects.push(config);
    return this;
  }

  public getStyleState(): ShapeStyleState {
    return {
      fillValue: this.fillValue,
      strokeValue: this.strokeValue,
      effects: [...this.effects],
    };
  }
}
