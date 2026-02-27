import path from 'node:path';
import { promises as fileSystem } from 'node:fs';

export function expectNumberBetween(value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Expected ${value} to be between ${min} and ${max}.`);
  }
}

/** Directory where tests write generated images and other output. Ignored by git. */
export const TEST_OUTPUT_DIRECTORY = path.join(process.cwd(), 'tests', 'output');

/** Ensures tests/output exists and returns a path for a file there. Use for image exports and other test artifacts. */
export async function createTestOutputPath(fileName: string): Promise<string> {
  const normalizedFileName = fileName.trim();
  if (normalizedFileName.length === 0) {
    throw new Error('Test output file name must not be empty.');
  }

  await fileSystem.mkdir(TEST_OUTPUT_DIRECTORY, { recursive: true });
  return path.join(TEST_OUTPUT_DIRECTORY, normalizedFileName);
}

/** Exports an asset to tests/output and asserts the file was written with size > 0. */
export async function exportAssetToTestOutput(
  asset: { export(options: { format: 'file'; path: string }): Promise<unknown> },
  fileName: string,
): Promise<string> {
  const outputPath = await createTestOutputPath(fileName);
  await asset.export({ format: 'file', path: outputPath });
  const stats = await fileSystem.stat(outputPath);
  if (stats.size <= 0) {
    throw new Error(`Expected exported file to have size > 0: ${outputPath}`);
  }
  return outputPath;
}
