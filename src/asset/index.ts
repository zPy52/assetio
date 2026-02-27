import type {
  AddNoiseOptions,
  AssetConfig,
  AssetExportOptions,
  AssetLike,
  AssetOperation,
  AssetState,
  BorderOptions,
  BlurOptions,
  BlurPoint,
  ColorizeOptions,
  ContrastOptions,
  ConvolveOptions,
  CropArea,
  DetectEdgesOptions,
  DistortOptions,
  FrameOptions,
  GroupLayer,
  GroupOptions,
  LevelOptions,
  LinearStretchOptions,
  MedianFilterOptions,
  MorphologyOptions,
  MotionBlurOptions,
  OilPaintOptions,
  OverlayContent,
  OverlayOptions,
  PolaroidOptions,
  QuantizeOptions,
  RadiusSigmaOptions,
  RaiseOptions,
  ResizeOptions,
  RollOffset,
  RotateOptions,
  RotationalBlurOptions,
  SepiaToneOptions,
  SegmentOptions,
  ShadeOptions,
  SketchOptions,
  SolarizeOptions,
  SpreadOptions,
  ThresholdOptions,
  TintOptions,
  UnsharpMaskOptions,
  VignetteOptions,
  WaveletDenoiseOptions,
  WaveOptions,
} from '@/asset/types';
import { saveBytesToFile, toBase64DataUrl, toSourceBuffer } from '@/asset/export-source';
import { AssetRendererService } from '@/asset/renderer';
import type { PlacementValue, Source } from '@/types';

const DEFAULT_OVERLAY_ANCHOR = 'top-left' as const;
const DEFAULT_OVERLAY_POSITION = { x: 0, y: 0 } as const;
const DEFAULT_BLUR_MODE = 'pixel' as const;
const DEFAULT_BLUR_INTENSITY = 1;
const DEFAULT_CONTRAST_SHARPEN = true;
const DEFAULT_THRESHOLD_TYPE = 'global' as const;

function assertFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
}

function assertPositiveNumber(value: number, fieldName: string): void {
  assertFiniteNumber(value, fieldName);
  if (value <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
}

function assertNonNegativeNumber(value: number, fieldName: string): void {
  assertFiniteNumber(value, fieldName);
  if (value < 0) {
    throw new Error(`${fieldName} must not be negative.`);
  }
}

function toPlacementNumber(value: PlacementValue): number {
  if (typeof value === 'number') return value;
  return Number.parseFloat(value.slice(0, -1));
}

function hasMixedBlurPointUnits(points: BlurPoint[]): boolean {
  const xUnits = new Set(points.map((point) => typeof point.x));
  const yUnits = new Set(points.map((point) => typeof point.y));
  return xUnits.size > 1 || yUnits.size > 1;
}

function toOrderedBlurPoints(points: BlurPoint[]): BlurPoint[] {
  if (points.length < 3 || hasMixedBlurPointUnits(points)) {
    return points.map((point) => ({ ...point }));
  }

  const sortablePoints = points.map((point, index) => {
    const x = toPlacementNumber(point.x);
    const y = toPlacementNumber(point.y);
    return { point, index, x, y };
  });
  const centroidX = sortablePoints.reduce((sum, point) => sum + point.x, 0) / sortablePoints.length;
  const centroidY = sortablePoints.reduce((sum, point) => sum + point.y, 0) / sortablePoints.length;

  const orderedPoints = [...sortablePoints].sort((left, right) => {
    const leftAngle = Math.atan2(left.y - centroidY, left.x - centroidX);
    const rightAngle = Math.atan2(right.y - centroidY, right.x - centroidX);
    if (leftAngle !== rightAngle) return leftAngle - rightAngle;

    const leftDistance = (left.x - centroidX) ** 2 + (left.y - centroidY) ** 2;
    const rightDistance = (right.x - centroidX) ** 2 + (right.y - centroidY) ** 2;
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;

    return left.index - right.index;
  });

  let firstPointIndex = 0;
  for (let index = 1; index < orderedPoints.length; index += 1) {
    const currentPoint = orderedPoints[index]!;
    const firstPoint = orderedPoints[firstPointIndex]!;
    if (
      currentPoint.y < firstPoint.y
      || (currentPoint.y === firstPoint.y && currentPoint.x < firstPoint.x)
    ) {
      firstPointIndex = index;
    }
  }

  return [
    ...orderedPoints.slice(firstPointIndex),
    ...orderedPoints.slice(0, firstPointIndex),
  ].map((entry) => ({ ...entry.point }));
}

export class Asset implements AssetLike {
  private readonly operations: AssetOperation[] = [];

  public constructor(private readonly input: Source) {}

  public blur(points: BlurPoint[], options?: BlurOptions): this {
    if (points.length < 3) {
      throw new Error('Blur requires at least three contour points to define an area.');
    }
    if (points.some((point) => point.x === undefined || point.y === undefined)) {
      throw new Error('Blur points require both x and y values.');
    }
    const intensity = options?.intensity ?? DEFAULT_BLUR_INTENSITY;
    if (!Number.isFinite(intensity) || intensity <= 0) {
      throw new Error('Blur intensity must be greater than zero.');
    }

    this.operations.push({
      type: 'blur',
      points: toOrderedBlurPoints(points),
      options: {
        mode: options?.mode ?? DEFAULT_BLUR_MODE,
        intensity,
      },
    });
    return this;
  }

  public overlay(content: OverlayContent, options?: OverlayOptions): this {
    this.operations.push({
      type: 'overlay',
      content,
      options: {
        anchor: options?.anchor ?? DEFAULT_OVERLAY_ANCHOR,
        position: options?.position ?? { ...DEFAULT_OVERLAY_POSITION },
        mask: options?.mask,
      },
    });
    return this;
  }

  public group(layers: GroupLayer[], options?: GroupOptions): this {
    if (layers.length === 0) {
      throw new Error('Group requires at least one layer.');
    }

    this.operations.push({
      type: 'group',
      layers: layers.map((layer) => ({
        layer: layer.layer,
        anchor: layer.anchor ?? DEFAULT_OVERLAY_ANCHOR,
        position: layer.position ?? { ...DEFAULT_OVERLAY_POSITION },
      })),
      options: options ? { ...options } : {},
    });
    return this;
  }

  public crop(area: CropArea): this {
    if (
      area.x === undefined ||
      area.y === undefined ||
      area.width === undefined ||
      area.height === undefined
    ) {
      throw new Error('Crop requires x, y, width, and height.');
    }

    this.operations.push({
      type: 'crop',
      area: { ...area },
    });
    return this;
  }

  public resize(options: ResizeOptions): this {
    if (options.width === undefined && options.height === undefined) {
      throw new Error('Resize requires at least width or height.');
    }

    this.operations.push({
      type: 'resize',
      options: { ...options },
    });
    return this;
  }

  public rotate(options: RotateOptions): this {
    assertFiniteNumber(options.angle, 'Rotate angle');

    this.operations.push({
      type: 'rotate',
      options: { ...options },
    });
    return this;
  }

  public flip(): this {
    this.operations.push({ type: 'flip' });
    return this;
  }

  public flop(): this {
    this.operations.push({ type: 'flop' });
    return this;
  }

  public roll(offset: RollOffset): this {
    if (offset.x === undefined || offset.y === undefined) {
      throw new Error('Roll requires both x and y offsets.');
    }

    this.operations.push({
      type: 'roll',
      offset: { ...offset },
    });
    return this;
  }

  public distort(options: DistortOptions): this {
    if (options.args.length === 0) {
      throw new Error('Distort requires at least one argument.');
    }
    if (options.args.some((value) => !Number.isFinite(value))) {
      throw new Error('Distort args must contain finite numbers only.');
    }

    this.operations.push({
      type: 'distort',
      options: {
        type: options.type,
        args: [...options.args],
      },
    });
    return this;
  }

  public grayscale(): this {
    this.operations.push({ type: 'grayscale' });
    return this;
  }

  public negate(): this {
    this.operations.push({ type: 'negate' });
    return this;
  }

  public normalize(): this {
    this.operations.push({ type: 'normalize' });
    return this;
  }

  public equalize(): this {
    this.operations.push({ type: 'equalize' });
    return this;
  }

  public autoLevel(): this {
    this.operations.push({ type: 'autoLevel' });
    return this;
  }

  public autoGamma(): this {
    this.operations.push({ type: 'autoGamma' });
    return this;
  }

  public gamma(value: number): this {
    assertPositiveNumber(value, 'Gamma value');

    this.operations.push({
      type: 'gamma',
      value,
    });
    return this;
  }

  public level(options: LevelOptions): this {
    if (options.black === undefined && options.white === undefined && options.gamma === undefined) {
      throw new Error('Level requires at least black, white, or gamma.');
    }
    if (options.gamma !== undefined) {
      assertPositiveNumber(options.gamma, 'Level gamma');
    }

    this.operations.push({
      type: 'level',
      options: { ...options },
    });
    return this;
  }

  public linearStretch(options: LinearStretchOptions): this {
    if (options.black === undefined && options.white === undefined) {
      throw new Error('Linear stretch requires black and/or white values.');
    }

    this.operations.push({
      type: 'linearStretch',
      options: { ...options },
    });
    return this;
  }

  public contrast(options?: ContrastOptions): this {
    this.operations.push({
      type: 'contrast',
      options: {
        sharpen: options?.sharpen ?? DEFAULT_CONTRAST_SHARPEN,
      },
    });
    return this;
  }

  public posterize(levels: number): this {
    assertFiniteNumber(levels, 'Posterize levels');
    if (!Number.isInteger(levels) || levels < 2) {
      throw new Error('Posterize levels must be an integer greater than or equal to 2.');
    }

    this.operations.push({
      type: 'posterize',
      levels,
    });
    return this;
  }

  public sepiaTone(options?: SepiaToneOptions): this {
    this.operations.push({
      type: 'sepiaTone',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public tint(options: TintOptions): this {
    if (!options.color) {
      throw new Error('Tint requires a color.');
    }

    this.operations.push({
      type: 'tint',
      options: { ...options },
    });
    return this;
  }

  public colorize(options: ColorizeOptions): this {
    const channels = [
      { name: 'Colorize red', value: options.red },
      { name: 'Colorize green', value: options.green },
      { name: 'Colorize blue', value: options.blue },
    ];
    for (const channel of channels) {
      assertFiniteNumber(channel.value, channel.name);
      if (channel.value < 0 || channel.value > 100) {
        throw new Error(`${channel.name} must be between 0 and 100.`);
      }
    }

    this.operations.push({
      type: 'colorize',
      options: { ...options },
    });
    return this;
  }

  public threshold(options: ThresholdOptions): this {
    if (options.value === undefined) {
      throw new Error('Threshold requires a value.');
    }

    this.operations.push({
      type: 'threshold',
      options: {
        ...options,
        type: options.type ?? DEFAULT_THRESHOLD_TYPE,
      },
    });
    return this;
  }

  public quantize(options: QuantizeOptions): this {
    assertFiniteNumber(options.colors, 'Quantize colors');
    if (!Number.isInteger(options.colors) || options.colors < 2) {
      throw new Error('Quantize colors must be an integer greater than or equal to 2.');
    }

    this.operations.push({
      type: 'quantize',
      options: { ...options },
    });
    return this;
  }

  public segment(options?: SegmentOptions): this {
    this.operations.push({
      type: 'segment',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public sharpen(options?: RadiusSigmaOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Sharpen radius');
    }
    if (options?.sigma !== undefined) {
      assertNonNegativeNumber(options.sigma, 'Sharpen sigma');
    }

    this.operations.push({
      type: 'sharpen',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public adaptiveSharpen(options?: RadiusSigmaOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Adaptive sharpen radius');
    }
    if (options?.sigma !== undefined) {
      assertNonNegativeNumber(options.sigma, 'Adaptive sharpen sigma');
    }

    this.operations.push({
      type: 'adaptiveSharpen',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public unsharpMask(options: UnsharpMaskOptions): this {
    assertNonNegativeNumber(options.radius, 'Unsharp mask radius');
    assertNonNegativeNumber(options.sigma, 'Unsharp mask sigma');
    assertNonNegativeNumber(options.amount, 'Unsharp mask amount');
    assertNonNegativeNumber(options.threshold, 'Unsharp mask threshold');

    this.operations.push({
      type: 'unsharpMask',
      options: { ...options },
    });
    return this;
  }

  public motionBlur(options: MotionBlurOptions): this {
    assertNonNegativeNumber(options.radius, 'Motion blur radius');
    assertNonNegativeNumber(options.sigma, 'Motion blur sigma');
    assertFiniteNumber(options.angle, 'Motion blur angle');

    this.operations.push({
      type: 'motionBlur',
      options: { ...options },
    });
    return this;
  }

  public rotationalBlur(options: RotationalBlurOptions): this {
    assertFiniteNumber(options.angle, 'Rotational blur angle');

    this.operations.push({
      type: 'rotationalBlur',
      options: { ...options },
    });
    return this;
  }

  public medianFilter(options?: MedianFilterOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Median filter radius');
    }

    this.operations.push({
      type: 'medianFilter',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public addNoise(options?: AddNoiseOptions): this {
    if (options?.attenuate !== undefined) {
      assertNonNegativeNumber(options.attenuate, 'Noise attenuate');
    }

    this.operations.push({
      type: 'addNoise',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public despeckle(): this {
    this.operations.push({ type: 'despeckle' });
    return this;
  }

  public waveletDenoise(options?: WaveletDenoiseOptions): this {
    if (options?.threshold !== undefined) {
      assertNonNegativeNumber(options.threshold, 'Wavelet denoise threshold');
    }
    if (options?.softness !== undefined) {
      assertNonNegativeNumber(options.softness, 'Wavelet denoise softness');
    }

    this.operations.push({
      type: 'waveletDenoise',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public charcoal(options?: RadiusSigmaOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Charcoal radius');
    }
    if (options?.sigma !== undefined) {
      assertNonNegativeNumber(options.sigma, 'Charcoal sigma');
    }

    this.operations.push({
      type: 'charcoal',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public sketch(options?: SketchOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Sketch radius');
    }
    if (options?.sigma !== undefined) {
      assertNonNegativeNumber(options.sigma, 'Sketch sigma');
    }
    if (options?.angle !== undefined) {
      assertFiniteNumber(options.angle, 'Sketch angle');
    }

    this.operations.push({
      type: 'sketch',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public oilPaint(options?: OilPaintOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Oil paint radius');
    }

    this.operations.push({
      type: 'oilPaint',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public emboss(options?: RadiusSigmaOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Emboss radius');
    }
    if (options?.sigma !== undefined) {
      assertNonNegativeNumber(options.sigma, 'Emboss sigma');
    }

    this.operations.push({
      type: 'emboss',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public solarize(options?: SolarizeOptions): this {
    this.operations.push({
      type: 'solarize',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public spread(options?: SpreadOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Spread radius');
    }

    this.operations.push({
      type: 'spread',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public implode(factor: number): this {
    assertFiniteNumber(factor, 'Implode factor');

    this.operations.push({
      type: 'implode',
      factor,
    });
    return this;
  }

  public swirl(degrees: number): this {
    assertFiniteNumber(degrees, 'Swirl degrees');

    this.operations.push({
      type: 'swirl',
      degrees,
    });
    return this;
  }

  public wave(options?: WaveOptions): this {
    if (options?.amplitude !== undefined) {
      assertNonNegativeNumber(options.amplitude, 'Wave amplitude');
    }
    if (options?.wavelength !== undefined) {
      assertNonNegativeNumber(options.wavelength, 'Wave wavelength');
    }

    this.operations.push({
      type: 'wave',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public vignette(options?: VignetteOptions): this {
    if (options?.blur !== undefined) {
      assertNonNegativeNumber(options.blur, 'Vignette blur');
    }

    this.operations.push({
      type: 'vignette',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public shade(options: ShadeOptions): this {
    assertFiniteNumber(options.azimuth, 'Shade azimuth');
    assertFiniteNumber(options.elevation, 'Shade elevation');

    this.operations.push({
      type: 'shade',
      options: { ...options },
    });
    return this;
  }

  public raise(options: RaiseOptions): this {
    assertPositiveNumber(options.width, 'Raise width');
    assertPositiveNumber(options.height, 'Raise height');

    this.operations.push({
      type: 'raise',
      options: { ...options },
    });
    return this;
  }

  public polaroid(options?: PolaroidOptions): this {
    if (options?.angle !== undefined) {
      assertFiniteNumber(options.angle, 'Polaroid angle');
    }
    if (options?.caption !== undefined && options.caption.trim().length === 0) {
      throw new Error('Polaroid caption must not be empty when provided.');
    }

    this.operations.push({
      type: 'polaroid',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public fx(expression: string): this {
    if (expression.trim().length === 0) {
      throw new Error('FX expression must not be empty.');
    }

    this.operations.push({
      type: 'fx',
      expression,
    });
    return this;
  }

  public morphology(options: MorphologyOptions): this {
    if (options.kernel.trim().length === 0) {
      throw new Error('Morphology kernel must not be empty.');
    }
    if (options.iterations !== undefined) {
      assertPositiveNumber(options.iterations, 'Morphology iterations');
    }

    this.operations.push({
      type: 'morphology',
      options: { ...options },
    });
    return this;
  }

  public detectEdges(options?: DetectEdgesOptions): this {
    if (options?.radius !== undefined) {
      assertNonNegativeNumber(options.radius, 'Edge detection radius');
    }

    this.operations.push({
      type: 'detectEdges',
      options: options ? { ...options } : {},
    });
    return this;
  }

  public convolve(options: ConvolveOptions): this {
    if (options.kernel.length === 0 || options.kernel.some((row) => row.length === 0)) {
      throw new Error('Convolve kernel must not be empty.');
    }
    const rowLength = options.kernel[0].length;
    if (options.kernel.some((row) => row.length !== rowLength)) {
      throw new Error('Convolve kernel rows must all have the same length.');
    }
    if (options.kernel.some((row) => row.some((value) => !Number.isFinite(value)))) {
      throw new Error('Convolve kernel must contain finite numbers only.');
    }

    this.operations.push({
      type: 'convolve',
      options: {
        kernel: options.kernel.map((row) => [...row]),
      },
    });
    return this;
  }

  public border(options: BorderOptions): this {
    assertPositiveNumber(options.width, 'Border width');
    assertPositiveNumber(options.height, 'Border height');

    this.operations.push({
      type: 'border',
      options: { ...options },
    });
    return this;
  }

  public frame(options: FrameOptions): this {
    assertPositiveNumber(options.width, 'Frame width');
    assertPositiveNumber(options.height, 'Frame height');
    if (options.innerBevel !== undefined) {
      assertNonNegativeNumber(options.innerBevel, 'Frame inner bevel');
    }
    if (options.outerBevel !== undefined) {
      assertNonNegativeNumber(options.outerBevel, 'Frame outer bevel');
    }

    this.operations.push({
      type: 'frame',
      options: { ...options },
    });
    return this;
  }

  public getOperations(): AssetOperation[] {
    return [...this.operations];
  }

  public async export(options: AssetExportOptions): Promise<Source> {
    const bytes =
      this.operations.length > 0
        ? await AssetRendererService.processOperations(this.input, this.operations)
        : await toSourceBuffer(this.input);

    if (options.format === 'file') {
      if (!options.path || options.path.trim().length === 0) {
        throw new Error('Asset file export requires a non-empty output path.');
      }
      return saveBytesToFile(bytes, options.path);
    }

    if (options.format === 'base64') {
      return toBase64DataUrl(bytes, options.mimeType);
    }

    return bytes;
  }

  public toAssetState(): AssetState {
    return {
      input: this.input,
      operations: this.getOperations(),
    };
  }
}

export function asset(config: AssetConfig | Source): Asset {
  if (typeof config === 'string' || config instanceof URL) {
    return new Asset(config);
  }
  if (config instanceof ArrayBuffer || config instanceof Uint8Array || Buffer.isBuffer(config)) {
    return new Asset(config);
  }
  return new Asset(config.input);
}

export type {
  AddNoiseOperation,
  AddNoiseOptions,
  AdaptiveSharpenOperation,
  AssetConfig,
  AssetBase64ExportOptions,
  AssetBytesExportOptions,
  AssetExportFormat,
  AssetExportOptions,
  AssetFileExportOptions,
  AssetLike,
  AssetOperation,
  AssetPosition,
  AssetState,
  AutoGammaOperation,
  AutoLevelOperation,
  BorderOperation,
  BorderOptions,
  BlurMode,
  BlurOperation,
  BlurOptions,
  BlurPoint,
  CharcoalOperation,
  ColorizeOperation,
  ColorizeOptions,
  ContrastOperation,
  ContrastOptions,
  ConvolveOperation,
  ConvolveOptions,
  CropArea,
  CropOperation,
  DetectEdgesOperation,
  DetectEdgesOptions,
  DespeckleOperation,
  DistortOperation,
  DistortOptions,
  DistortType,
  EmbossOperation,
  EqualizeOperation,
  FlipOperation,
  FlopOperation,
  FrameOperation,
  FrameOptions,
  FxOperation,
  GammaOperation,
  GrayscaleOperation,
  GroupLayer,
  GroupOperation,
  GroupOptions,
  ImplodeOperation,
  LevelOperation,
  LevelOptions,
  LevelValue,
  LinearStretchOperation,
  LinearStretchOptions,
  MedianFilterOperation,
  MedianFilterOptions,
  MorphologyMethod,
  MorphologyOperation,
  MorphologyOptions,
  MotionBlurOperation,
  MotionBlurOptions,
  NegateOperation,
  NoiseType,
  NormalizeOperation,
  OilPaintOperation,
  OilPaintOptions,
  OverlayContent,
  OverlayOperation,
  OverlayOptions,
  PolaroidOperation,
  PolaroidOptions,
  PosterizeOperation,
  QuantizeColorspace,
  QuantizeOperation,
  QuantizeOptions,
  RadiusSigmaOptions,
  RaiseOperation,
  RaiseOptions,
  ResizeFit,
  ResizeOperation,
  ResizeOptions,
  RollOffset,
  RollOperation,
  RotateOperation,
  RotateOptions,
  RotationalBlurOperation,
  RotationalBlurOptions,
  SepiaToneOperation,
  SepiaToneOptions,
  SegmentOperation,
  SegmentOptions,
  ShadeOperation,
  ShadeOptions,
  SharpenOperation,
  SketchOperation,
  SketchOptions,
  SolarizeOperation,
  SolarizeOptions,
  SpreadOperation,
  SpreadOptions,
  SwirlOperation,
  ThresholdOperation,
  ThresholdOptions,
  ThresholdType,
  TintOperation,
  TintOptions,
  UnsharpMaskOperation,
  UnsharpMaskOptions,
  VignetteOperation,
  VignetteOptions,
  WaveOperation,
  WaveOptions,
  WaveletDenoiseOperation,
  WaveletDenoiseOptions,
} from '@/asset/types';
