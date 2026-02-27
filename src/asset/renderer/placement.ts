import type { Anchor, PlacementValue } from '@/types';

function toRounded(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Placement value must be finite.');
  }
  return Math.round(value);
}

export function resolvePlacementValue(value: PlacementValue, dimension: number): number {
  if (!Number.isFinite(dimension) || dimension < 0) {
    throw new Error('Placement dimension must be a non-negative finite number.');
  }
  if (typeof value === 'number') {
    return toRounded(value);
  }

  const normalized = value.trim();
  if (!normalized.endsWith('%')) {
    throw new Error(`Relative placement "${value}" must end with "%".`);
  }
  const percentage = Number.parseFloat(normalized.slice(0, -1));
  if (!Number.isFinite(percentage)) {
    throw new Error(`Relative placement "${value}" must contain a finite percentage.`);
  }
  return toRounded((percentage / 100) * dimension);
}

type AnchorOffset = {
  x: number;
  y: number;
};

function toAnchorOffset(anchor: Anchor): AnchorOffset {
  switch (anchor) {
    case 'top-left':
      return { x: 0, y: 0 };
    case 'top-center':
      return { x: -0.5, y: 0 };
    case 'top-right':
      return { x: -1, y: 0 };
    case 'center-left':
      return { x: 0, y: -0.5 };
    case 'center':
      return { x: -0.5, y: -0.5 };
    case 'center-right':
      return { x: -1, y: -0.5 };
    case 'bottom-left':
      return { x: 0, y: -1 };
    case 'bottom-center':
      return { x: -0.5, y: -1 };
    case 'bottom-right':
      return { x: -1, y: -1 };
    default:
      return { x: 0, y: 0 };
  }
}

export function toCompositeOffset(
  anchor: Anchor,
  contentW: number,
  contentH: number,
  x: number,
  y: number,
): { left: number; top: number } {
  const offset = toAnchorOffset(anchor);
  return {
    left: toRounded(x + contentW * offset.x),
    top: toRounded(y + contentH * offset.y),
  };
}
