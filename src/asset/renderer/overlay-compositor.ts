import sharp from 'sharp';
import { toSourceBuffer } from '@/asset/export-source';
import { resolvePlacementValue, toCompositeOffset } from '@/asset/renderer/placement';
import type { AssetLike, GroupOperation, OverlayContent, OverlayOperation } from '@/asset/types';
import type { MaskConfig } from '@/mask';
import { BaseShape } from '@/shapes';
import { Text } from '@/text';
import { RenderService } from '@/render';

type CompositeLayer = {
  input: Buffer;
  left: number;
  top: number;
};

function isAssetLike(value: unknown): value is AssetLike {
  return (
    typeof value === 'object'
    && value !== null
    && 'export' in value
    && typeof (value as { export: unknown }).export === 'function'
  );
}

function toRgbWithLuminanceAsAlpha(grayBytes: Buffer): Buffer {
  const rgba = Buffer.alloc(grayBytes.length * 4);
  for (let index = 0; index < grayBytes.length; index += 1) {
    const value = grayBytes[index] ?? 0;
    const offset = index * 4;
    rgba[offset] = 255;
    rgba[offset + 1] = 255;
    rgba[offset + 2] = 255;
    rgba[offset + 3] = value;
  }
  return rgba;
}

async function applyMask(contentBuffer: Buffer, mask: MaskConfig): Promise<Buffer> {
  const metadata = await sharp(contentBuffer).metadata();
  const width = Math.max(1, metadata.width ?? 1);
  const height = Math.max(1, metadata.height ?? 1);

  if (mask.type === 'clip') {
    if (!mask.shape) return contentBuffer;
    const shapeMask = await RenderService.shape.renderToBuffer(mask.shape);
    const resizedMask = await sharp(shapeMask).resize(width, height).png().toBuffer();
    return sharp(contentBuffer)
      .ensureAlpha()
      .composite([{ input: resizedMask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  const sourceMask = mask.source ? await toSourceBuffer(mask.source) : contentBuffer;
  const resizedMask = await sharp(sourceMask).resize(width, height).ensureAlpha().png().toBuffer();

  if (mask.type === 'alpha') {
    return sharp(contentBuffer)
      .ensureAlpha()
      .composite([{ input: resizedMask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  const luminance = await sharp(resizedMask).greyscale().raw().toBuffer();
  const luminanceMask = toRgbWithLuminanceAsAlpha(luminance);
  const luminanceMaskPng = await sharp(luminanceMask, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  return sharp(contentBuffer)
    .ensureAlpha()
    .composite([{ input: luminanceMaskPng, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

export class SubmoduleAssetRendererOverlayCompositor {
  public async processOverlay(baseBuffer: Buffer, operation: OverlayOperation): Promise<Buffer> {
    const baseMetadata = await sharp(baseBuffer).metadata();
    const baseWidth = baseMetadata.width ?? 0;
    const baseHeight = baseMetadata.height ?? 0;
    const layerBuffer = await this.toContentBuffer(operation.content);
    const maskedLayer = operation.options.mask ? await applyMask(layerBuffer, operation.options.mask) : layerBuffer;
    const layerMetadata = await sharp(maskedLayer).metadata();
    const layerWidth = layerMetadata.width ?? 0;
    const layerHeight = layerMetadata.height ?? 0;
    const x = resolvePlacementValue(operation.options.position.x, baseWidth);
    const y = resolvePlacementValue(operation.options.position.y, baseHeight);
    const { left, top } = toCompositeOffset(operation.options.anchor, layerWidth, layerHeight, x, y);
    return sharp(baseBuffer)
      .composite([{ input: maskedLayer, left, top }])
      .png()
      .toBuffer();
  }

  public async processGroup(baseBuffer: Buffer, operation: GroupOperation): Promise<Buffer> {
    const baseMetadata = await sharp(baseBuffer).metadata();
    const baseWidth = Math.max(1, baseMetadata.width ?? 1);
    const baseHeight = Math.max(1, baseMetadata.height ?? 1);
    let groupBuffer = await sharp({
      create: {
        width: baseWidth,
        height: baseHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    for (const layer of operation.layers) {
      const layerBuffer = await this.toContentBuffer(layer.layer);
      const layerMetadata = await sharp(layerBuffer).metadata();
      const layerWidth = layerMetadata.width ?? 0;
      const layerHeight = layerMetadata.height ?? 0;
      const x = resolvePlacementValue(layer.position.x, baseWidth);
      const y = resolvePlacementValue(layer.position.y, baseHeight);
      const offset = toCompositeOffset(layer.anchor, layerWidth, layerHeight, x, y);
      groupBuffer = await sharp(groupBuffer)
        .composite([{ input: layerBuffer, left: offset.left, top: offset.top }])
        .png()
        .toBuffer();
    }

    if (operation.options.mask) {
      groupBuffer = await applyMask(groupBuffer, operation.options.mask);
    }

    const layers: CompositeLayer[] = [{ input: groupBuffer, left: 0, top: 0 }];
    return sharp(baseBuffer).composite(layers).png().toBuffer();
  }

  private async toContentBuffer(content: OverlayContent): Promise<Buffer> {
    if (content instanceof BaseShape) {
      return RenderService.shape.renderToBuffer(content);
    }
    if (content instanceof Text) {
      return RenderService.text.renderToBuffer(content);
    }
    if (isAssetLike(content)) {
      const bytes = await content.export({ format: 'bytes' });
      return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes as Uint8Array);
    }
    return toSourceBuffer(content);
  }
}
