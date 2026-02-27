import { describe, expect, test } from 'vitest';
import { BlendMode, Color, Effect } from '@/index';

describe('Effect', () => {
  test('creates drop shadow effect', () => {
    const effect = Effect.dropShadow({
      offset: { x: 4, y: 8 },
      blur: 16,
      spread: 0,
      color: Color.hex('#000', { opacity: 0.3 }),
    });

    expect(effect.type).toBe('drop-shadow');
    if (effect.type === 'drop-shadow') {
      expect(effect.config.blur).toBe(16);
    }
  });

  test('creates texture effect with defaults', () => {
    const effect = Effect.texture({
      source: './textures/paper.png',
      blendMode: BlendMode.Multiply,
    });

    expect(effect.type).toBe('texture');
    if (effect.type === 'texture') {
      expect(effect.config.opacity).toBe(1);
      expect(effect.config.scale).toBe(1);
      expect(effect.config.blendMode).toBe('multiply');
    }
  });

  test('creates noise and glass effects', () => {
    const noise = Effect.noise({ opacity: 0.15, size: 1, mode: 'color' });
    const glass = Effect.glass({ blur: 24 });

    expect(noise.type).toBe('noise');
    if (noise.type === 'noise') {
      expect(noise.config.mode).toBe('color');
    }
    expect(glass.type).toBe('glass');
    if (glass.type === 'glass') {
      expect(glass.config.opacity).toBe(0.6);
    }
  });

  test('validates texture source', () => {
    expect(() => Effect.texture({ source: '   ' })).toThrowError();
  });
});
