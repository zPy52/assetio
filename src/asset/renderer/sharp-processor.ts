import sharp from 'sharp';
import type {
  BlurOperation,
  AssetOperation,
  BorderOperation,
  ConvolveOperation,
  CropOperation,
  ResizeOperation,
  RotateOperation,
  ThresholdOperation,
  UnsharpMaskOperation,
} from '@/asset/types';
import { resolvePlacementValue } from '@/asset/renderer/placement';

type SharpSupportedOperationType =
  | 'blur'
  | 'crop'
  | 'resize'
  | 'rotate'
  | 'flip'
  | 'flop'
  | 'grayscale'
  | 'negate'
  | 'normalize'
  | 'sharpen'
  | 'unsharpMask'
  | 'medianFilter'
  | 'gamma'
  | 'threshold'
  | 'border'
  | 'convolve';

const SHARP_SUPPORTED_OPERATION_TYPES = new Set<SharpSupportedOperationType>([
  'blur',
  'crop',
  'resize',
  'rotate',
  'flip',
  'flop',
  'grayscale',
  'negate',
  'normalize',
  'sharpen',
  'unsharpMask',
  'medianFilter',
  'gamma',
  'threshold',
  'border',
  'convolve',
]);

function toThresholdValue(value: number | `${number}%`): number {
  if (typeof value === 'number') {
    return Math.max(0, Math.min(255, Math.round(value)));
  }
  const percentage = Number.parseFloat(value.slice(0, -1));
  if (!Number.isFinite(percentage)) return 128;
  return Math.max(0, Math.min(255, Math.round((percentage / 100) * 255)));
}

function toColorObject(color: RotateOperation['options']['background'] | BorderOperation['options']['color']) {
  if (!color) {
    return undefined;
  }
  return {
    r: color.channels.r,
    g: color.channels.g,
    b: color.channels.b,
    alpha: color.channels.a,
  };
}

export class SubmoduleAssetRendererSharpProcessor {
  public supportsOperation(operation: AssetOperation): boolean {
    if (operation.type === 'threshold') {
      return (operation.options.type ?? 'global') === 'global';
    }
    return SHARP_SUPPORTED_OPERATION_TYPES.has(operation.type as SharpSupportedOperationType);
  }

  public async processOperation(input: Buffer, operation: AssetOperation): Promise<Buffer> {
    if (!this.supportsOperation(operation)) {
      throw new Error(`Sharp processor does not support "${operation.type}" operation.`);
    }

    switch (operation.type) {
      case 'blur':
        return this.processBlur(input, operation);
      case 'crop':
        return this.processCrop(input, operation);
      case 'resize':
        return this.processResize(input, operation);
      case 'rotate':
        return this.processRotate(input, operation);
      case 'flip':
        return sharp(input).flip().toBuffer();
      case 'flop':
        return sharp(input).flop().toBuffer();
      case 'grayscale':
        return sharp(input).grayscale().toBuffer();
      case 'negate':
        return sharp(input).negate().toBuffer();
      case 'normalize':
        return sharp(input).normalise().toBuffer();
      case 'sharpen':
        return sharp(input).sharpen(operation.options.radius, operation.options.sigma).toBuffer();
      case 'unsharpMask':
        return this.processUnsharpMask(input, operation);
      case 'medianFilter':
        return sharp(input).median(Math.max(1, Math.round(operation.options.radius ?? 1))).toBuffer();
      case 'gamma':
        return sharp(input).gamma(operation.value).toBuffer();
      case 'threshold':
        return this.processThreshold(input, operation);
      case 'border':
        return this.processBorder(input, operation);
      case 'convolve':
        return this.processConvolve(input, operation);
      default:
        return input;
    }
  }

  private async processBlur(input: Buffer, operation: BlurOperation): Promise<Buffer> {
    const metadata = await sharp(input).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width <= 0 || height <= 0) {
      return input;
    }

    const points = operation.points.map((point) => ({
      x: resolvePlacementValue(point.x, width),
      y: resolvePlacementValue(point.y, height),
    }));

    const polygonPath = points.map((point) => `${point.x},${point.y}`).join(' ');
    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="transparent"/><polygon points="${polygonPath}" fill="white"/></svg>`,
      'utf-8',
    );

    let transformed: Buffer;
    if (operation.options.mode === 'pixel') {
      const pixelBlockSize = Math.max(2, Math.round(operation.options.intensity * 8));
      const reducedWidth = Math.max(1, Math.round(width / pixelBlockSize));
      const reducedHeight = Math.max(1, Math.round(height / pixelBlockSize));
      // Keep the two resizes in separate sharp pipelines, otherwise libvips can
      // optimize them into a no-op when the final size matches the original.
      const reduced = await sharp(input)
        .resize(reducedWidth, reducedHeight, { kernel: 'nearest' })
        .toBuffer();
      transformed = await sharp(reduced).resize(width, height, { kernel: 'nearest' }).toBuffer();
    } else {
      transformed = await sharp(input).blur(Math.max(0.3, operation.options.intensity)).toBuffer();
    }

    const maskedRegion = await sharp(transformed)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    return sharp(input).composite([{ input: maskedRegion, blend: 'over' }]).toBuffer();
  }

  private async processCrop(input: Buffer, operation: CropOperation): Promise<Buffer> {
    const metadata = await sharp(input).metadata();
    const sourceWidth = metadata.width ?? 0;
    const sourceHeight = metadata.height ?? 0;
    const left = resolvePlacementValue(operation.area.x, sourceWidth);
    const top = resolvePlacementValue(operation.area.y, sourceHeight);
    const width = resolvePlacementValue(operation.area.width, sourceWidth);
    const height = resolvePlacementValue(operation.area.height, sourceHeight);
    return sharp(input)
      .extract({
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: Math.max(1, width),
        height: Math.max(1, height),
      })
      .toBuffer();
  }

  private async processResize(input: Buffer, operation: ResizeOperation): Promise<Buffer> {
    const metadata = await sharp(input).metadata();
    const sourceWidth = metadata.width ?? 0;
    const sourceHeight = metadata.height ?? 0;
    const width = operation.options.width
      ? Math.max(1, resolvePlacementValue(operation.options.width, sourceWidth))
      : undefined;
    const height = operation.options.height
      ? Math.max(1, resolvePlacementValue(operation.options.height, sourceHeight))
      : undefined;
    const fit = operation.options.fit === 'none' ? 'fill' : operation.options.fit;
    return sharp(input).resize(width, height, fit ? { fit } : undefined).toBuffer();
  }

  private async processRotate(input: Buffer, operation: RotateOperation): Promise<Buffer> {
    return sharp(input)
      .rotate(operation.options.angle, {
        background: toColorObject(operation.options.background),
      })
      .toBuffer();
  }

  private async processUnsharpMask(input: Buffer, operation: UnsharpMaskOperation): Promise<Buffer> {
    return sharp(input)
      .sharpen(
        operation.options.sigma,
        operation.options.amount * 2,
        operation.options.threshold * 2,
      )
      .toBuffer();
  }

  private async processThreshold(input: Buffer, operation: ThresholdOperation): Promise<Buffer> {
    if (operation.options.type && operation.options.type !== 'global') {
      throw new Error(
        `Sharp threshold only supports global type. Received "${operation.options.type}".`,
      );
    }
    return sharp(input).threshold(toThresholdValue(operation.options.value)).toBuffer();
  }

  private async processBorder(input: Buffer, operation: BorderOperation): Promise<Buffer> {
    return sharp(input)
      .extend({
        top: Math.max(0, Math.round(operation.options.height)),
        bottom: Math.max(0, Math.round(operation.options.height)),
        left: Math.max(0, Math.round(operation.options.width)),
        right: Math.max(0, Math.round(operation.options.width)),
        background: toColorObject(operation.options.color),
      })
      .toBuffer();
  }

  private async processConvolve(input: Buffer, operation: ConvolveOperation): Promise<Buffer> {
    const kernelHeight = operation.options.kernel.length;
    const kernelWidth = operation.options.kernel[0]?.length ?? 0;
    return sharp(input)
      .convolve({
        width: kernelWidth,
        height: kernelHeight,
        kernel: operation.options.kernel.flat(),
      })
      .toBuffer();
  }
}
