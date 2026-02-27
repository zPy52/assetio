import { describe, expect, test } from 'vitest';
import { Font } from '@/index';

describe('Font', () => {
  test('loads and lists font sources', async () => {
    await Font.load('CardoTestFamily', './fonts/Cardo-Variable.ttf');
    await Font.load('CardoTestFamily', 'https://fonts.example.com/cardo.woff2');
    await Font.load('CardoTestFamily', 'https://fonts.example.com/cardo.woff2');

    const loaded = Font.getLoaded('CardoTestFamily');
    expect(loaded?.sources).toEqual([
      './fonts/Cardo-Variable.ttf',
      'https://fonts.example.com/cardo.woff2',
    ]);
  });

  test('resolves named and numeric weights', () => {
    const named = Font.use('Inter', { weight: 'bold' });
    const numeric = Font.use('Inter', { weight: 500, italic: true, size: 20 });

    expect(named.weight).toBe(700);
    expect(numeric.weight).toBe(500);
    expect(numeric.italic).toBe(true);
    expect(numeric.size).toBe(20);
  });

  test('validates invalid input', async () => {
    await expect(Font.load('', './file.ttf')).rejects.toThrowError();
    expect(() => Font.use('Inter', { weight: 99 })).toThrowError();
  });
});
