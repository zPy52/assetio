import { createCanvas, loadImage, Path2D, PathOp } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { Image } from '@napi-rs/canvas';
import type { ColorValue, GradientColorValue, GradientPointValue } from '@/color';
import type { EffectConfig } from '@/effects';
import { BaseShape, Ellipse, Line, Polygon, Rectangle, Star, Vector } from '@/shapes';
import type { FillValue, ShapeBooleanMetadata, StrokeConfig } from '@/shapes';

const MIN_SHAPE_SIZE = 1;

type PathMetrics = {
  path: Path2D;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type ShapeMetrics = {
  pathMetrics: PathMetrics;
  stroke: StrokeConfig | null;
  fill: FillValue | null;
  effects: EffectConfig[];
  padding: number;
  canvasWidth: number;
  canvasHeight: number;
  translateX: number;
  translateY: number;
};

function toRgbaString(color: ColorValue): string {
  const { r, g, b, a } = color.channels;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function toResolvedPoint(value: GradientPointValue, dimension: number): number {
  if (typeof value === 'number') return value;
  const normalized = value.trim();
  const parsed = Number.parseFloat(normalized.slice(0, -1));
  if (!Number.isFinite(parsed)) return 0;
  return (parsed / 100) * dimension;
}

function toCanvasFillStyle(
  context: SKRSContext2D,
  fill: FillValue,
  width: number,
  height: number,
): string | CanvasGradient {
  if (fill.kind === 'color') {
    return toRgbaString(fill);
  }

  return toCanvasGradient(context, fill, width, height);
}

function toCanvasGradient(
  context: SKRSContext2D,
  fill: GradientColorValue,
  width: number,
  height: number,
): CanvasGradient {
  if (fill.data.type === 'linear') {
    const direction = fill.data.direction ?? { start: [0, 0], end: [width, height] };
    const gradient = context.createLinearGradient(
      toResolvedPoint(direction.start[0], width),
      toResolvedPoint(direction.start[1], height),
      toResolvedPoint(direction.end[0], width),
      toResolvedPoint(direction.end[1], height),
    );
    fill.data.colors.forEach((color, index) => {
      gradient.addColorStop(fill.data.stops[index] ?? 0, toRgbaString(color));
    });
    return gradient;
  }

  const center = fill.data.center ?? [width / 2, height / 2];
  const radiusValue = fill.data.radius ?? Math.max(width, height) / 2;
  const radius =
    typeof radiusValue === 'number'
      ? radiusValue
      : (Number.parseFloat(radiusValue.slice(0, -1)) / 100) * Math.max(width, height);
  const centerX = toResolvedPoint(center[0], width);
  const centerY = toResolvedPoint(center[1], height);
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  fill.data.colors.forEach((color, index) => {
    gradient.addColorStop(fill.data.stops[index] ?? 0, toRgbaString(color));
  });
  return gradient;
}

function toAngleInRadians(value: number | `${number}deg` | `${number}%`): number {
  if (typeof value === 'number') return value;
  if (value.endsWith('deg')) {
    return (Number.parseFloat(value.slice(0, -3)) * Math.PI) / 180;
  }
  if (value.endsWith('%')) {
    return (Number.parseFloat(value.slice(0, -1)) / 100) * 2 * Math.PI;
  }
  return 0;
}

function toPathFromVector(vector: Vector): Path2D {
  if (vector.options.d) {
    return new Path2D(vector.options.d);
  }

  const path = new Path2D();
  for (const segment of vector.options.segments ?? []) {
    if (segment.command === 'M') {
      path.moveTo(segment.x, segment.y);
      continue;
    }
    if (segment.command === 'L') {
      path.lineTo(segment.x, segment.y);
      continue;
    }
    if (segment.command === 'Q') {
      path.quadraticCurveTo(segment.cp[0], segment.cp[1], segment.x, segment.y);
      continue;
    }
    if (segment.command === 'C') {
      path.bezierCurveTo(segment.cp1[0], segment.cp1[1], segment.cp2[0], segment.cp2[1], segment.x, segment.y);
      continue;
    }
    path.closePath();
  }
  if (vector.options.closed) {
    path.closePath();
  }
  return path;
}

function toNormalizedPathMetrics(path: Path2D): PathMetrics {
  const [left, top, right, bottom] = path.computeTightBounds();
  const safeLeft = Number.isFinite(left) ? left : 0;
  const safeTop = Number.isFinite(top) ? top : 0;
  const safeRight = Number.isFinite(right) ? right : MIN_SHAPE_SIZE;
  const safeBottom = Number.isFinite(bottom) ? bottom : MIN_SHAPE_SIZE;
  const width = Math.max(MIN_SHAPE_SIZE, safeRight - safeLeft);
  const height = Math.max(MIN_SHAPE_SIZE, safeBottom - safeTop);
  const normalized = path.transform({
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: -safeLeft,
    f: -safeTop,
  });
  return {
    path: normalized,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
  };
}

function toPathMetrics(shape: BaseShape): PathMetrics {
  if (shape instanceof Rectangle) {
    const path = new Path2D();
    const radius = shape.options.cornerRadius;
    if (typeof radius === 'number') {
      path.roundRect(0, 0, shape.options.width, shape.options.height, radius);
    } else if (radius) {
      path.roundRect(0, 0, shape.options.width, shape.options.height, [
        radius.tl,
        radius.tr,
        radius.br,
        radius.bl,
      ]);
    } else {
      path.rect(0, 0, shape.options.width, shape.options.height);
    }
    return toNormalizedPathMetrics(path);
  }

  if (shape instanceof Ellipse) {
    const path = new Path2D();
    const centerX = shape.options.width / 2;
    const centerY = shape.options.height / 2;
    const radiusX = shape.options.width / 2;
    const radiusY = shape.options.height / 2;
    if (!shape.options.arc) {
      path.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      path.closePath();
      return toNormalizedPathMetrics(path);
    }

    const start = toAngleInRadians(shape.options.arc.startAngle);
    const end = toAngleInRadians(shape.options.arc.endAngle);
    const innerRadius = shape.options.arc.innerRadius ?? 0;
    path.moveTo(centerX, centerY);
    path.ellipse(centerX, centerY, radiusX, radiusY, 0, start, end);
    if (innerRadius > 0) {
      path.ellipse(centerX, centerY, radiusX * innerRadius, radiusY * innerRadius, 0, end, start, true);
    } else {
      path.lineTo(centerX, centerY);
    }
    path.closePath();
    return toNormalizedPathMetrics(path);
  }

  if (shape instanceof Line) {
    const path = new Path2D();
    path.moveTo(shape.options.start[0], shape.options.start[1]);
    path.lineTo(shape.options.end[0], shape.options.end[1]);
    return toNormalizedPathMetrics(path);
  }

  if (shape instanceof Polygon) {
    const path = new Path2D();
    const center = shape.options.radius;
    const step = (Math.PI * 2) / shape.options.sides;
    const rotation = ((shape.options.rotation ?? 0) * Math.PI) / 180;
    for (let index = 0; index < shape.options.sides; index += 1) {
      const angle = rotation + index * step - Math.PI / 2;
      const x = center + Math.cos(angle) * shape.options.radius;
      const y = center + Math.sin(angle) * shape.options.radius;
      if (index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
    return toNormalizedPathMetrics(path);
  }

  if (shape instanceof Star) {
    const path = new Path2D();
    const center = shape.options.radius;
    const points = shape.options.points * 2;
    const step = (Math.PI * 2) / points;
    const rotation = ((shape.options.rotation ?? 0) * Math.PI) / 180;
    for (let index = 0; index < points; index += 1) {
      const isOuter = index % 2 === 0;
      const radius = isOuter ? shape.options.radius : shape.options.radius * (shape.options.innerRadius ?? 0.382);
      const angle = rotation + index * step - Math.PI / 2;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      if (index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
    return toNormalizedPathMetrics(path);
  }

  const vector = shape as Vector;
  const booleanMetadata = (vector as Vector & { booleanMetadata?: ShapeBooleanMetadata }).booleanMetadata;
  if (booleanMetadata) {
    const leftPath = toPathMetrics(booleanMetadata.operands[0]).path;
    const rightPath = toPathMetrics(booleanMetadata.operands[1]).path;
    const op =
      booleanMetadata.operation === 'subtract'
        ? PathOp.Difference
        : booleanMetadata.operation === 'intersect'
          ? PathOp.Intersect
          : booleanMetadata.operation === 'exclude'
            ? PathOp.Xor
            : PathOp.Union;
    return toNormalizedPathMetrics(leftPath.op(rightPath, op));
  }
  return toNormalizedPathMetrics(toPathFromVector(vector));
}

function toStrokePadding(stroke: StrokeConfig | null): number {
  if (!stroke) return 0;
  const strokeSize = stroke.position === 'outside' ? stroke.width * 2 : stroke.width;
  return Math.max(0, Math.ceil(strokeSize));
}

function toEffectsPadding(effects: EffectConfig[]): number {
  let maxPadding = 0;
  for (const effect of effects) {
    if (effect.type === 'drop-shadow' || effect.type === 'inner-shadow') {
      maxPadding = Math.max(
        maxPadding,
        Math.abs(effect.config.offset.x) + effect.config.blur + Math.abs(effect.config.spread ?? 0),
        Math.abs(effect.config.offset.y) + effect.config.blur + Math.abs(effect.config.spread ?? 0),
      );
    } else if (effect.type === 'layer-blur' || effect.type === 'background-blur') {
      maxPadding = Math.max(maxPadding, effect.config.radius * 2);
    } else if (effect.type === 'glass') {
      maxPadding = Math.max(maxPadding, effect.config.blur * 2);
    }
  }
  return Math.ceil(maxPadding);
}

function applyStroke(context: SKRSContext2D, path: Path2D, stroke: StrokeConfig): void {
  context.save();
  context.strokeStyle = toCanvasFillStyle(context, stroke.color, 1, 1);
  context.lineWidth = stroke.width;
  context.lineCap = stroke.cap ?? 'butt';
  context.lineJoin = stroke.join ?? 'miter';
  context.setLineDash(stroke.dash ?? []);

  if (stroke.position === 'inside') {
    context.clip(path);
    context.lineWidth = stroke.width * 2;
    context.stroke(path);
  } else if (stroke.position === 'outside') {
    context.lineWidth = stroke.width * 2;
    context.stroke(path);
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = '#000';
    context.fill(path);
  } else {
    context.stroke(path);
  }
  context.restore();
}

function drawArrowCap(
  context: SKRSContext2D,
  point: [number, number],
  angle: number,
  size: number,
  type: 'arrow' | 'arrow-filled' | 'circle' | 'circle-filled' | 'square',
): void {
  context.save();
  context.translate(point[0], point[1]);
  context.rotate(angle);
  if (type === 'circle' || type === 'circle-filled') {
    context.beginPath();
    context.arc(0, 0, size / 2, 0, Math.PI * 2);
    if (type === 'circle-filled') context.fill();
    else context.stroke();
    context.restore();
    return;
  }
  if (type === 'square') {
    context.strokeRect(-size / 2, -size / 2, size, size);
    context.restore();
    return;
  }
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-size, size / 2);
  context.lineTo(-size, -size / 2);
  context.closePath();
  if (type === 'arrow-filled') context.fill();
  else context.stroke();
  context.restore();
}

function applyLineCaps(context: SKRSContext2D, shape: BaseShape, stroke: StrokeConfig | null): void {
  if (!(shape instanceof Line) || !stroke) return;
  const startCap = shape.options.startCap;
  const endCap = shape.options.endCap;
  const angle = Math.atan2(shape.options.end[1] - shape.options.start[1], shape.options.end[0] - shape.options.start[0]);
  const capSize = Math.max(stroke.width * 2, 6);
  context.save();
  context.strokeStyle = toCanvasFillStyle(context, stroke.color, 1, 1);
  context.fillStyle = toCanvasFillStyle(context, stroke.color, 1, 1);
  if (startCap && startCap !== 'none') {
    drawArrowCap(context, shape.options.start, angle + Math.PI, capSize, startCap);
  }
  if (endCap && endCap !== 'none') {
    drawArrowCap(context, shape.options.end, angle, capSize, endCap);
  }
  context.restore();
}

function buildMetrics(shape: BaseShape): ShapeMetrics {
  const style = shape.getStyleState();
  const pathMetrics = toPathMetrics(shape);
  const padding = Math.max(2, toStrokePadding(style.strokeValue), toEffectsPadding(style.effects));
  const width = Math.max(MIN_SHAPE_SIZE, Math.ceil(pathMetrics.right - pathMetrics.left));
  const height = Math.max(MIN_SHAPE_SIZE, Math.ceil(pathMetrics.bottom - pathMetrics.top));
  return {
    pathMetrics,
    stroke: style.strokeValue,
    fill: style.fillValue,
    effects: style.effects,
    padding,
    canvasWidth: width + padding * 2,
    canvasHeight: height + padding * 2,
    translateX: padding,
    translateY: padding,
  };
}

function drawBaseShape(context: SKRSContext2D, shape: BaseShape, metrics: ShapeMetrics): void {
  context.save();
  context.translate(metrics.translateX, metrics.translateY);
  if (metrics.fill) {
    context.fillStyle = toCanvasFillStyle(
      context,
      metrics.fill,
      metrics.pathMetrics.right - metrics.pathMetrics.left,
      metrics.pathMetrics.bottom - metrics.pathMetrics.top,
    );
    context.fill(metrics.pathMetrics.path);
  }
  if (metrics.stroke) {
    applyStroke(context, metrics.pathMetrics.path, metrics.stroke);
  }
  applyLineCaps(context, shape, metrics.stroke);
  context.restore();
}

async function applyTextureEffect(
  context: SKRSContext2D,
  metrics: ShapeMetrics,
  effect: Extract<EffectConfig, { type: 'texture' }>,
): Promise<void> {
  const texture = await loadImage(effect.config.source);
  context.save();
  context.translate(metrics.translateX, metrics.translateY);
  context.clip(metrics.pathMetrics.path);
  context.globalAlpha = effect.config.opacity ?? 1;
  context.globalCompositeOperation = (effect.config.blendMode ?? 'multiply') as GlobalCompositeOperation;
  const scale = effect.config.scale ?? 1;
  const drawWidth = Math.max(1, texture.width * scale);
  const drawHeight = Math.max(1, texture.height * scale);
  for (let x = 0; x < metrics.pathMetrics.right; x += drawWidth) {
    for (let y = 0; y < metrics.pathMetrics.bottom; y += drawHeight) {
      context.drawImage(texture, x, y, drawWidth, drawHeight);
    }
  }
  context.restore();
}

function applyNoiseEffect(
  context: SKRSContext2D,
  width: number,
  height: number,
  effect: Extract<EffectConfig, { type: 'noise' }>,
): void {
  const imageData = context.createImageData(width, height);
  const alpha = Math.max(0, Math.min(255, Math.round(effect.config.opacity * 255)));
  const blockSize = Math.max(1, Math.round(effect.config.size));
  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      const base = Math.floor(Math.random() * 255);
      const r = effect.config.mode === 'grayscale' ? base : Math.floor(Math.random() * 255);
      const g = effect.config.mode === 'grayscale' ? base : Math.floor(Math.random() * 255);
      const b = effect.config.mode === 'grayscale' ? base : Math.floor(Math.random() * 255);
      for (let by = 0; by < blockSize; by += 1) {
        for (let bx = 0; bx < blockSize; bx += 1) {
          const px = x + bx;
          const py = y + by;
          if (px >= width || py >= height) continue;
          const index = (py * width + px) * 4;
          imageData.data[index] = r;
          imageData.data[index + 1] = g;
          imageData.data[index + 2] = b;
          imageData.data[index + 3] = alpha;
        }
      }
    }
  }
  context.save();
  context.globalCompositeOperation = 'overlay';
  context.putImageData(imageData, 0, 0);
  context.restore();
}

function applyBlurFilter(
  context: SKRSContext2D,
  canvasWidth: number,
  canvasHeight: number,
  radius: number,
): void {
  const snapshot = context.canvas.toBuffer('image/png');
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.save();
  context.filter = `blur(${Math.max(0, radius)}px)`;
  const image = new Image();
  image.src = snapshot;
  context.drawImage(image, 0, 0);
  context.restore();
}

export class SubmoduleRenderServiceShape {
  public async renderToBuffer(shape: BaseShape): Promise<Buffer> {
    const metrics = buildMetrics(shape);
    const canvas = createCanvas(metrics.canvasWidth, metrics.canvasHeight);
    const context = canvas.getContext('2d');

    for (const effect of metrics.effects) {
      if (effect.type === 'drop-shadow') {
        context.save();
        context.translate(metrics.translateX, metrics.translateY);
        context.shadowOffsetX = effect.config.offset.x;
        context.shadowOffsetY = effect.config.offset.y;
        context.shadowBlur = effect.config.blur;
        context.shadowColor = toRgbaString(effect.config.color);
        context.fillStyle = 'rgba(0,0,0,0)';
        context.strokeStyle = 'rgba(0,0,0,0)';
        context.fill(metrics.pathMetrics.path);
        context.stroke(metrics.pathMetrics.path);
        context.restore();
      }
    }

    drawBaseShape(context, shape, metrics);

    for (const effect of metrics.effects) {
      if (effect.type === 'layer-blur' || effect.type === 'background-blur') {
        applyBlurFilter(context, metrics.canvasWidth, metrics.canvasHeight, effect.config.radius);
      } else if (effect.type === 'noise') {
        applyNoiseEffect(context, metrics.canvasWidth, metrics.canvasHeight, effect);
      } else if (effect.type === 'texture') {
        await applyTextureEffect(context, metrics, effect);
      } else if (effect.type === 'glass') {
        applyBlurFilter(context, metrics.canvasWidth, metrics.canvasHeight, effect.config.blur);
        if (effect.config.tint) {
          context.save();
          context.translate(metrics.translateX, metrics.translateY);
          context.fillStyle = toRgbaString(effect.config.tint);
          context.globalAlpha = effect.config.opacity ?? 0.6;
          context.fill(metrics.pathMetrics.path);
          context.restore();
        }
      } else if (effect.type === 'inner-shadow') {
        context.save();
        context.translate(metrics.translateX, metrics.translateY);
        context.clip(metrics.pathMetrics.path);
        context.shadowOffsetX = effect.config.offset.x;
        context.shadowOffsetY = effect.config.offset.y;
        context.shadowBlur = effect.config.blur;
        context.shadowColor = toRgbaString(effect.config.color);
        context.fillStyle = 'rgba(0,0,0,0)';
        context.fill(metrics.pathMetrics.path);
        context.restore();
      }
    }

    return canvas.toBuffer('image/png');
  }
}
