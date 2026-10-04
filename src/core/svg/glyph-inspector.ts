import type { FontAdapter, GlyphData } from "@core/font/font-adapter";
import { getZtmyKanaMetadata } from "@core/ztmy/kana-metadata";
import { createHorizontalLayout, type PositionedHorizontalGlyph } from "@core/svg/horizontal-layout";
import { createVerticalLayout, type PositionedGlyph, type VerticalLayoutOptions } from "@core/svg/vertical-layout";
import type { Orientation } from "@core/svg/canonical-svg";


export type InspectorStatus = "Mapped" | "Empty" | "Missing";

export interface GlyphInspection {
  character: string;
  codePoint: number;
  unicode: string;
  cellIndex: number;
  orientation: Orientation;
  glyph: GlyphData | null;
  status: InspectorStatus;
  translateX: number | null;
  translateY: number | null;
  metadata: ReturnType<typeof getZtmyKanaMetadata>;
}

export type LayoutCell = PositionedGlyph | PositionedHorizontalGlyph;

export interface GlyphCountSummary {
  total: number;
  mapped: number;
  empty: number;
  missing: number;
}

export const formatUnicodeCodePoint = (codePoint: number): string => {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
};

export const getLayoutCells = (
  text: string,
  font: FontAdapter,
  options: VerticalLayoutOptions,
  orientation: Orientation
): LayoutCell[] => {
  const normalized = text.normalize("NFC");
  const layout = orientation === "horizontal" ? createHorizontalLayout(normalized, font, options) : createVerticalLayout(normalized, font, options);

  return layout?.glyphs ?? [];
};

export const summarizeGlyphCells = (cells: readonly LayoutCell[]): GlyphCountSummary => {
  return cells.reduce<GlyphCountSummary>((counts, cell) => {
    if (cell.glyph === null) {
      counts.missing += 1;
    } else if (cell.glyph.isEmpty) {
      counts.empty += 1;
    } else {
      counts.mapped += 1;
    }

    return counts;
  }, { total: cells.length, mapped: 0, empty: 0, missing: 0 });
};

export const inspectCell = (
  cell: LayoutCell,
  cellIndex: number,
  orientation: Orientation
): GlyphInspection => {
  const glyph = cell.glyph;

  return {
    character: cell.char,
    codePoint: cell.codePoint,
    unicode: formatUnicodeCodePoint(cell.codePoint),
    cellIndex,
    orientation,
    glyph,
    status: glyph === null ? "Missing" : glyph.isEmpty ? "Empty" : "Mapped",
    translateX: cell.translateX,
    translateY: cell.translateY,
    metadata: getZtmyKanaMetadata(cell.char)
  };
};
