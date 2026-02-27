import { describe, expect, test } from 'vitest';
import { BLEND_MODE_VALUES, BlendMode } from '@/index';

describe('BlendMode', () => {
  test('exports expected common blend modes', () => {
    expect(BlendMode.Normal).toBe('normal');
    expect(BlendMode.Multiply).toBe('multiply');
    expect(BlendMode.Screen).toBe('screen');
  });

  test('lists all blend mode values', () => {
    expect(BLEND_MODE_VALUES).toContain('overlay');
    expect(BLEND_MODE_VALUES).toContain('luminosity');
  });
});
