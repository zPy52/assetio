import type {
  GradientDirection,
  GradientPointTuple,
  LinearGradientConfig,
  RadialGradientConfig,
} from '@/color/types';
import { GradientColorValue } from '@/color/types';

export class GradientColor {
  public static linear(config: LinearGradientConfig): GradientColorValue {
    const colors = this.getValidatedColors(config.colors);
    const stops = this.getValidatedStops(config.stops, colors.length);
    return new GradientColorValue({
      type: 'linear',
      colors,
      stops,
      direction: config.direction,
    });
  }

  public static radial(config: RadialGradientConfig): GradientColorValue {
    const colors = this.getValidatedColors(config.colors);
    const stops = this.getValidatedStops(config.stops, colors.length);
    return new GradientColorValue({
      type: 'radial',
      colors,
      stops,
      center: config.center,
      radius: config.radius,
    });
  }

  public static direction(config: {
    start: GradientPointTuple;
    end: GradientPointTuple;
  }): GradientDirection {
    return {
      start: config.start,
      end: config.end,
    };
  }

  private static getValidatedColors<T>(colors: T[]): T[] {
    if (colors.length < 2) {
      throw new Error('Gradient colors must include at least two color values.');
    }
    return [...colors];
  }

  private static getValidatedStops(stops: number[] | undefined, count: number): number[] {
    if (!stops) {
      if (count === 2) return [0, 1];
      return Array.from({ length: count }, (_, index) => index / (count - 1));
    }

    if (stops.length !== count) {
      throw new Error('Gradient stops length must match the number of colors.');
    }

    for (let index = 0; index < stops.length; index += 1) {
      const value = stops[index];
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error('Gradient stops must be finite numbers between 0 and 1.');
      }
      if (index > 0 && value < stops[index - 1]!) {
        throw new Error('Gradient stops must be sorted in ascending order.');
      }
    }

    return [...stops];
  }
}
