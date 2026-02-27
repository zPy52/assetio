import { describe, expect, test } from 'vitest';
import { Ellipse, Rectangle, ShapeOps, Vector } from '@/index';
import type { ShapeBooleanMetadata } from '@/shapes';

describe('ShapeOps', () => {
  test('returns vector for subtract', () => {
    const left = new Rectangle({ width: 300, height: 200 });
    const right = new Ellipse({ width: 120, height: 120 });
    const result = ShapeOps.subtract(left, right);

    expect(result).toBeInstanceOf(Vector);
    const metadata = (result as Vector & { booleanMetadata?: ShapeBooleanMetadata }).booleanMetadata;
    expect(metadata?.operation).toBe('subtract');
  });

  test('returns vector for all boolean operations', () => {
    const left = new Rectangle({ width: 100, height: 100 });
    const right = new Ellipse({ width: 50, height: 50 });

    expect(ShapeOps.union(left, right)).toBeInstanceOf(Vector);
    expect(ShapeOps.intersect(left, right)).toBeInstanceOf(Vector);
    expect(ShapeOps.exclude(left, right)).toBeInstanceOf(Vector);
  });
});
