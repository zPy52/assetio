# AssetIO

**TypeScript SDK for programmatic video editing.** Build a composition with cuts, scales, crops, overlays, zoom, blur, and fades—then export to a file or preview frames in real time. Same pipeline for export and preview; no separate “preview mode.”

- **Node.js only** — uses [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) for encoding. For browser UIs, run the SDK on a server and expose preview via HTTP (see [Preview in the browser](#preview-in-the-browser)).
- **Chainable API** — `AssetIOMedia` methods return `this` so you can compose in one expression.
- **Hardware encoding** — optional GPU encoders (NVENC, QSV, AMF, VideoToolbox, etc.) with automatic fallback to CPU.

## Install

```bash
pnpm add assetio
# or
npm install assetio
```

**Requirements:** Node.js ≥ 18. The `ffmpeg-static` binary is used for all processing; no system FFmpeg required.

## Quick start

```ts
import { AssetIOMedia } from 'assetio';

const media = new AssetIOMedia({ input: 'input.mp4' })
  .scale(1.2)
  .cut({ cuts: [{ from: 5, to: 65 }] })
  .overlay({ src: 'logo.png', at: 2, anchor: 'top-right' });

await media.export('output.mp4');
```

## Composition API

Create a `AssetIOMedia` instance and chain operations. Order matters: operations are applied in sequence (e.g. scale then crop then overlay).

### Input

- **Constructor:** `new AssetIOMedia({ input?: Source, hardware?: string })`
- **Source:** file path (string), `URL`, `ArrayBuffer`, `Uint8Array`, or `Buffer`.
- **Set later:** `media.setInput(source)`.

### Trimming and layout

| Method | Description |
|--------|-------------|
| `cut({ cuts })` | Keep one or more segments. `cuts`: `Array<{ from: number; to?: number }>`. Overlapping/adjacent ranges are merged. |
| `scale(factor)` | Scale width and height by `factor` (e.g. `0.5` = half size). |
| `crop(options)` | Crop to a region or aspect ratio. Use `width`/`height` (pixels or `'50%'`) or `aspectRatio: '16:9' \| '4:3' \| '1:1'` with optional `anchor`, `x`, `y`. |

### Overlays

| Method | Description |
|--------|-------------|
| `overlay({ src, at, anchor?, x?, y?, zIndex?, shadow? })` | Composite an image or another `AssetIOMedia` on top at time `at` (seconds). `anchor`: placement (e.g. `'top-right'`, `'center'`). `src` can be a file path or an `Exportable` (e.g. from `AssetIOMedia.factory.fromImage()`). |

### Effects

| Method | Description |
|--------|-------------|
| `zoom({ scale, from, to?, anchor?, x?, y?, curve?, motionBlur? })` | Animated zoom. `scale`: `{ start?: number, end: number }`. Optional motion blur. |
| `blur({ intensity, from, to?, style?, curve? })` | Time-ranged blur. `style`: `'box'` \| `'gaussian'`. |
| `fadeIn({ from, to?, curve? })` | Fade in from black. |
| `fadeOut({ from, to?, curve? })` | Fade out to black. |

Use `Curves` for easing (e.g. `Curves.easeInOut`, `Curves.linear`). All effect types accept an optional `curve`.

### Audio

| Method | Description |
|--------|-------------|
| `setVolume(factor)` | Multiply volume by `factor` (e.g. `0.5` = half). |

### Export

```ts
await media.export('output.mp4', {
  hardware?: string,  // encoder id from AssetIOMedia.hardware.list()
  quality?: {
    preset?: 'balanced' | 'high' | 'very-high',
    bitrateMbps?: number,
    crf?: number,
    cpuPreset?: 'ultrafast' | 'fast' | 'medium' | ...
  }
});
```

Export uses the same filter graph as preview (cuts, scale, crop, effects, overlays). You can list encoders with `AssetIOMedia.hardware.list()` and pick one, or omit for the default (GPU if available, else CPU).

## Preview

Preview uses the **same pipeline** as export: you get frames (or metadata) for the composed timeline without writing a file.

### Core (any environment)

```ts
// Load once
const info = await media.preview.metadata();
// → { duration: number, width: number, height: number, fps?: number }

// Frame at time t (composition timeline; t clamped to [0, duration])
const pngBuffer = await media.preview.frame(12.34);
// → Buffer (PNG). Use in Node or send to a client.
```

Optional:

- `media.preview.frames({ from?, to?, fps? })` — `AsyncIterable<Buffer>` of PNGs.
- `media.preview.exportSegment({ from, duration, path?, quality?, hardware? })` — export a short low-res segment (e.g. for `<video>` playback). `quality`: `'preview'` \| `'low'` \| `'medium'`.

### Bridge (play / pause / seek + state)

For UIs you can use a **bridge** that wraps `metadata()` and `frame(t)` and adds play/pause/seek and subscribable state:

```ts
const bridge = media.preview.bridge({ defaultFps: 15 });

await bridge.ready();

bridge.subscribe((state) => {
  // state: { status, playing, time, duration, frameUrl, metadata, error }
  if (state.frameUrl) img.src = state.frameUrl;
  slider.value = String(state.time);
});

bridge.play({ fps: 15 });
bridge.pause();
bridge.toggle();
await bridge.moveTo(5.5);
await bridge.stepBy(1 / 15);

// When done
bridge.dispose();
```

The bridge manages object URLs for frames (or data URLs in Node). In React you can pass `useSyncExternalStore` so `bridge.use.frameUrl()`, `bridge.use.time()`, etc. stay in sync.

## Preview in the browser

The SDK runs in Node. To preview in a browser, run a small server that creates a `AssetIOMedia` instance and exposes:

- `GET /api/metadata` → JSON `{ duration, width, height, fps }`
- `GET /api/frame?t=<seconds>` → PNG body

The repo includes a vanilla JS example: a Node server plus an HTML page with a scrubber and play/pause. See [Examples](#examples).

## Factory: generated clips

Build clips from images or solid colors to use as overlays or standalone exports:

```ts
const imageClip = AssetIOMedia.factory.fromImage({
  src: 'poster.png',
  duration: 5,
  width?: 1920,
  height?: 1080,
});

const colorClip = AssetIOMedia.factory.fromColor({
  color: '#1a1a2e',
  duration: 3,
});

const gradientClip = AssetIOMedia.factory.fromGradient({
  gradients: ['#0f0c29', '#302b63', '#24243e'],
  orientation: 'top-to-bottom',
  duration: 4,
});
```

Each returns an `Exportable`; use as `overlay({ src: imageClip, at: 0, anchor: 'center' })` or call `.export(path)`.

## Hardware encoders

```ts
const encoders = AssetIOMedia.hardware.list();        // all
const gpuOnly = AssetIOMedia.hardware.list({ type: 'gpu' });
const defaultEncoder = AssetIOMedia.hardware.default();

await media.export('out.mp4', { hardware: defaultEncoder.id });
```

## Examples

- **Preview server + HTML UI** — Play, pause, and scrub a `AssetIOMedia` in the browser. From the repo root:

  ```bash
  pnpm build
  node examples/preview/server.mjs path/to/your/video.mp4
  ```

  Then open http://localhost:8765 and use the slider and buttons to preview.

## API overview

| Area | Main APIs |
|------|-----------|
| **Input** | `new AssetIOMedia({ input, hardware })`, `setInput(source)` |
| **Edit** | `cut`, `scale`, `crop`, `overlay`, `setVolume` |
| **Effects** | `zoom`, `blur`, `fadeIn`, `fadeOut` (optional `curve` from `Curves`) |
| **Export** | `export(path, options?)` |
| **Preview** | `preview.metadata()`, `preview.frame(t)`, `preview.frames()`, `preview.exportSegment()`, `preview.bridge(options)` |
| **Factory** | `AssetIOMedia.factory.fromImage`, `fromColor`, `fromGradient` |
| **Hardware** | `AssetIOMedia.hardware.list()`, `default()`, `isAvailable(id)` |

## License

Apache-2.0.
