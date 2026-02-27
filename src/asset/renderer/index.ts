import type { AssetOperation } from '@/asset/types';
import { toSourceBuffer } from '@/asset/export-source';
import type { Source } from '@/types';
import { SubmoduleAssetRendererSharpProcessor } from '@/asset/renderer/sharp-processor';
import { SubmoduleAssetRendererMagickProcessor } from '@/asset/renderer/magick-processor';
import { SubmoduleAssetRendererOverlayCompositor } from '@/asset/renderer/overlay-compositor';

export class AssetRendererService {
  public static readonly sharpProcessor = new SubmoduleAssetRendererSharpProcessor();

  public static readonly magickProcessor = new SubmoduleAssetRendererMagickProcessor();

  public static readonly overlayCompositor = new SubmoduleAssetRendererOverlayCompositor();

  public static async processOperations(input: Source, operations: AssetOperation[]): Promise<Buffer> {
    let currentBytes = await toSourceBuffer(input);
    if (operations.length === 0) return currentBytes;

    let index = 0;
    while (index < operations.length) {
      const operation = operations[index]!;

      if (operation.type === 'overlay') {
        currentBytes = await this.overlayCompositor.processOverlay(currentBytes, operation);
        index += 1;
        continue;
      }
      if (operation.type === 'group') {
        currentBytes = await this.overlayCompositor.processGroup(currentBytes, operation);
        index += 1;
        continue;
      }

      if (this.sharpProcessor.supportsOperation(operation)) {
        currentBytes = await this.sharpProcessor.processOperation(currentBytes, operation);
        index += 1;
        continue;
      }

      if (this.magickProcessor.supportsOperation(operation)) {
        const magickOperations: AssetOperation[] = [];
        while (
          index < operations.length
          && operations[index]!.type !== 'overlay'
          && operations[index]!.type !== 'group'
          && !this.sharpProcessor.supportsOperation(operations[index]!)
          && this.magickProcessor.supportsOperation(operations[index]!)
        ) {
          magickOperations.push(operations[index]!);
          index += 1;
        }

        if (magickOperations.length > 0) {
          currentBytes = await this.magickProcessor.processOperations(currentBytes, magickOperations);
          continue;
        }
      }

      throw new Error(`No renderer registered for "${operation.type}" operation.`);
    }

    return currentBytes;
  }
}
