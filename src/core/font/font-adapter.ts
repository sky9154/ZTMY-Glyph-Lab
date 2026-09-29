export interface GlyphBounds {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface GlyphData {
  glyphId: number | string;
  pathData: string;
  bounds: GlyphBounds | null;
  isEmpty: boolean;
}

export interface FontAdapter {
  readonly unitsPerEm: number;
  readonly familyName: string | null;
  readonly fullName: string | null;
  getGlyph(codePoint: number): GlyphData | null;
}

export interface FontLoadError extends Error {
  code:
  | "wrong-file"
  | "parse-failed"
  | "invalid-upem"
  | "missing-cmap"
  | "wrong-font"
  | "missing-required-glyphs"
  | "verification-unavailable";
  missingCodePoints?: number[];
}

export const createFontLoadError = (
  code: FontLoadError["code"],
  message: string,
  missingCodePoints?: number[]
): FontLoadError => {
  const error = new Error(message) as FontLoadError;
  error.name = "FontLoadError";
  error.code = code;

  if (missingCodePoints) {
    error.missingCodePoints = missingCodePoints;
  }

  return error;
}