import type { FontAdapter } from "@core/font/font-adapter";
import { createVerticalLayout, type VerticalLayoutOptions } from "@core/svg/vertical-layout";
import { serializeVerticalSvg } from "@core/svg/vertical-svg";
import { createHorizontalLayout } from "@core/svg/horizontal-layout";
import { serializeHorizontalSvg } from "@core/svg/horizontal-svg";


export type Orientation = "vertical" | "horizontal";

export interface CanonicalSvgOptions extends VerticalLayoutOptions {
  fill: string;
  orientation?: Orientation;
}

export type SvgDocumentState =
  | { status: "unavailable"; svg: null }
  | { status: "ready"; svg: string };

export const createCanonicalSvg = (
  text: string,
  font: FontAdapter | null,
  options: CanonicalSvgOptions,
): SvgDocumentState => {
  if (!font || text.length === 0) {
    return { status: "unavailable", svg: null };
  }

  try {
    if (options.orientation === "horizontal") {
      const horizontal = createHorizontalLayout(text, font, options);

      if (!horizontal) {
        return { status: "unavailable", svg: null };
      }

      return { status: "ready", svg: serializeHorizontalSvg(horizontal, options.fill) };
    }

    const layout = createVerticalLayout(text, font, options);

    if (!layout) {
      return { status: "unavailable", svg: null };
    }

    return { status: "ready", svg: serializeVerticalSvg(layout, options.fill) };
  } catch {
    return { status: "unavailable", svg: null };
  }
}

export const sanitizeSvgFilename = (basename: string): string => {
  const safe = basename.trim().replace(/[<>:"/\\|?*]/g, "-").replace(/(?:\.svg)+$/i, "").trim();

  return `${safe || "glyph-export"}.svg`;
}

export const copyCanonicalSvg = async (
  svg: string,
  clipboard: Pick<Clipboard, "writeText"> | undefined = navigator.clipboard
): Promise<void> => {
  if (!clipboard?.writeText) {
    throw new Error("Clipboard access is unavailable.");
  }

  await clipboard.writeText(svg);
}

export const createSvgBlob = (svg: string): Blob => {
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
}

export const exportCanonicalSvg = (svg: string, filename: string): void => {
  const blob = createSvgBlob(svg);
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");

    link.href = url;
    link.download = sanitizeSvgFilename(filename);
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}