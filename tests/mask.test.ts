import { describe, expect, test } from 'vitest';
import { Ellipse, Mask } from '@/index';

describe('Mask', () => {
  test('creates clip mask', () => {
    const mask = Mask.clip(new Ellipse({ width: 200, height: 200 }));
    expect(mask.type).toBe('clip');
    if (mask.type === 'clip') {
      expect(mask.shape?.shapeType).toBe('ellipse');
    }
  });

  test('creates alpha and luminance masks', () => {
    const alpha = Mask.alpha({ source: './masks/alpha.png' });
    const luminance = Mask.luminance();

    expect(alpha.type).toBe('alpha');
    if (alpha.type === 'alpha') {
      expect(alpha.source).toBe('./masks/alpha.png');
    }
    expect(luminance.type).toBe('luminance');
  });

  test('validates source when provided', () => {
    expect(() => Mask.alpha({ source: '' })).toThrowError();
    expect(() => Mask.luminance({ source: '' })).toThrowError();
  });
});
