# AssetIO — Walkthrough & Commands

## Codebase walkthrough

**AssetIO** is a TypeScript SDK for programmatic image editing and composition. It is published as an npm package that consumers install as a dependency and use programmatically (no CLI bins). The SDK builds to ESM and exposes a chainable API for asset pipelines: crop, resize, overlay, shapes, text, effects, masks, and export to file/base64/bytes.

### Layout

| Path | Purpose |
|------|--------|
| `src/index.ts` | Main entrypoint: re-exports public API (asset, Asset, shapes, text, effects, mask, color, etc.). |
| `src/asset/` | Core asset pipeline: `asset()`, `Asset` class, operations (crop, resize, overlay, group, blur, etc.), export, renderer integration. |
| `src/asset/renderer/` | Renderer: Sharp processor, overlay compositor, placement. |
| `src/shapes/` | Shapes: Ellipse, Rectangle, Line, Polygon, Star, Vector, ShapeOps. |
| `src/text/` | Text: Text, TextRun, Font. |
| `src/effects/` | Figma-style effects: dropShadow, innerShadow, layerBlur, backgroundBlur, noise, texture, glass. |
| `src/mask/` | Masks: clip, alpha, luminance. |
| `src/color/` | Color and GradientColor. |
| `src/blend-mode/` | BlendMode. |
| `src/render/` | Canvas rendering: shape drawing, text rendering. |
| `src/types.ts` | Shared types (Source, Anchor, PlacementValue, etc.). |
| Build | `tsdown` from `src/index.ts` → `dist/`. `package.json` has `"files": ["dist"]` so only `dist/` is published. |

### Build & publish surface

- **Entry:** `src/index.ts` (tsdown).
- **Output:** `dist/` (ESM, source maps). Only `dist/` is published via `"files": ["dist"]`.
- **Consumption:** Library only. No `bin` entries. `prepublishOnly` runs `npm run build`.

---

## 1. Publish the package

From the project root:

```bash
# Install dependencies (if not already)
npm install

# Build (generates dist/; also runs automatically before publish)
npm run build

# Log in to npm (one-time per machine; requires npm account)
npm login

# Bump version if desired (optional)
npm version patch
# or: npm version minor
# or: npm version major

# Publish to npm (prepublishOnly will run build again)
npm publish
```

To publish a pre-release (e.g. beta):

```bash
npm version prerelease --preid=beta
npm publish --tag beta
```

---

## 2. Install and use (as a dependency)

### Install (in your app)

```bash
npm install assetio
# or
yarn add assetio
# or
pnpm add assetio
```

### Use in code

```ts
import { asset, Color, Rectangle } from 'assetio';

const image = asset('input.jpg')
  .crop({ x: 0, y: 0, width: 800, height: 600 })
  .resize({ width: 400, fit: 'cover' })
  .overlay(
    new Rectangle({ width: 80, height: 80 }).fill(Color.hex('#fff')),
    { position: { x: 20, y: 20 } },
  );

await image.export({ format: 'file', path: 'output.jpg' });
```

### Install a specific version

```bash
npm install assetio@latest
# or
npm install assetio@1.0.0
```

---

## 3. Development

- **Build:** `npm run build` (runs `tsdown`).
- **Dev/watch:** `npm run dev` (runs `tsdown --watch`).
- **Test:** `npm run test` (vitest); `npm run test:watch` for watch mode.
- **Types:** TypeScript declarations are emitted with the build; consumers get full IntelliSense from the published package.
