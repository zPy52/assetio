import type { TextRunOptions } from '@/text/types';

export class TextRun {
  public constructor(
    public readonly content: string,
    public readonly options?: TextRunOptions,
  ) {
    if (content.length === 0) {
      throw new Error('TextRun content cannot be empty.');
    }
  }
}
