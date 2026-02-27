import { GlobalFonts } from '@napi-rs/canvas';
import { promises as fileSystem } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  FontNamedWeight,
  FontRef,
  FontRegistration,
  FontUseOptions,
  FontWeight,
} from '@/text/types';

const DEFAULT_FONT_SIZE = 16;
const DEFAULT_FONT_WEIGHT = 400;

const NAMED_WEIGHT_MAP: Record<FontNamedWeight, number> = {
  extralight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

export class Font {
  private static readonly registry = new Map<string, FontRegistration>();

  public static async load(family: string, source: string): Promise<void> {
    const normalizedFamily = this.toValidatedFamilyName(family);
    const normalizedSource = source.trim();
    if (normalizedSource.length === 0) {
      throw new Error('Font source cannot be empty.');
    }

    await this.registerFontSource(normalizedSource, normalizedFamily);

    const existing = this.registry.get(normalizedFamily);
    if (!existing) {
      this.registry.set(normalizedFamily, {
        family: normalizedFamily,
        sources: [normalizedSource],
      });
      return;
    }

    if (!existing.sources.includes(normalizedSource)) {
      existing.sources.push(normalizedSource);
    }
  }

  private static async registerFontSource(source: string, family: string): Promise<void> {
    if (/^https?:\/\//i.test(source)) {
      // Remote font registration is intentionally lazy. We keep the source in the registry,
      // and the runtime can decide when/if to fetch it for rendering.
      return;
    }

    const resolvedPath = source.startsWith('file:') ? fileURLToPath(source) : path.resolve(source);
    try {
      await fileSystem.access(resolvedPath);
      GlobalFonts.registerFromPath(resolvedPath, family);
    } catch {
      // Keep a best-effort behavior for compatibility with source-only registration.
    }
  }

  public static use(family: string, options?: FontUseOptions): FontRef {
    const normalizedFamily = this.toValidatedFamilyName(family);
    return {
      family: normalizedFamily,
      size: this.toPositiveNumber(options?.size, DEFAULT_FONT_SIZE),
      weight: this.toWeightNumber(options?.weight),
      italic: Boolean(options?.italic),
    };
  }

  public static getLoaded(family: string): FontRegistration | undefined {
    return this.registry.get(this.toValidatedFamilyName(family));
  }

  public static listLoaded(): FontRegistration[] {
    return Array.from(this.registry.values()).map((registration) => ({
      family: registration.family,
      sources: [...registration.sources],
    }));
  }

  private static toWeightNumber(weight: FontWeight | undefined): number {
    if (weight === undefined) return DEFAULT_FONT_WEIGHT;
    if (typeof weight === 'number') {
      const rounded = Math.round(weight);
      if (!Number.isFinite(rounded) || rounded < 100 || rounded > 900) {
        throw new Error('Numeric font weight must be between 100 and 900.');
      }
      return rounded;
    }
    return NAMED_WEIGHT_MAP[weight];
  }

  private static toPositiveNumber(value: number | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Font size must be greater than zero.');
    }
    return value;
  }

  private static toValidatedFamilyName(family: string): string {
    const normalized = family.trim();
    if (normalized.length === 0) {
      throw new Error('Font family cannot be empty.');
    }
    return normalized;
  }
}
