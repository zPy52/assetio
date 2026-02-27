import type { ColorOpacityOptions } from '@/color/types';
import { ColorValue } from '@/color/types';

type HslTuple = [h: number, s: number, l: number];

export class Color {
  public static hex(value: string, options?: ColorOpacityOptions): ColorValue {
    const channels = this.toRgbFromHex(value);
    return new ColorValue({
      r: channels[0],
      g: channels[1],
      b: channels[2],
      a: this.toClampedUnit(options?.opacity ?? 1),
    });
  }

  public static rgb(r: number, g: number, b: number, options?: ColorOpacityOptions): ColorValue {
    return new ColorValue({
      r: this.toClampedChannel(r),
      g: this.toClampedChannel(g),
      b: this.toClampedChannel(b),
      a: this.toClampedUnit(options?.opacity ?? 1),
    });
  }

  public static hsl(h: number, s: number, l: number, options?: ColorOpacityOptions): ColorValue {
    const rgb = this.toRgbFromHsl([h, s, l]);
    return new ColorValue({
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
      a: this.toClampedUnit(options?.opacity ?? 1),
    });
  }

  private static toRgbFromHex(value: string): [number, number, number] {
    const normalized = value.trim().toLowerCase();
    const shortHexMatch = normalized.match(/^#([0-9a-f]{3})$/i);
    if (shortHexMatch) {
      const [r, g, b] = shortHexMatch[1]!.split('');
      return [
        Number.parseInt(`${r}${r}`, 16),
        Number.parseInt(`${g}${g}`, 16),
        Number.parseInt(`${b}${b}`, 16),
      ];
    }

    const hexMatch = normalized.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
    if (!hexMatch) {
      throw new Error(`Invalid hex color "${value}". Expected #rgb, #rrggbb, or #rrggbbaa.`);
    }

    const hex = hexMatch[1]!;
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }

  private static toRgbFromHsl([h, s, l]: HslTuple): [number, number, number] {
    const hue = ((this.toFiniteNumber(h, 0) % 360) + 360) % 360;
    const sat = this.toClampedUnit(s / 100);
    const light = this.toClampedUnit(l / 100);

    const chroma = (1 - Math.abs(2 * light - 1)) * sat;
    const huePrime = hue / 60;
    const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

    let rgbPrime: [number, number, number];
    if (huePrime >= 0 && huePrime < 1) rgbPrime = [chroma, x, 0];
    else if (huePrime < 2) rgbPrime = [x, chroma, 0];
    else if (huePrime < 3) rgbPrime = [0, chroma, x];
    else if (huePrime < 4) rgbPrime = [0, x, chroma];
    else if (huePrime < 5) rgbPrime = [x, 0, chroma];
    else rgbPrime = [chroma, 0, x];

    const m = light - chroma / 2;
    return [
      this.toClampedChannel((rgbPrime[0] + m) * 255),
      this.toClampedChannel((rgbPrime[1] + m) * 255),
      this.toClampedChannel((rgbPrime[2] + m) * 255),
    ];
  }

  private static toFiniteNumber(value: number, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return value;
  }

  private static toClampedChannel(value: number): number {
    const normalized = this.toFiniteNumber(value, 0);
    return Math.max(0, Math.min(255, Math.round(normalized)));
  }

  private static toClampedUnit(value: number): number {
    const normalized = this.toFiniteNumber(value, 1);
    return Math.max(0, Math.min(1, normalized));
  }
}
