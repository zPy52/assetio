import type { MaskConfig } from '@/mask';
import type { BaseShape } from '@/shapes';
import type { Text } from '@/text';
import type { Anchor, PlacementValue, Source } from '@/types';
import type { ColorValue } from '@/color';

export type BlurPoint = {
  x: PlacementValue;
  y: PlacementValue;
};

export type BlurMode = 'pixel' | 'gaussian';

export type BlurOptions = {
  mode?: BlurMode;
  intensity?: number;
};

export type AssetPosition = {
  x: PlacementValue;
  y: PlacementValue;
};

export type AssetLike = {
  toAssetState(): AssetState;
  export(options: AssetExportOptions): Promise<Source>;
};

export type AssetExportFormat = 'file' | 'base64' | 'bytes';

export type AssetFileExportOptions = {
  format: 'file';
  path: string;
};

export type AssetBase64ExportOptions = {
  format: 'base64';
  mimeType?: string;
};

export type AssetBytesExportOptions = {
  format: 'bytes';
};

export type AssetExportOptions =
  | AssetFileExportOptions
  | AssetBase64ExportOptions
  | AssetBytesExportOptions;

export type OverlayContent = BaseShape | Text | Source | AssetLike;

export type OverlayOptions = {
  anchor?: Anchor;
  position?: AssetPosition;
  mask?: MaskConfig;
};

export type GroupLayer = {
  layer: OverlayContent;
  position?: AssetPosition;
  anchor?: Anchor;
};

export type GroupOptions = {
  mask?: MaskConfig;
};

export type CropArea = {
  x: PlacementValue;
  y: PlacementValue;
  width: PlacementValue;
  height: PlacementValue;
};

export type ResizeFit = 'fill' | 'contain' | 'cover' | 'none';

export type ResizeOptions = {
  width?: PlacementValue;
  height?: PlacementValue;
  fit?: ResizeFit;
};

export type RotateOptions = {
  angle: number;
  background?: ColorValue;
};

export type RollOffset = {
  x: PlacementValue;
  y: PlacementValue;
};

export type DistortType =
  | 'affine'
  | 'affineProjection'
  | 'bilinearForward'
  | 'bilinearReverse'
  | 'perspective'
  | 'perspectiveProjection'
  | 'scaleRotateTranslate'
  | 'arc'
  | 'polar'
  | 'depolar';

export type DistortOptions = {
  type: DistortType;
  args: number[];
};

export type LevelValue = number | `${number}%`;

export type LevelOptions = {
  black?: LevelValue;
  white?: LevelValue;
  gamma?: number;
};

export type LinearStretchOptions = {
  black?: LevelValue;
  white?: LevelValue;
};

export type ContrastOptions = {
  sharpen?: boolean;
};

export type SepiaToneOptions = {
  threshold?: LevelValue;
};

export type TintOptions = {
  color: ColorValue;
};

export type ColorizeOptions = {
  red: number;
  green: number;
  blue: number;
};

export type ThresholdType = 'global' | 'adaptive' | 'black' | 'white';

export type ThresholdOptions = {
  value: LevelValue;
  type?: ThresholdType;
};

export type QuantizeColorspace =
  | 'rgb'
  | 'srgb'
  | 'gray'
  | 'hsl'
  | 'hsv'
  | 'lab'
  | 'lch'
  | 'cmyk';

export type QuantizeOptions = {
  colors: number;
  colorspace?: QuantizeColorspace;
  dither?: boolean;
};

export type SegmentOptions = {
  threshold?: LevelValue;
  colorspace?: QuantizeColorspace;
};

export type RadiusSigmaOptions = {
  radius?: number;
  sigma?: number;
};

export type UnsharpMaskOptions = {
  radius: number;
  sigma: number;
  amount: number;
  threshold: number;
};

export type MotionBlurOptions = {
  radius: number;
  sigma: number;
  angle: number;
};

export type RotationalBlurOptions = {
  angle: number;
};

export type MedianFilterOptions = {
  radius?: number;
};

export type NoiseType =
  | 'uniform'
  | 'gaussian'
  | 'multiplicative'
  | 'impulse'
  | 'laplacian'
  | 'poisson'
  | 'random';

export type AddNoiseOptions = {
  type?: NoiseType;
  attenuate?: number;
};

export type WaveletDenoiseOptions = {
  threshold?: number;
  softness?: number;
};

export type SketchOptions = {
  radius?: number;
  sigma?: number;
  angle?: number;
};

export type OilPaintOptions = {
  radius?: number;
};

export type SolarizeOptions = {
  threshold?: LevelValue;
};

export type SpreadOptions = {
  radius?: number;
};

export type WaveOptions = {
  amplitude?: number;
  wavelength?: number;
};

export type VignetteOptions = {
  x?: PlacementValue;
  y?: PlacementValue;
  blur?: number;
  color?: ColorValue;
};

export type ShadeOptions = {
  azimuth: number;
  elevation: number;
  gray?: boolean;
};

export type RaiseOptions = {
  width: number;
  height: number;
  raise?: boolean;
};

export type PolaroidOptions = {
  angle?: number;
  caption?: string;
};

export type MorphologyMethod =
  | 'convolve'
  | 'correlate'
  | 'dilate'
  | 'erode'
  | 'open'
  | 'close'
  | 'distance'
  | 'edge'
  | 'topHat'
  | 'bottomHat'
  | 'thinning'
  | 'thicken';

export type MorphologyOptions = {
  method: MorphologyMethod;
  kernel: string;
  iterations?: number;
};

export type DetectEdgesOptions = {
  radius?: number;
};

export type ConvolveOptions = {
  kernel: number[][];
};

export type BorderOptions = {
  width: number;
  height: number;
  color?: ColorValue;
};

export type FrameOptions = {
  width: number;
  height: number;
  innerBevel?: number;
  outerBevel?: number;
  color?: ColorValue;
};

export type BlurOperation = {
  type: 'blur';
  points: BlurPoint[];
  options: Required<BlurOptions>;
};

export type OverlayOperation = {
  type: 'overlay';
  content: OverlayContent;
  options: Required<Pick<OverlayOptions, 'anchor' | 'position'>> & Pick<OverlayOptions, 'mask'>;
};

export type GroupOperation = {
  type: 'group';
  layers: Array<{
    layer: OverlayContent;
    position: AssetPosition;
    anchor: Anchor;
  }>;
  options: GroupOptions;
};

export type CropOperation = {
  type: 'crop';
  area: CropArea;
};

export type ResizeOperation = {
  type: 'resize';
  options: ResizeOptions;
};

export type RotateOperation = {
  type: 'rotate';
  options: RotateOptions;
};

export type FlipOperation = {
  type: 'flip';
};

export type FlopOperation = {
  type: 'flop';
};

export type RollOperation = {
  type: 'roll';
  offset: RollOffset;
};

export type DistortOperation = {
  type: 'distort';
  options: DistortOptions;
};

export type GrayscaleOperation = {
  type: 'grayscale';
};

export type NegateOperation = {
  type: 'negate';
};

export type NormalizeOperation = {
  type: 'normalize';
};

export type EqualizeOperation = {
  type: 'equalize';
};

export type AutoLevelOperation = {
  type: 'autoLevel';
};

export type AutoGammaOperation = {
  type: 'autoGamma';
};

export type GammaOperation = {
  type: 'gamma';
  value: number;
};

export type LevelOperation = {
  type: 'level';
  options: LevelOptions;
};

export type LinearStretchOperation = {
  type: 'linearStretch';
  options: LinearStretchOptions;
};

export type ContrastOperation = {
  type: 'contrast';
  options: Required<ContrastOptions>;
};

export type PosterizeOperation = {
  type: 'posterize';
  levels: number;
};

export type SepiaToneOperation = {
  type: 'sepiaTone';
  options: SepiaToneOptions;
};

export type TintOperation = {
  type: 'tint';
  options: TintOptions;
};

export type ColorizeOperation = {
  type: 'colorize';
  options: ColorizeOptions;
};

export type ThresholdOperation = {
  type: 'threshold';
  options: ThresholdOptions;
};

export type QuantizeOperation = {
  type: 'quantize';
  options: QuantizeOptions;
};

export type SegmentOperation = {
  type: 'segment';
  options: SegmentOptions;
};

export type SharpenOperation = {
  type: 'sharpen';
  options: RadiusSigmaOptions;
};

export type AdaptiveSharpenOperation = {
  type: 'adaptiveSharpen';
  options: RadiusSigmaOptions;
};

export type UnsharpMaskOperation = {
  type: 'unsharpMask';
  options: UnsharpMaskOptions;
};

export type MotionBlurOperation = {
  type: 'motionBlur';
  options: MotionBlurOptions;
};

export type RotationalBlurOperation = {
  type: 'rotationalBlur';
  options: RotationalBlurOptions;
};

export type MedianFilterOperation = {
  type: 'medianFilter';
  options: MedianFilterOptions;
};

export type AddNoiseOperation = {
  type: 'addNoise';
  options: AddNoiseOptions;
};

export type DespeckleOperation = {
  type: 'despeckle';
};

export type WaveletDenoiseOperation = {
  type: 'waveletDenoise';
  options: WaveletDenoiseOptions;
};

export type CharcoalOperation = {
  type: 'charcoal';
  options: RadiusSigmaOptions;
};

export type SketchOperation = {
  type: 'sketch';
  options: SketchOptions;
};

export type OilPaintOperation = {
  type: 'oilPaint';
  options: OilPaintOptions;
};

export type EmbossOperation = {
  type: 'emboss';
  options: RadiusSigmaOptions;
};

export type SolarizeOperation = {
  type: 'solarize';
  options: SolarizeOptions;
};

export type SpreadOperation = {
  type: 'spread';
  options: SpreadOptions;
};

export type ImplodeOperation = {
  type: 'implode';
  factor: number;
};

export type SwirlOperation = {
  type: 'swirl';
  degrees: number;
};

export type WaveOperation = {
  type: 'wave';
  options: WaveOptions;
};

export type VignetteOperation = {
  type: 'vignette';
  options: VignetteOptions;
};

export type ShadeOperation = {
  type: 'shade';
  options: ShadeOptions;
};

export type RaiseOperation = {
  type: 'raise';
  options: RaiseOptions;
};

export type PolaroidOperation = {
  type: 'polaroid';
  options: PolaroidOptions;
};

export type FxOperation = {
  type: 'fx';
  expression: string;
};

export type MorphologyOperation = {
  type: 'morphology';
  options: MorphologyOptions;
};

export type DetectEdgesOperation = {
  type: 'detectEdges';
  options: DetectEdgesOptions;
};

export type ConvolveOperation = {
  type: 'convolve';
  options: ConvolveOptions;
};

export type BorderOperation = {
  type: 'border';
  options: BorderOptions;
};

export type FrameOperation = {
  type: 'frame';
  options: FrameOptions;
};

export type AssetOperation =
  | BlurOperation
  | OverlayOperation
  | GroupOperation
  | CropOperation
  | ResizeOperation
  | RotateOperation
  | FlipOperation
  | FlopOperation
  | RollOperation
  | DistortOperation
  | GrayscaleOperation
  | NegateOperation
  | NormalizeOperation
  | EqualizeOperation
  | AutoLevelOperation
  | AutoGammaOperation
  | GammaOperation
  | LevelOperation
  | LinearStretchOperation
  | ContrastOperation
  | PosterizeOperation
  | SepiaToneOperation
  | TintOperation
  | ColorizeOperation
  | ThresholdOperation
  | QuantizeOperation
  | SegmentOperation
  | SharpenOperation
  | AdaptiveSharpenOperation
  | UnsharpMaskOperation
  | MotionBlurOperation
  | RotationalBlurOperation
  | MedianFilterOperation
  | AddNoiseOperation
  | DespeckleOperation
  | WaveletDenoiseOperation
  | CharcoalOperation
  | SketchOperation
  | OilPaintOperation
  | EmbossOperation
  | SolarizeOperation
  | SpreadOperation
  | ImplodeOperation
  | SwirlOperation
  | WaveOperation
  | VignetteOperation
  | ShadeOperation
  | RaiseOperation
  | PolaroidOperation
  | FxOperation
  | MorphologyOperation
  | DetectEdgesOperation
  | ConvolveOperation
  | BorderOperation
  | FrameOperation;

export type AssetState = {
  input: Source;
  operations: AssetOperation[];
};

export type AssetConfig = {
  input: Source;
};
