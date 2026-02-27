import { createCanvas } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { Color } from '@/color';
import { Text, TextRun } from '@/text';
import type { FontRef, TextAlign, TextOptions, TextRunOptions } from '@/text';

const DEFAULT_FONT = {
  family: 'sans-serif',
  size: 16,
  weight: 400,
  italic: false,
} satisfies FontRef;

const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;

type RenderRun = {
  value: string;
  options?: TextRunOptions;
};

type MeasuredRun = {
  value: string;
  options?: TextRunOptions;
  width: number;
};

type MeasuredLine = {
  runs: MeasuredRun[];
  width: number;
};

function toRgbaFromColor(options: TextRunOptions | TextOptions | undefined): string {
  const color = options?.color ?? Color.hex('#000000');
  return `rgba(${color.channels.r}, ${color.channels.g}, ${color.channels.b}, ${color.channels.a})`;
}

function toFontRef(options: TextRunOptions | TextOptions | undefined): FontRef {
  return options?.font
    ? options.font
    : {
        ...DEFAULT_FONT,
      };
}

function toFontString(options: TextRunOptions | TextOptions | undefined): string {
  const font = toFontRef(options);
  const italic = font.italic ? 'italic ' : '';
  return `${italic}${font.weight} ${font.size}px "${font.family}"`;
}

function getLineHeight(options: TextOptions | undefined): number {
  const font = toFontRef(options);
  if (options?.lineHeight === undefined) {
    return font.size * DEFAULT_LINE_HEIGHT_MULTIPLIER;
  }
  if (options.lineHeight <= 3) {
    return font.size * options.lineHeight;
  }
  return options.lineHeight;
}

function toRuns(text: Text): RenderRun[] {
  if (typeof text.content === 'string') {
    return [{ value: text.content, options: text.options }];
  }
  return text.content.map((run) => ({
    value: run.content,
    options: run.options,
  }));
}

function toSegmentsPreservingSpaces(value: string): string[] {
  return value.split(/(\s+)/).filter((segment) => segment.length > 0);
}

function measureTextWithSpacing(context: SKRSContext2D, value: string, letterSpacingEm: number): number {
  const baseWidth = context.measureText(value).width;
  if (value.length <= 1 || letterSpacingEm === 0) {
    return baseWidth;
  }
  const spacing = context.measureText('M').width * letterSpacingEm;
  return baseWidth + spacing * (value.length - 1);
}

function measureLines(context: SKRSContext2D, text: Text): MeasuredLine[] {
  const options = text.options;
  const maxWidth = options?.width;
  const runs = toRuns(text);
  const measuredLines: MeasuredLine[] = [{ runs: [], width: 0 }];
  let currentLine = measuredLines[0];

  for (const run of runs) {
    context.font = toFontString(run.options ?? options);
    const letterSpacing = options?.letterSpacing ?? 0;
    const segments = toSegmentsPreservingSpaces(run.value);
    for (const segment of segments) {
      const segmentWidth = measureTextWithSpacing(context, segment, letterSpacing);
      const nextWidth = currentLine.width + segmentWidth;
      const shouldWrap = Boolean(maxWidth && currentLine.width > 0 && nextWidth > maxWidth && !/^\s+$/.test(segment));
      if (shouldWrap) {
        currentLine = { runs: [], width: 0 };
        measuredLines.push(currentLine);
      }
      currentLine.runs.push({
        value: segment,
        options: run.options,
        width: segmentWidth,
      });
      currentLine.width += segmentWidth;
    }
  }

  return measuredLines;
}

function toAlignedStartX(align: TextAlign | undefined, lineWidth: number, contentWidth: number): number {
  if (align === 'center') return (contentWidth - lineWidth) / 2;
  if (align === 'right') return contentWidth - lineWidth;
  return 0;
}

function applyEllipsisIfNeeded(
  context: SKRSContext2D,
  lines: MeasuredLine[],
  options: TextOptions | undefined,
): MeasuredLine[] {
  if (!options?.maxHeight) return lines;
  const lineHeight = getLineHeight(options);
  const maxLines = Math.max(1, Math.floor(options.maxHeight / lineHeight));
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  if (options.overflow !== 'ellipsis') return visible;

  const last = visible[visible.length - 1];
  if (!last) return visible;
  const maxWidth = options.width ?? Number.POSITIVE_INFINITY;
  const ellipsis = '...';
  const ellipsisWidth = context.measureText(ellipsis).width;

  while (last.runs.length > 0 && last.width + ellipsisWidth > maxWidth) {
    const current = last.runs[last.runs.length - 1];
    if (!current) break;
    if (current.value.length <= 1) {
      last.runs.pop();
      last.width -= current.width;
      continue;
    }
    const shortened = current.value.slice(0, -1);
    const optionsForRun = current.options ?? options;
    context.font = toFontString(optionsForRun);
    const width = context.measureText(shortened).width;
    current.value = shortened;
    last.width = last.width - current.width + width;
    current.width = width;
  }

  last.runs.push({
    value: ellipsis,
    options: options,
    width: ellipsisWidth,
  });
  last.width += ellipsisWidth;
  return visible;
}

export class SubmoduleRenderServiceText {
  public async renderToBuffer(text: Text): Promise<Buffer> {
    const options = text.options;
    const measureCanvas = createCanvas(1, 1);
    const measureContext = measureCanvas.getContext('2d');
    const measuredLines = measureLines(measureContext, text);
    const finalLines = applyEllipsisIfNeeded(measureContext, measuredLines, options);

    const lineHeight = getLineHeight(options);
    const contentWidth = Math.max(
      1,
      Math.ceil(options?.width ?? Math.max(...finalLines.map((line) => line.width), 0)),
    );
    const contentHeight = Math.max(1, Math.ceil(finalLines.length * lineHeight));
    const canvas = createCanvas(contentWidth, contentHeight);
    const context = canvas.getContext('2d');
    context.textBaseline = 'top';
    context.letterSpacing = `${options?.letterSpacing ?? 0}em`;

    const maxHeight = options?.maxHeight;
    const drawHeight = maxHeight ? Math.min(contentHeight, maxHeight) : contentHeight;
    let baseY = 0;
    if (options?.verticalAlign === 'middle') {
      baseY = Math.max(0, (drawHeight - finalLines.length * lineHeight) / 2);
    } else if (options?.verticalAlign === 'bottom') {
      baseY = Math.max(0, drawHeight - finalLines.length * lineHeight);
    }

    finalLines.forEach((line, lineIndex) => {
      const startX = toAlignedStartX(options?.align, line.width, contentWidth);
      let cursorX = startX;
      const cursorY = baseY + lineIndex * lineHeight;
      for (const run of line.runs) {
        context.font = toFontString(run.options ?? options);
        context.fillStyle = toRgbaFromColor(run.options ?? options);
        context.fillText(run.value, cursorX, cursorY);
        cursorX += run.width;
      }
    });

    return canvas.toBuffer('image/png');
  }
}
