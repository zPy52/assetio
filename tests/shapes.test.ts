import { describe, expect, test } from 'vitest';
import {
  Color,
  Effect,
  Ellipse,
  Line,
  Polygon,
  Rectangle,
  Star,
  Vector,
} from '@/index';

describe('Shapes', () => {
  test('stores ellipse options', () => {
    const shape = new Ellipse({
      width: 200,
      height: 100,
      arc: { startAngle: 0, endAngle: '180deg', innerRadius: 0.5 },
    });
    expect(shape.options.width).toBe(200);
    expect(shape.options.arc?.innerRadius).toBe(0.5);
  });

  test('supports chainable style methods', () => {
    const shape = new Rectangle({ width: 300, height: 150 })
      .fill(Color.hex('#fff'))
      .stroke({ color: Color.hex('#111'), width: 2, position: 'inside' })
      .effect(Effect.layerBlur({ radius: 4 }));

    const style = shape.getStyleState();
    expect(style.fillValue?.kind).toBe('color');
    expect(style.strokeValue?.width).toBe(2);
    expect(style.effects).toHaveLength(1);
  });

  test('validates polygon sides', () => {
    expect(() => new Polygon({ sides: 2, radius: 100 })).toThrowError();
  });

  test('sets star defaults', () => {
    const star = new Star({ points: 5, radius: 100 });
    expect(star.options.innerRadius).toBeCloseTo(0.382, 3);
    expect(star.options.rotation).toBe(0);
  });

  test('creates line and vector options', () => {
    const line = new Line({ start: [0, 0], end: [100, 50], endCap: 'arrow' });
    const vector = new Vector({ d: 'M 0 0 L 100 100 Z', closed: true });

    expect(line.options.endCap).toBe('arrow');
    expect(vector.options.closed).toBe(true);
  });
});
