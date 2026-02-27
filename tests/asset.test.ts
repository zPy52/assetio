import sharp from 'sharp';
import { promises as fileSystem } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { Color, Ellipse, GradientColor, Mask, Rectangle, Text, asset } from '@/index';
import { createTestOutputPath, exportAssetToTestOutput } from './helpers';

const SAMPLE_IMAGE = 'assets/sample-wallpaper.jpg';

async function toImageDifferenceRatio(sourcePath: string, outputPath: string): Promise<number> {
  const outputMetadata = await sharp(outputPath).metadata();
  const width = outputMetadata.width ?? 0;
  const height = outputMetadata.height ?? 0;
  if (width <= 0 || height <= 0) return 0;

  const [sourcePixels, outputPixels] = await Promise.all([
    sharp(sourcePath).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
    sharp(outputPath).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
  ]);

  const pixelLength = Math.min(sourcePixels.length, outputPixels.length);
  if (pixelLength === 0) return 0;

  let absoluteDifference = 0;
  for (let index = 0; index < pixelLength; index += 1) {
    absoluteDifference += Math.abs(sourcePixels[index]! - outputPixels[index]!);
  }

  return absoluteDifference / (pixelLength * 255);
}

async function expectOutputToDifferFromSource(outputPath: string, minimumDifferenceRatio: number): Promise<void> {
  const differenceRatio = await toImageDifferenceRatio(SAMPLE_IMAGE, outputPath);
  expect(differenceRatio).toBeGreaterThan(minimumDifferenceRatio);
}

async function toPixelChannels(
  sourcePath: string,
  x: number,
  y: number,
): Promise<{ r: number; g: number; b: number; a: number }> {
  const rawImage = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = rawImage.info.channels;
  const pixelIndex = (y * rawImage.info.width + x) * channels;
  return {
    r: rawImage.data[pixelIndex] ?? 0,
    g: rawImage.data[pixelIndex + 1] ?? 0,
    b: rawImage.data[pixelIndex + 2] ?? 0,
    a: rawImage.data[pixelIndex + 3] ?? 0,
  };
}

describe('asset()', () => {
  test('accepts object and direct source input', async () => {
    const fromObject = asset({ input: 'a.png' });
    const fromString = asset('b.png');

    expect(fromObject.toAssetState().input).toBe('a.png');
    expect(fromString.toAssetState().input).toBe('b.png');

    await exportAssetToTestOutput(asset(SAMPLE_IMAGE), 'asset-accepts-input.jpg');
  });

  test('creates blank image from color and remains chainable', async () => {
    const image = asset
      .fromColor(Color.hex('#ffffff'), { width: 1080, height: 720 })
      .blur(
        [
          { x: 100, y: 100 },
          { x: 980, y: 100 },
          { x: 980, y: 620 },
          { x: 100, y: 620 },
        ],
        { mode: 'gaussian', intensity: 4 },
      );

    const outputPath = await exportAssetToTestOutput(image, 'asset-fromColor.jpg');
    const metadata = await sharp(outputPath).metadata();
    const centerPixel = await toPixelChannels(outputPath, 540, 360);

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(720);
    expect(centerPixel.r).toBeGreaterThanOrEqual(250);
    expect(centerPixel.g).toBeGreaterThanOrEqual(250);
    expect(centerPixel.b).toBeGreaterThanOrEqual(250);
    expect(centerPixel.a).toBeGreaterThanOrEqual(250);
  });

  test('creates blank image from gradient and remains chainable', async () => {
    const image = asset
      .fromGradient(
        GradientColor.linear({
          direction: GradientColor.direction({ start: [0, '0%'], end: [0, '100%'] }),
          colors: [Color.hex('#000000'), Color.hex('#ffffff')],
          stops: [0, 1],
        }),
        { width: 1080, height: 720 },
      )
      .blur(
        [
          { x: 100, y: 100 },
          { x: 980, y: 100 },
          { x: 980, y: 620 },
          { x: 100, y: 620 },
        ],
        { mode: 'gaussian', intensity: 4 },
      );

    const outputPath = await exportAssetToTestOutput(image, 'asset-fromGradient.jpg');
    const metadata = await sharp(outputPath).metadata();
    const topPixel = await toPixelChannels(outputPath, 540, 20);
    const bottomPixel = await toPixelChannels(outputPath, 540, 700);

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(720);
    expect(topPixel.r).toBeLessThan(bottomPixel.r);
    expect(topPixel.g).toBeLessThan(bottomPixel.g);
    expect(topPixel.b).toBeLessThan(bottomPixel.b);
  });

  test('records blur operations', async () => {
    const image = asset(SAMPLE_IMAGE).blur(
      [
        { x: "10%", y: "10%" },
        { x: "50%", y: "50%" },
        { x: "10%", y: "50%" },
        { x: "50%", y: "10%" },
      ],
      { mode: 'pixel', intensity: 10 },
    );

    const operations = image.toAssetState().operations;
    expect(operations).toHaveLength(1);
    expect(operations[0]?.type).toBe('blur');
    if (operations[0]?.type === 'blur') {
      expect(operations[0].points).toEqual([
        { x: '10%', y: '10%' },
        { x: '50%', y: '10%' },
        { x: '50%', y: '50%' },
        { x: '10%', y: '50%' },
      ]);
    }

    const outputPath = await exportAssetToTestOutput(image, 'asset-blur-source.jpg');
    await expectOutputToDifferFromSource(outputPath, 0.008);
  });

  test('exports asset-autoGamma.jpg', async () => {
    const outputPath = await exportAssetToTestOutput(
      asset(SAMPLE_IMAGE).level({ black: '40%', white: '60%', gamma: 0.55 }).autoGamma(),
      'asset-autoGamma.jpg',
    );
    await expectOutputToDifferFromSource(outputPath, 0.01);
  });

  test('exports asset-addNoise.jpg', async () => {
    const outputPath = await exportAssetToTestOutput(
      asset(SAMPLE_IMAGE).addNoise({ type: 'impulse', attenuate: 3 }),
      'asset-addNoise.jpg',
    );
    await expectOutputToDifferFromSource(outputPath, 0.02);
  });

  test('exports asset-autoLevel.jpg', async () => {
    const outputPath = await exportAssetToTestOutput(
      asset(SAMPLE_IMAGE).autoLevel(),
      'asset-autoLevel.jpg',
    );
    await expectOutputToDifferFromSource(outputPath, 0.03);
  });

  test('exports asset-level.jpg', async () => {
    const outputPath = await exportAssetToTestOutput(
      asset(SAMPLE_IMAGE).level({ black: '10%', white: '90%', gamma: 1.2 }),
      'asset-level.jpg',
    );
    await expectOutputToDifferFromSource(outputPath, 0.01);
  });

  test('exports asset-linearStretch.jpg', async () => {
    const outputPath = await exportAssetToTestOutput(
      asset(SAMPLE_IMAGE).linearStretch({ black: '2%', white: '2%' }),
      'asset-linearStretch.jpg',
    );
    await expectOutputToDifferFromSource(outputPath, 0.005);
  });

  test('records overlay and group operations with defaults', async () => {
    const overlayShape = new Rectangle({ width: 100, height: 80 }).fill(Color.hex('#fff'));
    const overlayText = new Text('Hello');

    const image = asset(SAMPLE_IMAGE)
      .overlay(overlayShape, {
        position: { x: 30, y: 40 },
        mask: Mask.clip(new Ellipse({ width: 120, height: 120 })),
      })
      .group(
        [
          { layer: overlayShape },
          { layer: overlayText, position: { x: 50, y: 50 }, anchor: 'center' },
        ],
        { mask: Mask.alpha() },
      );

    const operations = image.toAssetState().operations;
    expect(operations).toHaveLength(2);
    expect(operations[0]?.type).toBe('overlay');
    expect(operations[1]?.type).toBe('group');

    await exportAssetToTestOutput(asset(SAMPLE_IMAGE), 'asset-overlay-group-source.jpg');
  });

  test('validates blur and group arguments', () => {
    expect(() =>
      asset('photo.png').blur([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toThrowError();
    expect(() => asset('photo.png').group([])).toThrowError();
  });

  test('exports bytes from string path input', async () => {
    const output = await asset(SAMPLE_IMAGE).export({ format: 'bytes' });

    expect(Buffer.isBuffer(output)).toBe(true);
    expect((output as Buffer).byteLength).toBeGreaterThan(0);

    await fileSystem.writeFile(
      await createTestOutputPath('asset-export-bytes.jpg'),
      output as Buffer,
    );
  });

  test('exports base64 data URL', async () => {
    const output = await asset(SAMPLE_IMAGE).export({ format: 'base64' });

    expect(typeof output).toBe('string');
    expect((output as string).startsWith('data:image/')).toBe(true);
    expect((output as string).includes(';base64,')).toBe(true);

    const base64Data = (output as string).split(';base64,')[1];
    if (base64Data) {
      await fileSystem.writeFile(
        await createTestOutputPath('asset-export-base64.jpg'),
        Buffer.from(base64Data, 'base64'),
      );
    }
  });

  test('exports file output', async () => {
    const outputPath = await createTestOutputPath('asset-export.jpg');
    const output = await asset(SAMPLE_IMAGE).export({
      format: 'file',
      path: outputPath,
    });
    const stats = await fileSystem.stat(outputPath);

    expect(output).toBe(outputPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('exports bytes from in-memory source', async () => {
    const expected = Buffer.from([1, 2, 3, 4, 5]);
    const fromBuffer = await asset(expected).export({ format: 'bytes' });
    const fromUint8Array = await asset(new Uint8Array(expected)).export({ format: 'bytes' });
    const fromArrayBuffer = await asset(new Uint8Array(expected).buffer).export({ format: 'bytes' });

    expect(Buffer.isBuffer(fromBuffer)).toBe(true);
    expect(Buffer.isBuffer(fromUint8Array)).toBe(true);
    expect(Buffer.isBuffer(fromArrayBuffer)).toBe(true);
    expect(fromBuffer).toEqual(expected);
    expect(fromUint8Array).toEqual(expected);
    expect(fromArrayBuffer).toEqual(expected);

    await fileSystem.writeFile(
      await createTestOutputPath('asset-inmemory.bin'),
      fromBuffer as Buffer,
    );
  });

  test('exports bytes for images with operations', async () => {
    await exportAssetToTestOutput(asset(SAMPLE_IMAGE), 'asset-operations-unsupported-source.jpg');

    const output = await asset(SAMPLE_IMAGE)
      .blur([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ])
      .export({ format: 'bytes' });

    expect(Buffer.isBuffer(output)).toBe(true);
    expect((output as Buffer).byteLength).toBeGreaterThan(0);
  });

  test('throws when file path is missing or empty for file format', async () => {
    await expect(
      asset(SAMPLE_IMAGE).export({ format: 'file', path: '' }),
    ).rejects.toThrowError('Asset file export requires a non-empty output path.');

    await expect(
      asset(SAMPLE_IMAGE).export({ format: 'file', path: '   ' }),
    ).rejects.toThrowError('Asset file export requires a non-empty output path.');
  });
});
