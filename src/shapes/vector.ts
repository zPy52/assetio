import { BaseShape } from '@/shapes/base';
import type { VectorOptions, VectorSegment } from '@/shapes/types';

export class Vector extends BaseShape {
  public readonly options: VectorOptions;

  public constructor(options: VectorOptions) {
    super('vector');
    if (!options.d && (!options.segments || options.segments.length === 0)) {
      throw new Error('Vector requires either an SVG path string `d` or at least one segment.');
    }
    if (options.d !== undefined && options.d.trim().length === 0) {
      throw new Error('Vector `d` cannot be empty.');
    }
    if (options.segments) this.assertSegments(options.segments);
    this.options = {
      ...options,
      d: options.d?.trim(),
      segments: options.segments ? options.segments.map((segment) => ({ ...segment })) : undefined,
      closed: options.closed ?? false,
    };
  }

  private assertSegments(segments: VectorSegment[]): void {
    for (const segment of segments) {
      if (segment.command === 'Z') continue;
      if (!Number.isFinite(segment.x) || !Number.isFinite(segment.y)) {
        throw new Error('Vector segments must use finite coordinates.');
      }
      if (segment.command === 'Q') {
        if (!Number.isFinite(segment.cp[0]) || !Number.isFinite(segment.cp[1])) {
          throw new Error('Vector quadratic segments require finite control-point coordinates.');
        }
      }
      if (segment.command === 'C') {
        if (
          !Number.isFinite(segment.cp1[0])
          || !Number.isFinite(segment.cp1[1])
          || !Number.isFinite(segment.cp2[0])
          || !Number.isFinite(segment.cp2[1])
        ) {
          throw new Error('Vector cubic segments require finite control-point coordinates.');
        }
      }
    }
  }
}
