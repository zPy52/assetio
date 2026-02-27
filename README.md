# AssetIO

**TypeScript SDK for programmatic image editing and composition.** Build an asset pipeline with chainable operations: crop, resize, rotate, overlays, shapes, text, effects, and masks—then export to a file, base64, or bytes. Same pipeline for all outputs; intent is expressed in plain language (`.crop`, `.resize`, `.overlay`, etc.), similar to ImageMagick.

- **Node.js** — uses [Sharp](https://sharp.pixelplumbing.com/) and [@napi-rs/canvas](https://github.com/napi-rs/node-canvas) for processing.
- **Chainable API** — `asset()` returns an `Asset` whose methods return `this` so you can compose in one expression.
- **Rich composition** — overlay shapes (Ellipse, Rectangle, Line, Polygon, Star, Vector), text, and images; group layers; apply alpha/luminance/clip masks and Figma-style effects (shadows, blur, noise, texture, glass).

## Install

```bash
npm install assetio
# or
pnpm add assetio
```

**Requirements:** Node.js ≥ 18.

## Quick start

```ts
import { asset, Color, Rectangle } from 'assetio';

const image = asset('input.jpg')
  .crop({ x: 120, y: 80, width: 600, height: 600 })
  .resize({ width: 1080, height: 1080, fit: 'cover' })
  .rotate({ angle: 2.5, background: Color.hex('#000000') })
  .overlay(
    new Rectangle({ width: 90, height: 90 }).fill(Color.hex('#fff')),
    { position: { x: '5%', y: '5%' } },
  );

await image.export({ format: 'file', path: 'output.jpg' });
```

## Composition API

Create an asset with `asset(input)` and chain operations. Order matters: operations are applied in sequence (e.g. crop → resize → overlay).

### Input

- **Constructor:** `asset(source)` or `asset({ input: source })`.
- **Source:** file path (string), `URL`, `ArrayBuffer`, `Uint8Array`, or `Buffer`.

### Geometric operations

| Method | Description |
|--------|-------------|
| `crop(area)` | Crop to a region. `area`: `{ x, y, width, height }` (pixels or `'50%'`). |
| `resize(options)` | Resize. `width`/`height` (pixels or `'50%'`), `fit`: `'fill'` \| `'contain'` \| `'cover'` \| `'none'`. |
| `rotate(options)` | Rotate by `angle` (degrees). Optional `background` (e.g. `Color.hex('#101010')`). |
| `flip()` | Vertical mirror. |
| `flop()` | Horizontal mirror. |
| `roll(offset)` | Roll image. `offset`: `{ x, y }` (pixels or percentage). |
| `distort(options)` | Distort. `type`: e.g. `'perspective'`, `'affine'`; `args`: number array. |

### Color / tonal operations

| Method | Description |
|--------|-------------|
| `grayscale()` | Convert to grayscale. |
| `negate()` | Negate colors. |
| `normalize()` | Normalize levels. |
| `equalize()` | Equalize histogram. |
| `autoLevel()` | Auto level. |
| `autoGamma()` | Auto gamma. |
| `gamma(value)` | Gamma correction. |
| `level(options)` | Level adjustment. `black`/`white` (e.g. `'2%'`, `'98%'`), `gamma`. |
| `linearStretch(options)` | Linear stretch. `black`/`white` percentage. |
| `contrast(options?)` | Contrast. Optional `sharpen: true`. |
| `posterize(levels)` | Posterize to `levels` (number). |
| `sepiaTone(options?)` | Sepia. Optional `threshold` (e.g. `'80%'`). |
| `tint(options)` | Tint. `color`: e.g. `Color.hex('#89a8ff')`. |
| `colorize(options)` | Colorize. `red`, `green`, `blue` (numbers). |
| `threshold(options)` | Threshold. `value` (e.g. `'54%'`), optional `type`: `'global'` \| `'adaptive'` \| `'black'` \| `'white'`. |
| `quantize(options)` | Quantize. `colors`, optional `colorspace`, `dither`. |
| `segment(options?)` | Segment. Optional `threshold`, `colorspace`. |

### Blur / sharpen / noise

| Method | Description |
|--------|-------------|
| `blur(points, options?)` | Localized blur inside a contour. `points`: array of `{ x, y }` (pixels or `'5%'`), at least 3. `options`: `mode` (`'pixel'` \| `'gaussian'`), `intensity`. |
| `sharpen(options?)` | Sharpen. Optional `radius`, `sigma`. |
| `adaptiveSharpen(options?)` | Adaptive sharpen. |
| `unsharpMask(options)` | Unsharp mask. `radius`, `sigma`, `amount`, `threshold`. |
| `motionBlur(options)` | Motion blur. `radius`, `sigma`, `angle`. |
| `rotationalBlur(options)` | Rotational blur. `angle`. |
| `medianFilter(options?)` | Median filter. Optional `radius`. |
| `addNoise(options?)` | Add noise. Optional `type`, `attenuate`. |
| `despeckle()` | Despeckle. |
| `waveletDenoise(options?)` | Wavelet denoise. Optional `threshold`, `softness`. |

### Artistic / distortion

| Method | Description |
|--------|-------------|
| `charcoal(options?)` | Charcoal effect. Optional `radius`, `sigma`. |
| `sketch(options?)` | Sketch. Optional `radius`, `sigma`, `angle`. |
| `oilPaint(options?)` | Oil paint. Optional `radius`. |
| `emboss(options?)` | Emboss. Optional `radius`, `sigma`. |
| `solarize(options?)` | Solarize. Optional `threshold`. |
| `spread(options?)` | Spread. Optional `radius`. |
| `implode(factor)` | Implode (negative = explode). |
| `swirl(degrees)` | Swirl. |
| `wave(options?)` | Wave. Optional `amplitude`, `wavelength`. |
| `vignette(options?)` | Vignette. Optional `x`, `y`, `blur`, `color`. |
| `shade(options)` | Shade. `azimuth`, `elevation`, optional `gray`. |
| `raise(options)` | Raise. `width`, `height`, `raise`. |
| `polaroid(options?)` | Polaroid frame. Optional `angle`, `caption`. |
| `fx(expression)` | Raw FX expression (e.g. `'u^1.03'`). |
| `morphology(options)` | Morphology. `method`, `kernel`, `iterations`. |
| `detectEdges(options?)` | Edge detection. Optional `radius`. |
| `convolve(options)` | Convolve. `kernel`: 2D number array. |

### Border / frame

| Method | Description |
|--------|-------------|
| `border(options)` | Border. `width`, `height`, `color`. |
| `frame(options)` | Frame. `width`, `height`, optional `innerBevel`, `outerBevel`, `color`. |

### Overlay and group

| Method | Description |
|--------|-------------|
| `overlay(content, options?)` | Composite a shape, text, image source, or another exportable on top. `options`: `position` (`{ x, y }` — pixels or `'50%'`), `anchor` (e.g. `'top-left'`, `'center'`), `mask` (e.g. `Mask.clip(shape)`). |
| `group(layers, options?)` | Composite multiple layers as a group. `layers`: array of `{ layer, position?, anchor? }`. `options`: `mask`. |

### Export

```ts
// Write to file
await image.export({ format: 'file', path: 'output.jpg' });

// Get base64 data URL
const dataUrl = await image.export({ format: 'base64', mimeType: 'image/jpeg' });

// Get raw bytes (Buffer)
const bytes = await image.export({ format: 'bytes' });
```

## Shapes

Overlay shapes (Figma-style): **Ellipse**, **Rectangle**, **Line**, **Polygon**, **Star**, and **Vector** (SVG-style path). Chain `.fill()` and `.stroke()` for styling.

```ts
import {
  Ellipse,
  Rectangle,
  Line,
  Polygon,
  Star,
  Vector,
  Color,
  GradientColor,
} from 'assetio';

const rect = new Rectangle({
  width: 300,
  height: 150,
  cornerRadius: 12,
  // or per-corner: cornerRadius: { tl: 12, tr: 0, br: 12, bl: 0 },
})
  .fill(Color.hex('#6366f1'))
  .stroke({
    color: Color.hex('#312e81'),
    width: 2,
    position: 'inside', // 'inside' | 'outside' | 'center'
    dash: [8, 4],
    cap: 'round',
    join: 'miter',
  });

const ellipse = new Ellipse({ width: 200, height: 100 });
const polygon = new Polygon({ sides: 6, radius: 100, rotation: 0 });
const star = new Star({ points: 5, radius: 100, innerRadius: 0.382 });
const line = new Line({ start: [0, 0], end: [200, 100], endCap: 'arrow' });
const vector = new Vector({ d: 'M 0 0 L 100 0 L 50 100 Z', closed: true });

asset('photo.png').overlay(rect, { position: { x: 20, y: 20 } });
```

Use `ShapeOps.subtract(shapeA, shapeB)` (and similar) to combine shapes; result is a `Vector`.

## Text

```ts
import { Text, TextRun, Font, Color } from 'assetio';

const text = new Text('Hello world', {
  font: Font.use('Inter', { size: 48, weight: 600 }),
  color: Color.hex('#1a1a1a'),
  align: 'center',
  verticalAlign: 'top',
  width: 400,
  maxHeight: 200,
  overflow: 'ellipsis',
  lineHeight: 1.5,
  letterSpacing: 0.02,
});

// Mixed styling with TextRun
const mixed = new Text(
  [
    new TextRun('Hello ', { font: Font.use('Inter', { size: 48, weight: 400 }), color: Color.hex('#1a1a1a') }),
    new TextRun('world', { font: Font.use('Inter', { size: 48, weight: 700 }), color: Color.hex('#6366f1') }),
  ],
  { width: 400, align: 'left' },
);

asset('photo.png').overlay(text, { position: { x: 50, y: 50 } });
```

Load fonts before use:

```ts
await Font.load('Cardo', './fonts/Cardo-Variable.ttf');
await Font.load('Cardo', 'https://fonts.example.com/cardo.woff2');
Font.use('Cardo', { size: 48 });
```

## Effects

Figma-style effects on shapes (and text): drop shadow, inner shadow, layer blur, background blur, noise, texture, glass. Chain with `.effect()`.

```ts
import { Ellipse, Effect, Color } from 'assetio';

const shape = new Ellipse({ width: 200, height: 200 })
  .fill(Color.hex('#6366f1'))
  .effect(
    Effect.dropShadow({
      offset: { x: 4, y: 8 },
      blur: 16,
      spread: 0,
      color: Color.hex('#000', { opacity: 0.3 }),
    }),
  )
  .effect(Effect.innerShadow({ offset: { x: 0, y: 4 }, blur: 8, color: Color.hex('#000', { opacity: 0.2 }) }))
  .effect(Effect.layerBlur({ radius: 12 }))
  .effect(Effect.backgroundBlur({ radius: 20 }))
  .effect(Effect.noise({ opacity: 0.15, size: 1, mode: 'color' }))
  .effect(Effect.texture({ source: './textures/paper.png', opacity: 0.4, blendMode: 'multiply', scale: 1 }))
  .effect(Effect.glass({ blur: 24, opacity: 0.6, tint: Color.hex('#ffffff', { opacity: 0.1 }), refraction: 0.05 }));
```

## Masks

Mask an overlay: **clip** (hard crop to shape geometry), **alpha** (shape transparency controls visibility), **luminance** (brightness controls visibility).

```ts
import { asset, Ellipse, Rectangle, Mask, Color, GradientColor } from 'assetio';

// Clip: hard crop to the ellipse
asset('photo.png').overlay(
  new Ellipse({ width: 400, height: 400 }),
  {
    position: { x: 100, y: 100 },
    mask: Mask.clip(),
  },
);

// Alpha mask: gradient fade
asset('photo.png').overlay(
  new Rectangle({ width: 600, height: 400 }).fill(
    GradientColor.linear({
      direction: GradientColor.direction({ start: [0, 0], end: [1, 0] }),
      colors: [Color.hex('#fff', { opacity: 1 }), Color.hex('#fff', { opacity: 0 })],
      stops: [0, 1],
    }),
  ),
  { position: { x: 0, y: 0 }, mask: Mask.alpha() },
);

// Luminance mask
asset('photo.png').overlay(someShape, { mask: Mask.luminance() });

// Mask with external image
asset('photo.png').overlay(someShape, { mask: Mask.alpha({ source: './masks/feather.png' }) });

// Group with shared mask
asset('photo.png').group(
  [
    { layer: new Ellipse({ width: 200, height: 200 }).fill(Color.hex('#6366f1')), position: { x: 0, y: 0 } },
    { layer: new Rectangle({ width: 200, height: 200 }).fill(Color.hex('#f00')), position: { x: 50, y: 50 } },
  ],
  { mask: Mask.clip(new Ellipse({ width: 220, height: 220 })) },
);
```

## API overview

| Area | Main APIs |
|------|-----------|
| **Input** | `asset(source)`, `asset({ input: source })` |
| **Geometric** | `crop`, `resize`, `rotate`, `flip`, `flop`, `roll`, `distort` |
| **Color / tonal** | `grayscale`, `negate`, `normalize`, `equalize`, `autoLevel`, `autoGamma`, `gamma`, `level`, `linearStretch`, `contrast`, `posterize`, `sepiaTone`, `tint`, `colorize`, `threshold`, `quantize`, `segment` |
| **Blur / sharpen** | `blur`, `sharpen`, `adaptiveSharpen`, `unsharpMask`, `motionBlur`, `rotationalBlur`, `medianFilter`, `addNoise`, `despeckle`, `waveletDenoise` |
| **Artistic** | `charcoal`, `sketch`, `oilPaint`, `emboss`, `solarize`, `spread`, `implode`, `swirl`, `wave`, `vignette`, `shade`, `raise`, `polaroid`, `fx`, `morphology`, `detectEdges`, `convolve` |
| **Border / frame** | `border`, `frame` |
| **Composition** | `overlay`, `group` |
| **Export** | `export({ format: 'file', path } \| { format: 'base64', mimeType? } \| { format: 'bytes' })` |
| **Shapes** | `Ellipse`, `Rectangle`, `Line`, `Polygon`, `Star`, `Vector` — `.fill()`, `.stroke()`, `ShapeOps` |
| **Text** | `Text`, `TextRun`, `Font` |
| **Effects** | `Effect.dropShadow`, `innerShadow`, `layerBlur`, `backgroundBlur`, `noise`, `texture`, `glass` |
| **Masks** | `Mask.clip`, `Mask.alpha`, `Mask.luminance` |

## License

Apache-2.0.
