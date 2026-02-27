import { BaseShape } from '@/shapes/base';
import type { AngleValue, EllipseArc, EllipseOptions } from '@/shapes/types';

export class Ellipse extends BaseShape {
  public readonly options: EllipseOptions;

  public constructor(options: EllipseOptions) {
    super('ellipse');
    this.assertPositiveNumber(options.width, 'width');
    this.assertPositiveNumber(options.height, 'height');
    if (options.arc) this.assertArc(options.arc);
    this.options = {
      ...options,
      arc: options.arc ? { ...options.arc } : undefined,
    };
  }

  private assertArc(arc: EllipseArc): void {
    this.assertAngle(arc.startAngle, 'arc.startAngle');
    this.assertAngle(arc.endAngle, 'arc.endAngle');
    if (arc.innerRadius !== undefined) {
      if (!Number.isFinite(arc.innerRadius) || arc.innerRadius < 0 || arc.innerRadius > 1) {
        throw new Error('Ellipse arc innerRadius must be between 0 and 1.');
      }
    }
  }

  private assertAngle(value: AngleValue, label: string): void {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`Ellipse ${label} must be a finite number.`);
      }
      return;
    }
    if (!/^-?\d+(\.\d+)?(deg|%)$/.test(value)) {
      throw new Error(`Ellipse ${label} must be a number, deg string, or percentage string.`);
    }
  }

  private assertPositiveNumber(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Ellipse ${label} must be greater than zero.`);
    }
  }
}
