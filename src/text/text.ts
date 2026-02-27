import { TextRun } from '@/text/text-run';
import type { TextOptions } from '@/text/types';

export type TextContent = string | TextRun[];

export class Text {
  public readonly content: TextContent;
  public readonly options: TextOptions | undefined;

  public constructor(content: TextContent, options?: TextOptions) {
    this.assertContent(content);
    this.content = typeof content === 'string' ? content : [...content];
    this.options = options ? { ...options } : undefined;
  }

  private assertContent(content: TextContent): void {
    if (typeof content === 'string') {
      if (content.length === 0) {
        throw new Error('Text content cannot be empty.');
      }
      return;
    }
    if (content.length === 0) {
      throw new Error('Text content cannot be an empty run list.');
    }
  }
}
