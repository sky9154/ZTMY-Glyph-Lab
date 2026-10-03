import type { FontAdapter, GlyphData } from "@core/font/font-adapter";
import type { VerticalLayoutOptions } from "@core/svg/vertical-layout";


export interface PositionedHorizontalGlyph {
  codePoint: number;
  char: string;
  columnIndex: number;
  glyph: GlyphData | null;
  translateX: number | null;
  translateY: number | null;
}

export interface HorizontalLayoutResult {
  width: number;
  height: number;
  columnCount: number;
  cellSize: number;
  glyphs: PositionedHorizontalGlyph[];
}

export const createHorizontalLayout = (
  text: string,
  font: FontAdapter,
  options: VerticalLayoutOptions
): HorizontalLayoutResult | null => {
  const { letterSpacing, padding } = options;

  if (!Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0) {
    throw new RangeError("unitsPerEm must be a positive finite number.");
  }

  if (!Number.isFinite(letterSpacing) || !Number.isFinite(padding)) {
    throw new RangeError("letterSpacing and padding must be finite numbers.");
  }

  const cellSize = font.unitsPerEm;
  const glyphs: PositionedHorizontalGlyph[] = [];
  let columnCount = 0;

  for (const char of text.normalize("NFC")) {
    if (char === "\n") {
      continue;
    }

    const codePoint = char.codePointAt(0)!;
    const columnIndex = columnCount;
    const glyph = font.getGlyph(codePoint);
    let translateX: number | null = null;
    let translateY: number | null = null;

    if (glyph && !glyph.isEmpty && glyph.bounds) {
      const { xMin, yMin, xMax, yMax } = glyph.bounds;
      const glyphWidth = xMax - xMin;
      const glyphHeight = yMax - yMin;
      const cellLeft = columnIndex * (cellSize + letterSpacing);
      const x = cellLeft + (cellSize - glyphWidth) / 2 - xMin;
      const y = (cellSize - glyphHeight) / 2 + yMax;

      translateX = padding + x;
      translateY = padding + y;
    }

    glyphs.push({ codePoint, char, columnIndex, glyph, translateX, translateY });
    columnCount += 1;
  }

  if (columnCount === 0) {
    return null;
  }

  const width = columnCount * cellSize + Math.max(0, columnCount - 1) * letterSpacing + padding * 2;
  const height = cellSize + padding * 2;

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError("Horizontal layout dimensions must be positive finite numbers.");
  }

  return { width, height, columnCount, cellSize, glyphs };
}