import type { VerticalLayoutResult } from "@core/svg/vertical-layout";


const formatNumber = (value: number): string => {
  if (Math.abs(value - Math.round(value)) < 0.000001) {
    return String(Math.round(value));
  }

  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export const serializeVerticalSvg = (
  layout: VerticalLayoutResult,
  fill = "#000000",
): string => {
  if (!/^#[\da-fA-F]{6}$/.test(fill)) {
    throw new TypeError("fill must be a six-digit hex color.");
  }

  const paths = layout.glyphs
    .filter((item) => item.glyph && !item.glyph.isEmpty && item.glyph.bounds &&
      item.translateX !== null && item.translateY !== null)
    .map((item) => `  <path d="${item.glyph!.pathData}" transform="translate(${formatNumber(item.translateX!)} ${formatNumber(item.translateY!)}) scale(1 -1)" />`)
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(layout.width)} ${formatNumber(layout.height)}">\n  <g fill="${fill}">${paths ? `\n${paths}\n  ` : ""}</g>\n</svg>`;
}