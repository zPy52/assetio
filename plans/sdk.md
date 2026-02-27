## Assets

Asset pipelines should stay chainable and readable, with every operation describing intent in plain language (`.crop`, `.resize`, `.threshold`, etc.), the same way ImageMagick flags read semantically.

```ts
import { asset, Color, Rectangle } from 'assetio';

// Input accepts any Source (path, URL, bytes, etc.)
const image = asset({ input: 'a.png' })
  .crop({ x: 120, y: 80, width: 600, height: 600 })
  .resize({ width: 1080, height: 1080, fit: 'cover' })
  .rotate({ angle: 2.5, background: Color.hex('#000000') })
  .overlay(new Rectangle({ width: 90, height: 90 }).fill(Color.hex('#fff')), {
    position: { x: '5%', y: '5%' },
  });
```

The original localized blur use-case still exists and remains first-class:

```ts
asset('photo.png').blur(
  [
    { x: 162.72, y: 73.2 },
    { x: 1.72, y: 63 },
    { x: '5%', y: '50.1%' },
  ],
  { mode: 'pixel', intensity: 2 },
);
```

### Geometric operations

```ts
asset('input.jpg')
  .crop({ x: 40, y: 60, width: 1200, height: 900 })
  .resize({ width: 1920, fit: 'contain' }) // fit: 'fill' | 'contain' | 'cover' | 'none'
  .rotate({ angle: -7, background: Color.hex('#101010') })
  .flip() // vertical mirror
  .flop() // horizontal mirror
  .roll({ x: 120, y: -30 })
  .distort({
    type: 'perspective',
    args: [0, 0, 30, 10, 800, 0, 760, 40, 800, 600, 780, 560, 0, 600, 20, 590],
  });
```

### Color / tonal operations

```ts
asset('input.jpg')
  .grayscale()
  .negate()
  .normalize()
  .equalize()
  .autoLevel()
  .autoGamma()
  .gamma(1.05)
  .level({ black: '2%', white: '98%', gamma: 1.02 })
  .linearStretch({ black: '1%', white: '1%' })
  .contrast({ sharpen: true })
  .posterize(12)
  .sepiaTone({ threshold: '80%' })
  .tint({ color: Color.hex('#89a8ff') })
  .colorize({ red: 15, green: 6, blue: 2 })
  .threshold({ value: '54%', type: 'global' })
  .quantize({ colors: 32, colorspace: 'srgb', dither: true })
  .segment({ threshold: '12%', colorspace: 'lab' });
```

### Blur / noise / sharpen operations

```ts
asset('input.jpg')
  .sharpen({ radius: 0, sigma: 1.2 })
  .adaptiveSharpen({ radius: 0, sigma: 0.8 })
  .unsharpMask({ radius: 0, sigma: 1.1, amount: 1.4, threshold: 0.03 })
  .motionBlur({ radius: 0, sigma: 2.5, angle: 35 })
  .rotationalBlur({ angle: 8 })
  .medianFilter({ radius: 1 })
  .addNoise({ type: 'gaussian', attenuate: 0.2 })
  .despeckle()
  .waveletDenoise({ threshold: 0.6, softness: 0.4 });
```

### Artistic / distortion operations

```ts
asset('input.jpg')
  .charcoal({ radius: 1, sigma: 0.8 })
  .sketch({ radius: 0, sigma: 1, angle: 135 })
  .oilPaint({ radius: 2 })
  .emboss({ radius: 0, sigma: 1.2 })
  .solarize({ threshold: '45%' })
  .spread({ radius: 1.5 })
  .implode(0.2) // negative values "explode"
  .swirl(25)
  .wave({ amplitude: 2, wavelength: 80 })
  .vignette({ x: '50%', y: '50%', blur: 18, color: Color.hex('#000', { opacity: 0.4 }) })
  .shade({ azimuth: 30, elevation: 35, gray: false })
  .raise({ width: 8, height: 8, raise: true })
  .polaroid({ angle: -7, caption: 'summer_2026' })
  .fx('u^1.03')
  .morphology({ method: 'open', kernel: 'Octagon:3', iterations: 1 })
  .detectEdges({ radius: 1 })
  .convolve({
    kernel: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
  });
```

### Border / frame operations

```ts
asset('input.jpg')
  .border({ width: 24, height: 24, color: Color.hex('#ffffff') })
  .frame({
    width: 12,
    height: 12,
    innerBevel: 2,
    outerBevel: 3,
    color: Color.hex('#1f2937'),
  });
```

### Composition operations (existing)

The overlay/masking/group story remains the compositing core:

```ts
asset('photo.png')
  .overlay(...)
  .group(...)
  .blur(...);
```


## Shapes

The overlay should also be able to add shapes. Base yourself on the form it had for vidio, the previous state of this codebase previous to its renaming

Supported shapes are those of Figma: **Ellipse**, **Rectangle**, **Line**, **Polygon**, **Star**, and **Vector** (the freeform pen path).

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

// ─── Ellipse ──────────────────────────────────────────────────────────────────
// A full ellipse or arc/donut segment via arcData
const ellipse = new Ellipse({
  width: 200,
  height: 100,
  // Optional — turns the ellipse into an arc or donut slice
  arc: {
    startAngle: 0,       // radians, or '0deg' / '0%' of 360
    endAngle: Math.PI,   // half-circle
    innerRadius: 0.5,    // 0 = full pie slice, 0–1 = donut ratio
  },
});

// ─── Rectangle ────────────────────────────────────────────────────────────────
// Supports independent corner radii, matching Figma's per-corner control
const rect = new Rectangle({
  width: 300,
  height: 150,
  cornerRadius: 12,                                   // uniform
  // — OR —
  cornerRadius: { tl: 12, tr: 0, br: 12, bl: 0 },   // per-corner
});

// ─── Line ─────────────────────────────────────────────────────────────────────
// A straight segment; stroke styling hangs off .stroke() (see below)
const line = new Line({
  start: [0, 0],
  end: [200, 100],
  // Optional arrowheads — matches Figma's stroke end-cap options
  startCap: 'none',                     // 'none' | 'arrow' | 'arrow-filled' | 'circle' | 'circle-filled' | 'square'
  endCap: 'arrow',
});

// ─── Polygon ──────────────────────────────────────────────────────────────────
// Regular convex polygon (triangle = 3, pentagon = 5, hexagon = 6, …)
const polygon = new Polygon({
  sides: 6,              // minimum 3
  radius: 100,           // circumradius in px
  rotation: 0,           // degrees; Figma defaults flat-bottom for even sides
});

// ─── Star ─────────────────────────────────────────────────────────────────────
// Figma's star: controlled by point count + inner-radius ratio
const star = new Star({
  points: 5,             // number of points/tips
  radius: 100,           // outer circumradius
  innerRadius: 0.382,    // ratio of inner to outer (Figma default ≈ 0.382 for 5-pt star)
  rotation: 0,
});

// ─── Vector (custom path) ─────────────────────────────────────────────────────
// Arbitrary bezier path — equivalent to Figma's Pen / Vector tool.
// Uses a subset of SVG path syntax so it's portable and well-understood.
const vector = new Vector({
  // Standard SVG path data string
  d: 'M 0 0 C 50 -80 150 -80 200 0 C 250 80 150 160 100 120 Z',
  // — OR — a structured array of segments for programmatic building
  segments: [
    { command: 'M', x: 0,   y: 0 },
    { command: 'C', x: 200, y: 0,   cp1: [50, -80],  cp2: [150, -80] },
    { command: 'C', x: 100, y: 120, cp1: [250, 80],  cp2: [150, 160] },
    { command: 'Z' },
  ],
  // Whether the path is treated as open or closed (affects fill behaviour)
  closed: true,
});
```

We apply stroke separately from fill, so shapes should chain a `.stroke()` method alongside `.fill()`:

```ts
const shape = new Polygon({ sides: 3, radius: 80 })
  .fill(Color.hex('#fff', { opacity: 0.5 })) // can also be Color.hsl(...), Color.rgb(...)... and all these have an `opacity`as options for the Color's function. Opacity is 1 by default.
  .fill( // this is also a viable option; if color is called twice, it gets overriten.
    GradientColor.linear({
      direction: GradientColor.direction({ start: [0, 0], end: [1, 0.5] }), // this places the initial point on the top-left corner and the end corner at the middle right. It can also be start: ["0%", "0%"] end: ["100%", "50%"] 
      colors: [Color.hex('#fff'), Color.rgb(0, 0, 0)]
      stops: [0, 0.5]
    })
  )
  .stroke({
    color: Color.hex('#312e81'), // can be a GradientColor too
    width: 2,
    position: 'inside', // 'inside' | 'outside' | 'center'
    dash: [8, 4],       // optional dash pattern [dashLen, gapLen]
    cap: 'round',       // 'butt' | 'round' | 'square' — relevant for Line too
    join: 'miter',      // 'miter' | 'round' | 'bevel'
  });
```

**Note: `Vector` as the escape hatch** — all the other shapes (Rectangle, Ellipse, etc.) are really just constrained special cases of Vector. If you ever need to boolean-combine two shapes (union, subtract, intersect, exclude — all present in Figma), Vector is the natural output type for that operation:

```ts
import { ShapeOps } from 'assetio';

const combined = ShapeOps.subtract(rect, ellipse); // → Vector
```

## Texts

We've two options for adding text: the straight one and the mixed one. For the straight one it's as simple as:

```ts
import { Text, Font, Color } from 'assetio';

// Simple case
const text = new Text('Hello world', {
  font: Font.use('Inter', { size: 48, weight: 600 }), // weight should also have text enums like 'bold', 'medium', 'light', 'extralight', 'semibold', 'regular', 'extrabold' and 'italic'
  color: Color.hex('#1a1a1a'),
  align: 'center',      // 'left' | 'center' | 'right' | 'justify'
  verticalAlign: 'top', // 'top' | 'middle' | 'bottom'
  width: 400,           // (optional) fixed box width; height grows unless maxHeight is set
  maxHeight: 200,       // optional — clips or truncates beyond this
  overflow: 'ellipsis', // 'visible' | 'hidden' | 'ellipsis'
  lineHeight: 1.5,      // unitless multiplier, or px value
  letterSpacing: 0.02,  // em units
});
```

And for the mixed ones we use Figma's concept of `TextRun`s

```ts
import { Text, Font, TextRun, Color } from 'assetio';

const text = new Text([
  new TextRun('Hello ', {
    font: Font.use('Inter', { size: 48, weight: 400 }),
    color: Color.hex('#1a1a1a'),
  }),
  new TextRun('world', {
    font: Font.use('Inter', { size: 48, weight: 700 }),
    color: Color.hex('#6366f1'),
  }),
], {
  // Box-level options still live here
  width: 400,
  align: 'left',
});
```

Also for fonts:

```ts
import { Font } from 'assetio';

// Register a local file or URL before using it
await Font.load('Cardo', './fonts/Cardo-Variable.ttf');
await Font.load('Cardo', 'https://fonts.example.com/cardo.woff2');

// Then use it normally
Font.use('Cardo', { size: 48 });
```


## Effects
These are Figma's **Effects** panel options. They'd naturally chain off any shape (or text) the same way `.fill()` and `.stroke()` do, via an `.effect()` method you can call multiple times to stack effects.

```ts
import { Ellipse, Effect, Color } from 'assetio';

const shape = new Ellipse({ width: 200, height: 200 })
  .fill(Color.hex('#6366f1'))

  // Drop shadow — projects outward behind the shape
  .effect(Effect.dropShadow({
    offset: { x: 4, y: 8 },
    blur: 16,
    spread: 0,
    color: Color.hex('#000', { opacity: 0.3 }),
  }))

  // Inner shadow — same options, projects inward
  .effect(Effect.innerShadow({
    offset: { x: 0, y: 4 },
    blur: 8,
    spread: 0,
    color: Color.hex('#000', { opacity: 0.2 }),
  }))

  // Layer blur — blurs the shape itself
  .effect(Effect.layerBlur({ radius: 12 }))

  // Background blur — blurs whatever is behind the shape (frosted glass base)
  .effect(Effect.backgroundBlur({ radius: 20 }))

  // Noise — adds a grainy texture overlay
  .effect(Effect.noise({
    opacity: 0.15,
    size: 1,              // grain size in px
    mode: 'color',        // 'color' | 'grayscale'
  }))

  // Texture — maps an image as a surface texture
  .effect(Effect.texture({
    source: './textures/paper.png',
    opacity: 0.4,
    blendMode: 'multiply', // follows standard blend modes
    scale: 1,
  }))

  // Glass — a compound effect (background blur + specular highlight + refraction)
  .effect(Effect.glass({
    blur: 24,
    opacity: 0.6,
    tint: Color.hex('#ffffff', { opacity: 0.1 }),
    // refraction subtly distorts what's behind the shape
    refraction: 0.05,
  }))
```

A few design notes worth flagging:

**Stacking order matters** — just like Figma, effects applied first sit lower in the stack. `.effect()` appending to an array preserves that order naturally.

**`Glass` is a compound effect** — in Figma it's actually a preset that combines background blur, a fill with low opacity, and a stroke highlight. You could implement it as a true first-class effect or sugar that expands into its constituent parts under the hood. The latter is more honest about what's happening and easier to maintain.

**`blendMode`** — shadows and texture both interact with blend modes. It's probably worth a shared `BlendMode` export rather than raw strings, since these are used in fills and overlays too:

```ts
import { BlendMode } from 'assetio';

Effect.texture({ source: '...', blendMode: BlendMode.Multiply })
```


## Masks
Works by using one shape to clip the visibility of another. There are two flavours: **alpha masks** (transparency of the mask shape controls what shows through) and **luminance masks** (brightness controls it). There's also the simpler **clip** behaviour which is just a hard geometric crop.

These would live on the overlay call since a mask is always about the relationship between a shape/image and what's beneath it:

```ts
import { asset, Ellipse, Rectangle, Vector, Mask } from 'assetio';

const image = asset('photo.png')
  .overlay(
    new Ellipse({ width: 400, height: 400 }),
    {
      anchor: "top-left", // `Anchor` to pick what the `position` coordinate is referring to. If it's top-left (by default), then it says that the top-left point of the overlayed asset is gonna be 
      position: { x: 100, y: 100 }, // can also be relative; e.g., with { x: "50%", y: "50.1%" }. In this case, this says that the top-left corner of the ellipse will be at (100px, 100px) coords
      mask: Mask.clip(), // hard crop to the ellipse geometry — the simplest case
    }
  )
```

For the richer cases:

```ts
// Alpha mask — the shape's opacity/transparency determines visibility
// A gradient fill on the mask shape creates a soft fade effect
.overlay(
  new Rectangle({ width: 600, height: 400 })
    .color(GradientColor.linear({
      direction: GradientColor.direction({ start: [0, 0], end: [1, 0] }),
      colors: [Color.hex('#fff', { opacity: 1 }), Color.hex('#fff', { opacity: 0 })],
      stops: [0, 1],
    })),
  {
    position: { x: 0, y: 0 },
    mask: Mask.alpha(), // fades the layer out left-to-right
  }
)

// Luminance mask — bright areas of the mask shape = visible, dark = hidden
.overlay(
  new Vector({ d: 'M 0 0 L 200 0 L 100 200 Z' })
    .color(GradientColor.radial({ ... })),
  {
    mask: Mask.luminance(),
  }
)
```

You can also mask with an external image rather than a shape:

```ts
import { Mask } from 'assetio';

.overlay(someShape, {
  mask: Mask.alpha({ source: './masks/feather.png' }),
  // The mask image's alpha channel is used instead of the shape's fill
})
```

And for the case where you want to mask a whole group of overlays together rather than individually, a `.group()` concept makes sense:

```ts
image
  .group([
    { layer: new Ellipse({ width: 200, height: 200 }).color(Color.hex('#6366f1')), position: { x: 0, y: 0 } },
    { layer: new Rectangle({ width: 200, height: 200 }).color(Color.hex('#f00')), position: { x: 50, y: 50 } },
  ], {
    mask: Mask.clip(new Ellipse({ width: 220, height: 220 })),
    // Both layers above are clipped together by this single mask shape
  })
```

The key design distinction to preserve is that `Mask.clip()`, `Mask.alpha()`, and `Mask.luminance()` are meaningfully different — clip ignores fill entirely and just uses geometry, while alpha and luminance actually read pixel values from the mask shape's rendered output. That difference has real implementation consequences so making it explicit in the API is better than trying to infer it.