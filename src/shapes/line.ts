import { BaseShape } from '@/shapes/base';
import type { LineOptions } from '@/shapes/types';

export class Line extends BaseShape {
  public readonly options: LineOptions;

  public constructor(options: LineOptions) {
    super('line');
    this.assertPoint(options.start, 'start');
    this.assertPoint(options.end, 'end');
    this.options = {
      ...options,
      start: [...options.start] as [number, number],
      end: [...options.end] as [number, number],
      startCap: options.startCap ?? 'none',
      endCap: options.endCap ?? 'none',
    };
  }

  private assertPoint(point: [number, number], label: string): void {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
      throw new Error(`Line ${label} must contain finite x and y values.`);
    }
  }
}
