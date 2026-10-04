import type { FontAdapter } from "@core/font/font-adapter";
import { createVerticalLayout, type VerticalLayoutOptions } from "@core/svg/vertical-layout";
import { serializeVerticalSvg } from "@core/svg/vertical-svg";
import { createHorizontalLayout } from "@core/svg/horizontal-layout";
import { serializeHorizontalSvg } from "@core/svg/horizontal-svg";
import { LayoutValidationError } from "@core/svg/layout-utils";


export type Orientation = "vertical" | "horizontal";

export interface CanonicalSvgOptions extends VerticalLayoutOptions {
  fill: string;
  orientation?: Orientation;
}

export type SvgUnavailableReason = "font-required" | "empty-text" | "invalid-fill" | "invalid-layout" | "generation-error";

export type SvgDocumentState =
  | { status: "unavailable"; svg: null; reason: SvgUnavailableReason }
  | { status: "ready"; svg: string };

export const isValidSvgFill = (fill: string): boolean => /^#[\da-fA-F]{6}$/.test(fill);

export const getSvgUnavailableMessage = (state: Extract<SvgDocumentState, { status: "unavailable" }>): string => {
  switch (state.reason) {
    case "font-required":
      return "LOAD ZTMY_MOJI-R.otf TO CONTINUE";
    case "empty-text":
      return "Enter text to preview the SVG.";
    case "invalid-fill":
      return "Enter a valid six-digit hex color, such as #1A2B3C.";
    case "invalid-layout":
      return "Spacing and padding must produce positive SVG dimensions.";
    case "generation-error":
      return "SVG generation failed. See the browser console for details.";
  }
};

export const createCanonicalSvg = (
  text: string,
  font: FontAdapter | null,
  options: CanonicalSvgOptions
): SvgDocumentState => {
  if (![...text.normalize("NFC")].some((character) => character !== "\n")) {
    return { status: "unavailable", svg: null, reason: "empty-text" };
  }

  if (!isValidSvgFill(options.fill)) {
    return { status: "unavailable", svg: null, reason: "invalid-fill" };
  }

  if (!font) {
    return { status: "unavailable", svg: null, reason: "font-required" };
  }

  try {
    if (options.orientation === "horizontal") {
      const horizontal = createHorizontalLayout(text, font, options);

      if (!horizontal) {
        return { status: "unavailable", svg: null, reason: "empty-text" };
      }

      return { status: "ready", svg: serializeHorizontalSvg(horizontal, options.fill) };
    }

    const layout = createVerticalLayout(text, font, options);

    if (!layout) {
      return { status: "unavailable", svg: null, reason: "empty-text" };
    }

    return { status: "ready", svg: serializeVerticalSvg(layout, options.fill) };
  } catch (error) {
    if (error instanceof LayoutValidationError) {
      return { status: "unavailable", svg: null, reason: "invalid-layout" };
    }

    console.error("Failed to create canonical SVG.", error);
    return { status: "unavailable", svg: null, reason: "generation-error" };
  }
};

export const sanitizeSvgFilename = (basename: string): string => {
  const safe = basename.trim().replace(/[<>:"/\\|?*]/g, "-").replace(/(?:\.svg)+$/i, "").trim();

  return `${safe || "glyph-export"}.svg`;
};

export const copyCanonicalSvg = async (
  svg: string,
  clipboard: Pick<Clipboard, "writeText"> | undefined = navigator.clipboard
): Promise<void> => {
  if (!clipboard?.writeText) {
    throw new Error("Clipboard access is unavailable.");
  }

  await clipboard.writeText(svg);
};

export const createSvgBlob = (svg: string): Blob => {
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
};

export const exportCanonicalSvg = (svg: string, filename: string): void => {
  const blob = createSvgBlob(svg);
  const url = URL.createObjectURL(blob);
  let link: HTMLAnchorElement | null = null;

  try {
    link = document.createElement("a");

    link.href = url;
    link.download = sanitizeSvgFilename(filename);
    document.body.append(link);
    link.click();
  } finally {
    window.setTimeout(() => {
      link?.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  }
};
