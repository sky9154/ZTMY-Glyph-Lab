import type { FontAdapter, GlyphData } from "@core/font/font-adapter";


export interface VerticalLayoutOptions {
  letterSpacing: number;
  padding: number;
}

export interface PositionedGlyph {
  codePoint: number;
  char: string;
  rowIndex: number;
  glyph: GlyphData | null;
  translateX: number | null;
  translateY: number | null;
}

export interface VerticalLayoutResult {
  width: number;
  height: number;
  rowCount: number;
  cellSize: number;
  glyphs: PositionedGlyph[];
}

export const DEFAULT_VERTICAL_OPTIONS: Readonly<VerticalLayoutOptions> = Object.freeze({
  letterSpacing: 160,
  padding: 20
});

export const createVerticalLayout = (
  text: string,
  font: FontAdapter,
  options: VerticalLayoutOptions = DEFAULT_VERTICAL_OPTIONS
): VerticalLayoutResult | null => {
  const { letterSpacing, padding } = options;

  if (!Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0) {
    throw new RangeError("unitsPerEm must be a positive finite number.");
  }

  if (!Number.isFinite(letterSpacing) || !Number.isFinite(padding)) {
    throw new RangeError("letterSpacing and padding must be finite numbers.");
  }

  const cellSize = font.unitsPerEm;
  const glyphs: PositionedGlyph[] = [];
  let rowCount = 0;

  for (const char of text.normalize("NFC")) {
    if (char === "\n") {
      continue;
    }

    const codePoint = char.codePointAt(0)!;
    const rowIndex = rowCount;
    const glyph = font.getGlyph(codePoint);
    let translateX: number | null = null;
    let translateY: number | null = null;

    if (glyph && !glyph.isEmpty && glyph.bounds) {
      const { xMin, yMin, xMax, yMax } = glyph.bounds;
      const glyphWidth = xMax - xMin;
      const glyphHeight = yMax - yMin;
      const x = (cellSize - glyphWidth) / 2 - xMin;
      const cellTop = rowIndex * (cellSize + letterSpacing);
      const y = cellTop + (cellSize - glyphHeight) / 2 + yMax;

      translateX = padding + x;
      translateY = padding + y;
    }

    glyphs.push({ codePoint, char, rowIndex, glyph, translateX, translateY });
    rowCount += 1;
  }

  if (rowCount === 0) {
    return null;
  }

  return {
    width: cellSize + padding * 2,
    height: rowCount * cellSize + Math.max(0, rowCount - 1) * letterSpacing + padding * 2,
    rowCount,
    cellSize,
    glyphs
  };
}