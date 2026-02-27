import { BaseShape } from '@/shapes/base';
import type { StarOptions } from '@/shapes/types';

const DEFAULT_INNER_RADIUS = 0.382;

export class Star extends BaseShape {
  public readonly options: StarOptions;

  public constructor(options: StarOptions) {
    super('star');
    if (!Number.isInteger(options.points) || options.points < 3) {
      throw new Error('Star points must be an integer greater than or equal to 3.');
    }
    if (!Number.isFinite(options.radius) || options.radius <= 0) {
      throw new Error('Star radius must be greater than zero.');
    }
    const innerRadius = options.innerRadius ?? DEFAULT_INNER_RADIUS;
    if (!Number.isFinite(innerRadius) || innerRadius <= 0 || innerRadius >= 1) {
      throw new Error('Star innerRadius must be greater than 0 and less than 1.');
    }
    if (options.rotation !== undefined && !Number.isFinite(options.rotation)) {
      throw new Error('Star rotation must be a finite number when provided.');
    }

    this.options = {
      ...options,
      innerRadius,
      rotation: options.rotation ?? 0,
    };
  }
}
