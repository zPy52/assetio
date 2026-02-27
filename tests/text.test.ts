import { describe, expect, test } from 'vitest';
import { Color, Font, Text, TextRun } from '@/index';

describe('Text', () => {
  test('creates plain text with box options', () => {
    const text = new Text('Hello world', {
      font: Font.use('Inter', { size: 48, weight: 'semibold' }),
      color: Color.hex('#111'),
      align: 'center',
      width: 400,
    });

    expect(text.content).toBe('Hello world');
    expect(text.options?.align).toBe('center');
    expect(text.options?.width).toBe(400);
  });

  test('creates mixed runs', () => {
    const text = new Text(
      [
        new TextRun('Hello ', { color: Color.hex('#111') }),
        new TextRun('world', { color: Color.hex('#6366f1') }),
      ],
      { align: 'left' },
    );

    expect(Array.isArray(text.content)).toBe(true);
    expect((text.content as TextRun[])).toHaveLength(2);
  });

  test('throws on empty content', () => {
    expect(() => new Text('')).toThrowError();
    expect(() => new Text([])).toThrowError();
  });
});
