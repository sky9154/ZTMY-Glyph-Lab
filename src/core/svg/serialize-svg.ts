import type { GlyphData } from "@core/font/font-adapter";
import { DEFAULT_LAYOUT_SETTINGS } from "@core/svg/layout-settings";
import { formatSvgNumber } from "@core/svg/layout-utils";


interface SvgLayout {
  width: number;
  height: number;
  glyphs: readonly {
    glyph: GlyphData | null;
    translateX: number | null;
    translateY: number | null;
  }[];
}

export const isValidSvgFill = (fill: string): boolean => /^#[\da-fA-F]{6}$/.test(fill);

export const serializeSvg = (layout: SvgLayout, fill: string = DEFAULT_LAYOUT_SETTINGS.fill): string => {
  if (!isValidSvgFill(fill)) {
    throw new TypeError("fill must be a six-digit hex color.");
  }

  const paths: string[] = [];

  for (const { glyph, translateX, translateY } of layout.glyphs) {
    if (!glyph || glyph.isEmpty || !glyph.bounds || translateX === null || translateY === null) {
      continue;
    }

    paths.push(`  <path d="${glyph.pathData}" transform="translate(${formatSvgNumber(translateX)} ${formatSvgNumber(translateY)}) scale(1 -1)" />`);
  }

  const pathMarkup = paths.join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatSvgNumber(layout.width)} ${formatSvgNumber(layout.height)}">\n  <g fill="${fill}">${pathMarkup ? `\n${pathMarkup}\n  ` : ""}</g>\n</svg>`;
};
