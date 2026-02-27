import { describe, expect, test } from 'vitest';
import { Color, GradientColor } from '@/index';

describe('GradientColor', () => {
  test('creates linear gradient with inferred stops', () => {
    const gradient = GradientColor.linear({
      direction: GradientColor.direction({ start: [0, 0], end: [1, 0.5] }),
      colors: [Color.hex('#000'), Color.hex('#888'), Color.hex('#fff')],
    });

    expect(gradient.data.type).toBe('linear');
    expect(gradient.data.stops).toEqual([0, 0.5, 1]);
  });

  test('creates radial gradient with custom options', () => {
    const gradient = GradientColor.radial({
      colors: [Color.hex('#fff'), Color.hex('#000')],
      stops: [0, 1],
      center: ['50%', '50%'],
      radius: '75%',
    });

    expect(gradient.data.type).toBe('radial');
    expect(gradient.data.center).toEqual(['50%', '50%']);
    expect(gradient.data.radius).toBe('75%');
  });

  test('throws when stops and colors do not match', () => {
    expect(() =>
      GradientColor.linear({
        direction: GradientColor.direction({ start: [0, 0], end: [1, 1] }),
        colors: [Color.hex('#000'), Color.hex('#fff')],
        stops: [0],
      }),
    ).toThrowError();
  });
});
