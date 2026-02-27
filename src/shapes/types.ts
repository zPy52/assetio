import type { BlendModeValue } from '@/blend-mode';
import type { ColorValue, GradientColorValue } from '@/color';
import type { EffectConfig } from '@/effects';

export type FillValue = ColorValue | GradientColorValue;

export type StrokePosition = 'inside' | 'outside' | 'center';
export type StrokeCap = 'butt' | 'round' | 'square';
export type StrokeJoin = 'miter' | 'round' | 'bevel';

export type StrokeConfig = {
  color: FillValue;
  width: number;
  position?: StrokePosition;
  dash?: number[];
  cap?: StrokeCap;
  join?: StrokeJoin;
  blendMode?: BlendModeValue;
};

export type ShapeKind = 'ellipse' | 'rectangle' | 'line' | 'polygon' | 'star' | 'vector';

export type PointTuple = [number, number];

export type AngleValue = number | `${number}deg` | `${number}%`;

export type EllipseArc = {
  startAngle: AngleValue;
  endAngle: AngleValue;
  innerRadius?: number;
};

export type EllipseOptions = {
  width: number;
  height: number;
  arc?: EllipseArc;
};

export type RectangleCornerRadius =
  | number
  | {
      tl: number;
      tr: number;
      br: number;
      bl: number;
    };

export type RectangleOptions = {
  width: number;
  height: number;
  cornerRadius?: RectangleCornerRadius;
};

export type LineArrowCap =
  | 'none'
  | 'arrow'
  | 'arrow-filled'
  | 'circle'
  | 'circle-filled'
  | 'square';

export type LineOptions = {
  start: PointTuple;
  end: PointTuple;
  startCap?: LineArrowCap;
  endCap?: LineArrowCap;
};

export type PolygonOptions = {
  sides: number;
  radius: number;
  rotation?: number;
};

export type StarOptions = {
  points: number;
  radius: number;
  innerRadius?: number;
  rotation?: number;
};

export type VectorSegmentMove = { command: 'M'; x: number; y: number };
export type VectorSegmentLine = { command: 'L'; x: number; y: number };
export type VectorSegmentQuadratic = {
  command: 'Q';
  x: number;
  y: number;
  cp: PointTuple;
};
export type VectorSegmentCubic = {
  command: 'C';
  x: number;
  y: number;
  cp1: PointTuple;
  cp2: PointTuple;
};
export type VectorSegmentClose = { command: 'Z' };

export type VectorSegment =
  | VectorSegmentMove
  | VectorSegmentLine
  | VectorSegmentQuadratic
  | VectorSegmentCubic
  | VectorSegmentClose;

export type VectorOptions = {
  d?: string;
  segments?: VectorSegment[];
  closed?: boolean;
};

export type ShapeStyleState = {
  fillValue: FillValue | null;
  strokeValue: StrokeConfig | null;
  effects: EffectConfig[];
};
