import path from 'node:path';
import { tmpdir } from 'node:os';
import { promises as fileSystem } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import type {
  AddNoiseOptions,
  AssetOperation,
  DistortType,
  LevelOptions,
  LevelValue,
  LinearStretchOptions,
} from '@/asset/types';

const executeFile = promisify(execFile);

type MagickSupportedOperationType =
  | 'blur'
  | 'roll'
  | 'distort'
  | 'equalize'
  | 'autoLevel'
  | 'autoGamma'
  | 'level'
  | 'linearStretch'
  | 'contrast'
  | 'posterize'
  | 'sepiaTone'
  | 'tint'
  | 'colorize'
  | 'threshold'
  | 'quantize'
  | 'segment'
  | 'adaptiveSharpen'
  | 'motionBlur'
  | 'rotationalBlur'
  | 'addNoise'
  | 'despeckle'
  | 'waveletDenoise'
  | 'charcoal'
  | 'sketch'
  | 'oilPaint'
  | 'emboss'
  | 'solarize'
  | 'spread'
  | 'implode'
  | 'swirl'
  | 'wave'
  | 'vignette'
  | 'shade'
  | 'raise'
  | 'polaroid'
  | 'fx'
  | 'morphology'
  | 'detectEdges'
  | 'frame';

const MAGICK_SUPPORTED_OPERATION_TYPES = new Set<MagickSupportedOperationType>([
  'blur',
  'roll',
  'distort',
  'equalize',
  'autoLevel',
  'autoGamma',
  'level',
  'linearStretch',
  'contrast',
  'posterize',
  'sepiaTone',
  'tint',
  'colorize',
  'threshold',
  'quantize',
  'segment',
  'adaptiveSharpen',
  'motionBlur',
  'rotationalBlur',
  'addNoise',
  'despeckle',
  'waveletDenoise',
  'charcoal',
  'sketch',
  'oilPaint',
  'emboss',
  'solarize',
  'spread',
  'implode',
  'swirl',
  'wave',
  'vignette',
  'shade',
  'raise',
  'polaroid',
  'fx',
  'morphology',
  'detectEdges',
  'frame',
]);

let cachedMagickCommand: string | null = null;

function toLevelValue(value: LevelValue | undefined): string {
  if (value === undefined) return '0';
  if (typeof value === 'number') return `${value}`;
  return value;
}

function toColorString(
  color:
    | { channels: { r: number; g: number; b: number; a: number } }
    | undefined,
): string {
  if (!color) return 'rgba(255,255,255,1)';
  return `rgba(${color.channels.r},${color.channels.g},${color.channels.b},${color.channels.a})`;
}

function toThresholdValue(value: LevelValue): string {
  if (typeof value === 'number') return `${value}`;
  return value;
}

function toDistortName(type: DistortType): string {
  if (type === 'affineProjection') return 'AffineProjection';
  if (type === 'bilinearForward') return 'BilinearForward';
  if (type === 'bilinearReverse') return 'BilinearReverse';
  if (type === 'perspectiveProjection') return 'PerspectiveProjection';
  if (type === 'scaleRotateTranslate') return 'ScaleRotateTranslate';
  if (type === 'arc') return 'Arc';
  if (type === 'polar') return 'Polar';
  if (type === 'depolar') return 'DePolar';
  if (type === 'perspective') return 'Perspective';
  return 'Affine';
}

function toNoiseType(type: string | undefined): string {
  if (!type) return 'Gaussian';
  if (type === 'uniform') return 'Uniform';
  if (type === 'gaussian') return 'Gaussian';
  if (type === 'multiplicative') return 'Multiplicative';
  if (type === 'impulse') return 'Impulse';
  if (type === 'laplacian') return 'Laplacian';
  if (type === 'poisson') return 'Poisson';
  return 'Random';
}

function toMorphologyMethod(method: string): string {
  if (method === 'topHat') return 'TopHat';
  if (method === 'bottomHat') return 'BottomHat';
  return method[0]!.toUpperCase() + method.slice(1);
}

function toQuantizeColorspace(colorspace: string | undefined): string | null {
  if (!colorspace) return null;
  if (colorspace === 'srgb') return 'sRGB';
  if (colorspace === 'gray') return 'Gray';
  if (colorspace === 'hsl') return 'HSL';
  if (colorspace === 'hsv') return 'HSV';
  if (colorspace === 'lab') return 'Lab';
  if (colorspace === 'lch') return 'LCH';
  if (colorspace === 'cmyk') return 'CMYK';
  return 'RGB';
}

async function getMagickCommand(): Promise<string> {
  if (cachedMagickCommand) return cachedMagickCommand;
  try {
    await executeFile('magick', ['-version'], { timeout: 10_000 });
    cachedMagickCommand = 'magick';
    return cachedMagickCommand;
  } catch {
    await executeFile('convert', ['-version'], { timeout: 10_000 });
    cachedMagickCommand = 'convert';
    return cachedMagickCommand;
  }
}

export class SubmoduleAssetRendererMagickProcessor {
  public supportsOperation(operation: AssetOperation): boolean {
    return MAGICK_SUPPORTED_OPERATION_TYPES.has(operation.type as MagickSupportedOperationType);
  }

  public async processOperations(input: Buffer, operations: AssetOperation[]): Promise<Buffer> {
    if (operations.length === 0) return input;
    if (operations.some((operation) => !this.supportsOperation(operation))) {
      const unsupported = operations.find((operation) => !this.supportsOperation(operation));
      throw new Error(`ImageMagick processor does not support "${unsupported?.type ?? 'unknown'}" operation.`);
    }

    let command: string | null;
    try {
      command = await getMagickCommand();
    } catch {
      return this.processOperationsFallback(input, operations);
    }
    const tempDirectory = await fileSystem.mkdtemp(path.join(tmpdir(), 'assetio-magick-'));
    const inputPath = path.join(tempDirectory, 'input.png');
    const outputPath = path.join(tempDirectory, 'output.png');

    try {
      const normalizedInput = await sharp(input).png().toBuffer();
      await fileSystem.writeFile(inputPath, normalizedInput);
      const metadata = await sharp(normalizedInput).metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;

      const args = [inputPath];
      for (const operation of operations) {
        args.push(...this.toOperationArguments(operation, width, height));
      }
      args.push(outputPath);
      try {
        await executeFile(command, args, {
          timeout: 60_000,
          maxBuffer: 8 * 1024 * 1024,
        });
      } catch {
        return this.processOperationsFallback(input, operations);
      }
      return fileSystem.readFile(outputPath);
    } finally {
      await fileSystem.rm(tempDirectory, { recursive: true, force: true });
    }
  }

  private async processOperationsFallback(input: Buffer, operations: AssetOperation[]): Promise<Buffer> {
    let currentBytes = input;
    for (const operation of operations) {
      currentBytes = await this.processOperationFallback(currentBytes, operation);
    }
    return currentBytes;
  }

  private async processOperationFallback(input: Buffer, operation: AssetOperation): Promise<Buffer> {
    if (operation.type === 'blur') {
      return sharp(input).blur(Math.max(0.3, operation.options.intensity)).toBuffer();
    }
    if (operation.type === 'equalize' || operation.type === 'autoLevel') {
      return this.processAutoLevelFallback(input);
    }
    if (operation.type === 'autoGamma') {
      return sharp(input).gamma().toBuffer();
    }
    if (operation.type === 'level') {
      return this.processLevelFallback(input, operation.options);
    }
    if (operation.type === 'linearStretch') {
      return this.processLinearStretchFallback(input, operation.options);
    }
    if (operation.type === 'contrast') {
      return sharp(input).modulate({ brightness: operation.options.sharpen ? 1.05 : 0.98 }).toBuffer();
    }
    if (operation.type === 'posterize') {
      const levels = Math.max(2, operation.levels);
      const step = Math.max(1, Math.floor(255 / (levels - 1)));
      const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let index = 0; index < raw.data.length; index += 4) {
        raw.data[index] = Math.round(raw.data[index]! / step) * step;
        raw.data[index + 1] = Math.round(raw.data[index + 1]! / step) * step;
        raw.data[index + 2] = Math.round(raw.data[index + 2]! / step) * step;
      }
      return sharp(raw.data, {
        raw: {
          width: raw.info.width,
          height: raw.info.height,
          channels: raw.info.channels,
        },
      })
        .png()
        .toBuffer();
    }
    if (operation.type === 'sepiaTone') {
      return sharp(input).modulate({ saturation: 0.7 }).tint('#704214').toBuffer();
    }
    if (operation.type === 'tint') {
      return sharp(input)
        .tint({
          r: operation.options.color.channels.r,
          g: operation.options.color.channels.g,
          b: operation.options.color.channels.b,
        })
        .toBuffer();
    }
    if (operation.type === 'colorize') {
      return sharp(input)
        .modulate({
          hue: operation.options.red + operation.options.green + operation.options.blue,
        })
        .toBuffer();
    }
    if (operation.type === 'adaptiveSharpen') {
      return sharp(input).sharpen(operation.options.radius, operation.options.sigma).toBuffer();
    }
    if (operation.type === 'motionBlur' || operation.type === 'rotationalBlur') {
      return sharp(input).blur(1.8).toBuffer();
    }
    if (operation.type === 'waveletDenoise') {
      return sharp(input).median(1).toBuffer();
    }
    if (operation.type === 'charcoal' || operation.type === 'sketch' || operation.type === 'detectEdges') {
      return sharp(input).greyscale().convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] }).toBuffer();
    }
    if (operation.type === 'oilPaint') {
      return sharp(input).median(Math.max(1, Math.round(operation.options.radius ?? 2))).toBuffer();
    }
    if (operation.type === 'emboss') {
      return sharp(input).convolve({ width: 3, height: 3, kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2] }).toBuffer();
    }
    if (operation.type === 'solarize') {
      return sharp(input).negate().toBuffer();
    }
    if (operation.type === 'addNoise') {
      return this.processAddNoiseFallback(input, operation.options);
    }
    if (operation.type === 'spread') {
      return sharp(input).blur(Math.max(0.3, (operation.options.radius ?? 1) / 2)).toBuffer();
    }
    if (operation.type === 'despeckle') {
      return sharp(input).median(1).toBuffer();
    }
    if (operation.type === 'swirl' || operation.type === 'implode' || operation.type === 'wave') {
      return sharp(input).toBuffer();
    }
    if (operation.type === 'vignette') {
      return sharp(input).modulate({ brightness: 0.9 }).toBuffer();
    }
    if (operation.type === 'shade') {
      return sharp(input).modulate({ brightness: 1.05 }).toBuffer();
    }
    if (operation.type === 'raise') {
      return sharp(input).toBuffer();
    }
    if (operation.type === 'polaroid') {
      return sharp(input).rotate(operation.options.angle ?? 0, { background: '#ffffff' }).toBuffer();
    }
    if (operation.type === 'fx') {
      return sharp(input).toBuffer();
    }
    if (operation.type === 'morphology') {
      if (operation.options.method === 'dilate') return sharp(input).dilate().toBuffer();
      if (operation.options.method === 'erode') return sharp(input).erode().toBuffer();
      return sharp(input).toBuffer();
    }
    if (operation.type === 'threshold') {
      return sharp(input).threshold().toBuffer();
    }
    if (operation.type === 'quantize' || operation.type === 'segment') {
      return sharp(input).toBuffer();
    }
    if (operation.type === 'roll' || operation.type === 'distort' || operation.type === 'frame') {
      return sharp(input).toBuffer();
    }
    return input;
  }

  private toLevelByteValue(value: LevelValue | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    if (typeof value === 'number') {
      return this.toBoundedByte(Math.round(value));
    }
    const percentage = Number.parseFloat(value.slice(0, -1));
    if (!Number.isFinite(percentage)) return fallback;
    return this.toBoundedByte(Math.round((percentage / 100) * 255));
  }

  private toLinearStretchClipCount(value: LevelValue | undefined, pixelCount: number): number {
    if (value === undefined) return 0;
    if (typeof value === 'number') {
      return Math.max(0, Math.min(pixelCount - 1, Math.round(value)));
    }
    const percentage = Number.parseFloat(value.slice(0, -1));
    if (!Number.isFinite(percentage)) return 0;
    return Math.max(0, Math.min(pixelCount - 1, Math.floor((percentage / 100) * pixelCount)));
  }

  private async processLevelFallback(input: Buffer, options: LevelOptions): Promise<Buffer> {
    const rawImage = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const channels = rawImage.info.channels;
    const activeChannels = Math.min(3, channels);
    if (activeChannels <= 0) return input;

    const blackPoint = this.toLevelByteValue(options.black, 0);
    if (blackPoint >= 255) return input;
    const whitePoint = Math.min(255, Math.max(blackPoint + 1, this.toLevelByteValue(options.white, 255)));
    const gamma = Math.max(0.01, options.gamma ?? 1);

    for (let index = 0; index < rawImage.data.length; index += channels) {
      for (let channel = 0; channel < activeChannels; channel += 1) {
        const inputValue = rawImage.data[index + channel]!;
        const normalizedValue = (inputValue - blackPoint) / (whitePoint - blackPoint);
        const clippedValue = Math.max(0, Math.min(1, normalizedValue));
        const gammaAdjustedValue = Math.pow(clippedValue, 1 / gamma);
        rawImage.data[index + channel] = this.toBoundedByte(Math.round(gammaAdjustedValue * 255));
      }
    }

    return sharp(rawImage.data, {
      raw: {
        width: rawImage.info.width,
        height: rawImage.info.height,
        channels,
      },
    })
      .png()
      .toBuffer();
  }

  private async processLinearStretchFallback(
    input: Buffer,
    options: LinearStretchOptions,
  ): Promise<Buffer> {
    const rawImage = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const channels = rawImage.info.channels;
    const activeChannels = Math.min(3, channels);
    if (activeChannels <= 0) return input;

    const pixelCount = rawImage.info.width * rawImage.info.height;
    const blackClipCount = this.toLinearStretchClipCount(options.black, pixelCount);
    const whiteClipCount = this.toLinearStretchClipCount(options.white, pixelCount);
    if (blackClipCount === 0 && whiteClipCount === 0) {
      return input;
    }

    const bounds = Array.from({ length: activeChannels }, () => ({ low: 0, high: 255 }));
    for (let channel = 0; channel < activeChannels; channel += 1) {
      const histogram = new Uint32Array(256);
      for (let index = channel; index < rawImage.data.length; index += channels) {
        histogram[rawImage.data[index]!] += 1;
      }

      let cumulative = 0;
      for (let value = 0; value < histogram.length; value += 1) {
        cumulative += histogram[value]!;
        if (cumulative > blackClipCount) {
          bounds[channel]!.low = value;
          break;
        }
      }

      cumulative = 0;
      for (let value = histogram.length - 1; value >= 0; value -= 1) {
        cumulative += histogram[value]!;
        if (cumulative > whiteClipCount) {
          bounds[channel]!.high = value;
          break;
        }
      }

      if (bounds[channel]!.high <= bounds[channel]!.low) {
        bounds[channel] = { low: 0, high: 255 };
      }
    }

    for (let index = 0; index < rawImage.data.length; index += channels) {
      for (let channel = 0; channel < activeChannels; channel += 1) {
        const { low, high } = bounds[channel]!;
        if (high <= low) continue;
        const inputValue = rawImage.data[index + channel]!;
        const stretchedValue = Math.round(((inputValue - low) * 255) / (high - low));
        rawImage.data[index + channel] = this.toBoundedByte(stretchedValue);
      }
    }

    return sharp(rawImage.data, {
      raw: {
        width: rawImage.info.width,
        height: rawImage.info.height,
        channels,
      },
    })
      .png()
      .toBuffer();
  }

  private async processAutoLevelFallback(input: Buffer): Promise<Buffer> {
    const rawImage = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const channels = rawImage.info.channels;
    const activeChannels = Math.min(3, channels);
    if (activeChannels <= 0) {
      return input;
    }

    const pixelCount = rawImage.info.width * rawImage.info.height;
    const clipCount = Math.max(1, Math.floor(pixelCount * 0.005));
    const bounds = Array.from({ length: activeChannels }, () => ({ low: 0, high: 255 }));

    for (let channel = 0; channel < activeChannels; channel += 1) {
      const histogram = new Uint32Array(256);
      for (let index = channel; index < rawImage.data.length; index += channels) {
        histogram[rawImage.data[index]!] += 1;
      }

      let cumulative = 0;
      for (let value = 0; value < histogram.length; value += 1) {
        cumulative += histogram[value]!;
        if (cumulative > clipCount) {
          bounds[channel]!.low = value;
          break;
        }
      }

      cumulative = 0;
      for (let value = histogram.length - 1; value >= 0; value -= 1) {
        cumulative += histogram[value]!;
        if (cumulative > clipCount) {
          bounds[channel]!.high = value;
          break;
        }
      }

      if (bounds[channel]!.high <= bounds[channel]!.low) {
        bounds[channel] = { low: 0, high: 255 };
      }
    }

    for (let index = 0; index < rawImage.data.length; index += channels) {
      for (let channel = 0; channel < activeChannels; channel += 1) {
        const { low, high } = bounds[channel]!;
        if (high <= low) continue;
        const inputValue = rawImage.data[index + channel]!;
        const scaledValue = Math.round(((inputValue - low) * 255) / (high - low));
        rawImage.data[index + channel] = this.toBoundedByte(scaledValue);
      }
    }

    return sharp(rawImage.data, {
      raw: {
        width: rawImage.info.width,
        height: rawImage.info.height,
        channels,
      },
    })
      .png()
      .toBuffer();
  }

  private async processAddNoiseFallback(input: Buffer, options: AddNoiseOptions): Promise<Buffer> {
    const rawImage = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const channels = rawImage.info.channels;
    const activeChannels = Math.min(3, channels);
    const attenuate = Math.max(0, options.attenuate ?? 1);
    const noiseStrength = Math.max(8, Math.min(96, attenuate * 10));
    const impulseChance = Math.min(0.35, Math.max(0.02, attenuate * 0.03));

    let randomState = (Math.round(attenuate * 1000) ^ (rawImage.info.width * 31 + rawImage.info.height)) >>> 0;
    const getDeterministicRandom = (): number => {
      randomState = (randomState + 0x6d2b79f5) >>> 0;
      let value = randomState;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    const getSignedRandom = (): number => getDeterministicRandom() * 2 - 1;
    const getGaussianRandom = (): number => {
      const u1 = Math.max(getDeterministicRandom(), Number.EPSILON);
      const u2 = getDeterministicRandom();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    for (let index = 0; index < rawImage.data.length; index += channels) {
      for (let channel = 0; channel < activeChannels; channel += 1) {
        const currentValue = rawImage.data[index + channel]!;

        if (options.type === 'impulse') {
          if (getDeterministicRandom() < impulseChance) {
            rawImage.data[index + channel] = getDeterministicRandom() < 0.5 ? 0 : 255;
          }
          continue;
        }

        let delta = 0;
        if (options.type === 'gaussian') {
          delta = Math.round(getGaussianRandom() * (noiseStrength / 3));
        } else if (options.type === 'laplacian') {
          delta = Math.round((getDeterministicRandom() - getDeterministicRandom()) * noiseStrength);
        } else if (options.type === 'multiplicative') {
          const factor = 1 + getSignedRandom() * (noiseStrength / 128);
          rawImage.data[index + channel] = this.toBoundedByte(Math.round(currentValue * factor));
          continue;
        } else if (options.type === 'poisson') {
          delta = Math.round(getGaussianRandom() * Math.sqrt(Math.max(currentValue, 1)) * (noiseStrength / 32));
        } else {
          delta = Math.round(getSignedRandom() * noiseStrength);
        }

        rawImage.data[index + channel] = this.toBoundedByte(currentValue + delta);
      }
    }

    return sharp(rawImage.data, {
      raw: {
        width: rawImage.info.width,
        height: rawImage.info.height,
        channels,
      },
    })
      .png()
      .toBuffer();
  }

  private toBoundedByte(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  private toOperationArguments(operation: AssetOperation, width: number, height: number): string[] {
    switch (operation.type) {
      case 'blur': {
        const sigma = Math.max(0.1, operation.options.intensity);
        return operation.options.mode === 'pixel'
          ? ['-scale', `${Math.max(1, Math.round(width / (sigma * 2)))}x${Math.max(1, Math.round(height / (sigma * 2)))}`, '-scale', `${width}x${height}`]
          : ['-gaussian-blur', `0x${sigma}`];
      }
      case 'roll':
        return ['-roll', `${operation.offset.x}${typeof operation.offset.y === 'number' && operation.offset.y >= 0 ? '+' : ''}${operation.offset.y}`];
      case 'distort':
        return ['-distort', toDistortName(operation.options.type), operation.options.args.join(',')];
      case 'equalize':
        return ['-equalize'];
      case 'autoLevel':
        return ['-auto-level'];
      case 'autoGamma':
        return ['-auto-gamma'];
      case 'level': {
        const black = toLevelValue(operation.options.black);
        const white = toLevelValue(operation.options.white || '100%');
        const gamma = operation.options.gamma ?? 1;
        return ['-level', `${black},${white},${gamma}`];
      }
      case 'linearStretch':
        return [
          '-linear-stretch',
          operation.options.white === undefined
            ? toLevelValue(operation.options.black)
            : `${toLevelValue(operation.options.black)}x${toLevelValue(operation.options.white)}`,
        ];
      case 'contrast':
        return [operation.options.sharpen ? '-contrast' : '+contrast'];
      case 'posterize':
        return ['-posterize', `${operation.levels}`];
      case 'sepiaTone':
        return ['-sepia-tone', `${toLevelValue(operation.options.threshold ?? '80%')}`];
      case 'tint':
        return ['-fill', toColorString(operation.options.color), '-tint', '100'];
      case 'colorize':
        return ['-colorize', `${operation.options.red}/${operation.options.green}/${operation.options.blue}`];
      case 'threshold':
        if (operation.options.type === 'adaptive') return ['-lat', `${toThresholdValue(operation.options.value)}x${toThresholdValue(operation.options.value)}`];
        if (operation.options.type === 'black') return ['-black-threshold', toThresholdValue(operation.options.value)];
        if (operation.options.type === 'white') return ['-white-threshold', toThresholdValue(operation.options.value)];
        return ['-threshold', toThresholdValue(operation.options.value)];
      case 'quantize': {
        const result: string[] = ['-colors', `${operation.options.colors}`];
        const colorspace = toQuantizeColorspace(operation.options.colorspace);
        if (colorspace) result.push('-colorspace', colorspace);
        if (operation.options.dither === false) result.push('+dither');
        return result;
      }
      case 'segment': {
        const result: string[] = ['-segment', `${toLevelValue(operation.options.threshold ?? '10%')}x1`];
        const colorspace = toQuantizeColorspace(operation.options.colorspace);
        if (colorspace) result.push('-colorspace', colorspace);
        return result;
      }
      case 'adaptiveSharpen':
        return ['-adaptive-sharpen', `${operation.options.radius ?? 0}x${operation.options.sigma ?? 1}`];
      case 'motionBlur':
        return ['-motion-blur', `${operation.options.radius}x${operation.options.sigma}+${operation.options.angle}`];
      case 'rotationalBlur':
        return ['-rotational-blur', `${operation.options.angle}`];
      case 'addNoise': {
        const args: string[] = [];
        if (operation.options.attenuate !== undefined) {
          args.push('-attenuate', `${operation.options.attenuate}`);
        }
        args.push('+noise', toNoiseType(operation.options.type));
        return args;
      }
      case 'despeckle':
        return ['-despeckle'];
      case 'waveletDenoise':
        return ['-wavelet-denoise', `${operation.options.threshold ?? 0.6}x${operation.options.softness ?? 0.4}`];
      case 'charcoal':
        return ['-charcoal', `${operation.options.radius ?? 1}x${operation.options.sigma ?? 0.8}`];
      case 'sketch':
        return ['-sketch', `${operation.options.radius ?? 0}x${operation.options.sigma ?? 1}+${operation.options.angle ?? 135}`];
      case 'oilPaint':
        return ['-paint', `${operation.options.radius ?? 1}`];
      case 'emboss':
        return ['-emboss', `${operation.options.radius ?? 0}x${operation.options.sigma ?? 1}`];
      case 'solarize':
        return ['-solarize', toLevelValue(operation.options.threshold ?? '50%')];
      case 'spread':
        return ['-spread', `${operation.options.radius ?? 1}`];
      case 'implode':
        return ['-implode', `${operation.factor}`];
      case 'swirl':
        return ['-swirl', `${operation.degrees}`];
      case 'wave':
        return ['-wave', `${operation.options.amplitude ?? 2}x${operation.options.wavelength ?? 80}`];
      case 'vignette': {
        const color = operation.options.color ? toColorString(operation.options.color) : 'rgba(0,0,0,0.45)';
        return ['-background', color, '-vignette', `${operation.options.blur ?? 18}x${operation.options.blur ?? 18}`];
      }
      case 'shade':
        return [operation.options.gray ? '-shade' : '+shade', `${operation.options.azimuth}x${operation.options.elevation}`];
      case 'raise':
        return [operation.options.raise === false ? '+raise' : '-raise', `${operation.options.width}x${operation.options.height}`];
      case 'polaroid': {
        const args: string[] = [];
        if (operation.options.caption) args.push('-set', 'caption', operation.options.caption);
        args.push('-polaroid', `${operation.options.angle ?? 0}`);
        return args;
      }
      case 'fx':
        return ['-fx', operation.expression];
      case 'morphology':
        return [
          '-morphology',
          `${toMorphologyMethod(operation.options.method)}:${operation.options.iterations ?? 1}`,
          operation.options.kernel,
        ];
      case 'detectEdges':
        return ['-edge', `${operation.options.radius ?? 1}`];
      case 'frame':
        return ['-frame', `${operation.options.width}x${operation.options.height}+${operation.options.innerBevel ?? 0}+${operation.options.outerBevel ?? 0}`];
      default:
        return [];
    }
  }
}
