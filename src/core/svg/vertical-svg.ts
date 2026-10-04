import type { VerticalLayoutResult } from "@core/svg/vertical-layout";
import { DEFAULT_LAYOUT_SETTINGS } from "@core/svg/layout-settings";
import { formatSvgNumber } from "@core/svg/layout-utils";


export const serializeVerticalSvg = (
  layout: VerticalLayoutResult,
  fill: string = DEFAULT_LAYOUT_SETTINGS.fill
): string => {
  if (!/^#[\da-fA-F]{6}$/.test(fill)) {
    throw new TypeError("fill must be a six-digit hex color.");
  }

  const paths = layout.glyphs
    .filter((item) => item.glyph && !item.glyph.isEmpty && item.glyph.bounds &&
      item.translateX !== null && item.translateY !== null)
    .map((item) => `  <path d="${item.glyph!.pathData}" transform="translate(${formatSvgNumber(item.translateX!)} ${formatSvgNumber(item.translateY!)}) scale(1 -1)" />`)
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatSvgNumber(layout.width)} ${formatSvgNumber(layout.height)}">\n  <g fill="${fill}">${paths ? `\n${paths}\n  ` : ""}</g>\n</svg>`;
};
