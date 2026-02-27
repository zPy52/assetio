import type { ColorValue } from '@/color';

export type FontNamedWeight =
  | 'extralight'
  | 'light'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold';

export type FontWeight = number | FontNamedWeight;

export type FontUseOptions = {
  size?: number;
  weight?: FontWeight;
  italic?: boolean;
};

export type FontRegistration = {
  family: string;
  sources: string[];
};

export type FontRef = {
  family: string;
  size: number;
  weight: number;
  italic: boolean;
};

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';
export type TextOverflow = 'visible' | 'hidden' | 'ellipsis';

export type TextRunOptions = {
  font?: FontRef;
  color?: ColorValue;
};

export type TextOptions = {
  font?: FontRef;
  color?: ColorValue;
  align?: TextAlign;
  verticalAlign?: TextVerticalAlign;
  width?: number;
  maxHeight?: number;
  overflow?: TextOverflow;
  lineHeight?: number;
  letterSpacing?: number;
};
