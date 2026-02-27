import { describe, expect, test } from 'vitest';
import { Color } from '@/index';

describe('Color', () => {
  test('creates color from short hex with opacity', () => {
    const color = Color.hex('#0f8', { opacity: 0.5 });
    expect(color.channels).toEqual({ r: 0, g: 255, b: 136, a: 0.5 });
  });

  test('clamps rgb channels and opacity', () => {
    const color = Color.rgb(-20, 320, 130.3, { opacity: 2 });
    expect(color.channels).toEqual({ r: 0, g: 255, b: 130, a: 1 });
  });

  test('converts hsl to rgb', () => {
    const color = Color.hsl(0, 100, 50);
    expect(color.channels.r).toBe(255);
    expect(color.channels.g).toBe(0);
    expect(color.channels.b).toBe(0);
    expect(color.channels.a).toBe(1);
  });

  test('throws on invalid hex', () => {
    expect(() => Color.hex('abc')).toThrowError();
  });
});
