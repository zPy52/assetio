import { BaseShape } from '@/shapes/base';
import type { RectangleCornerRadius, RectangleOptions } from '@/shapes/types';

export class Rectangle extends BaseShape {
  public readonly options: RectangleOptions;

  public constructor(options: RectangleOptions) {
    super('rectangle');
    this.assertPositiveNumber(options.width, 'width');
    this.assertPositiveNumber(options.height, 'height');
    if (options.cornerRadius !== undefined) this.assertCornerRadius(options.cornerRadius);
    this.options = {
      ...options,
      cornerRadius:
        typeof options.cornerRadius === 'number'
          ? options.cornerRadius
          : options.cornerRadius
            ? { ...options.cornerRadius }
            : undefined,
    };
  }

  private assertCornerRadius(cornerRadius: RectangleCornerRadius): void {
    if (typeof cornerRadius === 'number') {
      this.assertNonNegative(cornerRadius, 'cornerRadius');
      return;
    }
    this.assertNonNegative(cornerRadius.tl, 'cornerRadius.tl');
    this.assertNonNegative(cornerRadius.tr, 'cornerRadius.tr');
    this.assertNonNegative(cornerRadius.br, 'cornerRadius.br');
    this.assertNonNegative(cornerRadius.bl, 'cornerRadius.bl');
  }

  private assertPositiveNumber(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Rectangle ${label} must be greater than zero.`);
    }
  }

  private assertNonNegative(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Rectangle ${label} must be zero or greater.`);
    }
  }
}
