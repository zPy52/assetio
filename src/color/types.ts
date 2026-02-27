import type { RelativeValue } from '@/types';

export type ColorOpacityOptions = {
  opacity?: number;
};

export type ColorChannels = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export class ColorValue {
  public readonly kind = 'color';

  public constructor(public readonly channels: ColorChannels) {}
}

export type GradientPointValue = number | RelativeValue;

export type GradientPointTuple = [GradientPointValue, GradientPointValue];

export type GradientDirection = {
  start: GradientPointTuple;
  end: GradientPointTuple;
};

export type LinearGradientConfig = {
  direction: GradientDirection;
  colors: ColorValue[];
  stops?: number[];
};

export type RadialGradientConfig = {
  colors: ColorValue[];
  stops?: number[];
  center?: GradientPointTuple;
  radius?: number | RelativeValue;
};

export type GradientColorType = 'linear' | 'radial';

export type GradientColorData = {
  type: GradientColorType;
  colors: ColorValue[];
  stops: number[];
  direction?: GradientDirection;
  center?: GradientPointTuple;
  radius?: number | RelativeValue;
};

export class GradientColorValue {
  public readonly kind = 'gradient-color';

  public constructor(public readonly data: GradientColorData) {}
}
