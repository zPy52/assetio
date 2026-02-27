---
name: assetio-sdk
description: Use when doing programmatic image or media editing and composition with the assetio SDK—loading images, applying transforms (crop, resize, rotate, flip/flop), overlaying shapes/text/images, grouping layers, applying filters (blur, sharpen, color adjustments, effects), and exporting to file, base64, or bytes. Covers the assetio TypeScript SDK API, overlay and export patterns, and best practices.
---

# Assetio SDK

TypeScript SDK for programmatic image editing and composition. Chain operations on a source image then export to file, base64 data URL, or raw bytes. Node-only (file paths and `file:` URLs; sharp/ImageMagick-backed rendering).

## Quick start

```ts
import { asset, Text } from 'assetio';

const out = await asset('./input.png')
  .resize({ width: 800 })
  .overlay(new Text('Hello', { width: 200, height: 40 }), { position: { x: 20, y: 20 } })
  .export({ format: 'file', path: './output.png' });
```

Load a source → chain operations (each method returns `this`) → call `export(options)` once at the end.

## Source and Asset

**Entry point:** `asset(input)` or `new Asset(input)`.

**Source types:** `string` (file path or `data:` URL), `URL` (only `file:`), `ArrayBuffer`, `Uint8Array`, `Buffer`. All are resolved to bytes at export time.

**Chained pipeline:** Operations run in order. Prefer: base geometry (crop/resize) first, then overlays/group, then global effects.

## Export

- **File:** `export({ format: 'file', path: '/out.png' })` — writes to disk; creates parent dirs. Returns the path string.
- **Base64:** `export({ format: 'base64', mimeType?: string })` — returns a data URL. MIME inferred from buffer if omitted.
- **Bytes:** `export({ format: 'bytes' })` — returns `Buffer` (Node).

Use `format: 'file'` for disk output, `base64` for in-memory/data URLs, `bytes` for streams or custom handling.

## Overlays and grouping

**Overlay:** `overlay(content, options?)`. Content can be:

- **BaseShape** — Rectangle, Ellipse, Line, Polygon, Star, Vector
- **Text** — string or TextRun[]
- **Source** — image (path, URL, buffer, data URL)
- **AssetLike** — another Asset (or object with `export()` and `toAssetState()`)

**Options:** `anchor` (e.g. `'top-left'`, `'center'`, `'bottom-right'`), `position: { x, y }` (number or percentage like `"50%"`), optional `mask`.

**Group:** `group(layers, options?)`. Each layer: `{ layer: OverlayContent, position?, anchor? }`. Optional `mask` on the group. Use for multiple overlays in one step.

**Placement:** Position `x`/`y` can be numbers or percentage strings (e.g. `"50%"`). Anchor fixes which point of the overlay is placed at that position.

**Masks:** `Mask.clip(shape)` (clip by shape), `Mask.alpha(config?)`, `Mask.luminance(config?)`. Pass as `options.mask` on overlay or group.

## Shapes (for overlays)

Import from `assetio`: `Rectangle`, `Ellipse`, `Line`, `Polygon`, `Star`, `Vector`, `ShapeOps`.

- **Rectangle:** `new Rectangle({ width, height, cornerRadius? })` — cornerRadius number or `{ tl, tr, br, bl }`.
- **Ellipse:** `new Ellipse({ width, height, arc? })` — arc: `{ startAngle, endAngle, innerRadius? }`.
- **Line:** `new Line({ start: [x,y], end: [x,y], startCap?, endCap? })` — caps: `'none'`, `'arrow'`, `'arrow-filled'`, etc.
- **Polygon:** `new Polygon({ sides, radius, rotation? })`.
- **Star:** `new Star({ points, radius, innerRadius?, rotation? })`.
- **Vector:** path built from segments (move, line, quadratic, cubic, close).

Shapes use `fill` and/or `stroke` (see Color/GradientColor). `ShapeOps` provides boolean ops (union, subtract, intersect, etc.) for combining shapes.

## Text (for overlays)

- **Text:** `new Text(content, options?)`. Content: string or `TextRun[]`. Options: `width`, `height`, `align`, `verticalAlign`, `overflow`, font-related.
- **TextRun:** styled run; use with `Font` for registration/weight.
- **Font:** register and resolve fonts; use with text options.

Text requires non-empty content. Options control layout (align, overflow) and typography.

## Colors and gradients

- **Color:** `Color.hex('#rrggbb', { opacity? })`, `Color.rgb(r, g, b, { opacity? })`, `Color.hsl(h, s, l, { opacity? })`. Opacity 0–1.
- **GradientColor:** linear/radial gradients; use for shape fills and strokes.

Use for shape `fill`/`stroke`, tint, border, frame, and other options that accept `ColorValue` or `GradientColorValue`.

## Asset operations (summary)

**Geometry:** `crop(area)` — area `{ x, y, width, height }`; `resize({ width?, height?, fit? })` — at least one of width/height, fit: `'fill'`|`'contain'`|`'cover'`|`'none'`; `rotate({ angle, background? })`; `flip()` (vertical); `flop()` (horizontal); `roll({ x, y })`; `distort({ type, args })` — type e.g. `'affine'`, `'perspective'`.

**Color/tonal:** `grayscale()`, `negate()`, `normalize()`, `equalize()`, `autoLevel()`, `autoGamma()`, `gamma(value)`, `level({ black?, white?, gamma? })`, `linearStretch({ black?, white? })`, `contrast({ sharpen? })`, `posterize(levels)`, `sepiaTone(options?)`, `tint({ color })`, `colorize({ red, green, blue })`, `threshold({ value, type? })`, `quantize({ colors, colorspace?, dither? })`, `segment(options?)`.

**Filters/blur:** `blur(points, options?)` — **requires at least 3 points** (contour); options: `mode` ('pixel'|'gaussian'), `intensity`; `sharpen(options?)`, `adaptiveSharpen(options?)`, `unsharpMask({ radius, sigma, amount, threshold })`, `motionBlur({ radius, sigma, angle })`, `rotationalBlur({ angle })`, `medianFilter(options?)`, `addNoise(options?)`, `despeckle()`, `waveletDenoise(options?)`.

**Effects (image):** `charcoal(options?)`, `sketch(options?)`, `oilPaint(options?)`, `emboss(options?)`, `solarize(options?)`, `spread(options?)`, `implode(factor)`, `swirl(degrees)`, `wave(options?)`, `vignette(options?)`, `shade({ azimuth, elevation, gray? })`, `raise({ width, height, raise? })`, `polaroid({ angle?, caption? })`.

**Advanced:** `fx(expression)` — ImageMagick-style expression; `morphology({ method, kernel, iterations? })`; `detectEdges(options?)`; `convolve({ kernel })` — 2D number matrix; `border({ width, height, color? })`; `frame({ width, height, innerBevel?, outerBevel?, color? })`.

Validation rules: e.g. resize needs at least width or height; blur at least 3 points with x/y on each; positive numbers where required (width, height, radius, etc.). Check method signatures in `src/asset/` when in doubt.

## Effects and blend modes (overlay/content)

**Effect** (static helpers for overlay content that supports them): `Effect.dropShadow(config)`, `Effect.innerShadow(config)`, `Effect.layerBlur(config)`, `Effect.backgroundBlur(config)`, `Effect.noise(config)`, `Effect.texture(config)`, `Effect.glass(config)`. Use when building overlays that accept effect configs.

**BlendMode:** constants e.g. `BlendMode.Normal`, `BlendMode.Multiply`, `BlendMode.Overlay`, etc. `BLEND_MODE_VALUES` exports the set. Use for compositing/blend options where supported (e.g. shape stroke).

## Best practices

- Chain operations and call a single `export()` at the end.
- Choose export format by destination: file for disk, base64 for data URLs, bytes for streams or custom handling.
- Use percentage placement (e.g. `"50%"`) for position when overlays should scale with base size.
- Reuse other `Asset` instances (or any `AssetLike`) as overlay content for composed pipelines.
- Order: base geometry first (crop/resize), then overlays/group, then global filters/effects.
- This SDK is Node-only; support is for file paths and `file:` URLs and sharp/ImageMagick-backed rendering.
