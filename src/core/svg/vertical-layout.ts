import type { FontAdapter, GlyphData } from "@core/font/font-adapter";
import { DEFAULT_LAYOUT_SETTINGS } from "@core/svg/layout-settings";
import { validateLayoutDimensions, validateLayoutOptions } from "@core/svg/layout-utils";


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
  letterSpacing: DEFAULT_LAYOUT_SETTINGS.letterSpacing,
  padding: DEFAULT_LAYOUT_SETTINGS.padding
});

export const createVerticalLayout = (
  text: string,
  font: FontAdapter,
  options: VerticalLayoutOptions = DEFAULT_VERTICAL_OPTIONS
): VerticalLayoutResult | null => {
  validateLayoutOptions(font.unitsPerEm, options);
  const { letterSpacing, padding } = options;

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

  const width = cellSize + padding * 2;
  const height = rowCount * cellSize + Math.max(0, rowCount - 1) * letterSpacing + padding * 2;
  validateLayoutDimensions(width, height);

  return {
    width,
    height,
    rowCount,
    cellSize,
    glyphs
  };
};
