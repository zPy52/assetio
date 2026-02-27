import { BaseShape } from '@/shapes/base';
import type { PolygonOptions } from '@/shapes/types';

export class Polygon extends BaseShape {
  public readonly options: PolygonOptions;

  public constructor(options: PolygonOptions) {
    super('polygon');
    if (!Number.isInteger(options.sides) || options.sides < 3) {
      throw new Error('Polygon sides must be an integer greater than or equal to 3.');
    }
    if (!Number.isFinite(options.radius) || options.radius <= 0) {
      throw new Error('Polygon radius must be greater than zero.');
    }
    if (options.rotation !== undefined && !Number.isFinite(options.rotation)) {
      throw new Error('Polygon rotation must be a finite number when provided.');
    }
    this.options = {
      ...options,
      rotation: options.rotation ?? 0,
    };
  }
}
