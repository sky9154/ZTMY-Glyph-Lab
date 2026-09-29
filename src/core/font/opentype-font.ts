import { parse as parseOpenType, type Font as OpenTypeFont, type Glyph as OpenTypeGlyph } from "opentype.js";
import {
  createFontLoadError,
  type FontAdapter,
  type GlyphBounds,
  type GlyphData,
} from "@core/font/font-adapter";

export const DEFAULT_TEXT = "ずとまよ";
export const REQUIRED_FONT_FILENAME = "ZTMY_MOJI-R.otf";
export const REQUIRED_FONT_SHA256 = "0995ab5e4590f0ec8fac7e898edf5426ece287fc9323589b99a95e70ccc28a79";


const REQUIRED_GLYPH_BOUNDS = {
  ず: { xMin: 100, yMin: -23, xMax: 900, yMax: 783 },
  と: { xMin: 96, yMin: -19, xMax: 903, yMax: 779 },
  ま: { xMin: 100, yMin: -24, xMax: 900, yMax: 784 },
  よ: { xMin: 50, yMin: -24, xMax: 949, yMax: 784 }
} as const;

type FontFingerprint = (buffer: ArrayBuffer) => Promise<string>;

const fingerprintFont: FontFingerprint = async (buffer: ArrayBuffer): Promise<string> => {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw createFontLoadError(
      "verification-unavailable",
      "This browser cannot verify ZTMY_MOJI-R font data."
    );
  }

  const digest = await subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const localizedName = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const names = value as Record<string, unknown>;
  const preferred = ["en", "ja", "zh-Hant", "zh", "default"];
  const candidates = [...preferred.map((key) => names[key]), ...Object.values(names)];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

const hasZtmyMetadata = (font: OpenTypeFont): boolean => {
  const names = font.names ?? {};
  const metadata = [localizedName(names.fontFamily), localizedName(names.fullName)]
    .filter((value): value is string => value !== null)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return metadata.length === 0 || (metadata.includes("ztmy") && metadata.includes("moji"));
}

const isValidBounds = (bounds: GlyphBounds): boolean => {
  return Object.values(bounds).every(Number.isFinite);
}

const hasRequiredGlyphBounds = (adapter: FontAdapter): boolean => {
  return Object.entries(REQUIRED_GLYPH_BOUNDS).every(([character, expected]) => {
    const glyph = adapter.getGlyph(character.codePointAt(0)!);

    if (!glyph || glyph.isEmpty || !glyph.bounds || !isValidBounds(glyph.bounds)) {
      return false;
    }

    return (Object.keys(expected) as Array<keyof typeof expected>).every(
      (key) => Math.abs(glyph.bounds![key] - expected[key]) <= 0.001
    );
  });
}

const glyphToData = (glyph: OpenTypeGlyph): GlyphData => {
  const pathData = glyph.path.toPathData({
    decimalPlaces: 6,
    optimize: false,
    flipY: false
  });
  const isEmpty = glyph.path.commands.length === 0 || pathData.length === 0;
  const rawBounds = isEmpty ? null : glyph.getBoundingBox();
  const bounds = rawBounds
    ? {
      xMin: rawBounds.x1,
      yMin: rawBounds.y1,
      xMax: rawBounds.x2,
      yMax: rawBounds.y2
    }
    : null;

  return {
    glyphId: glyph.index,
    pathData,
    bounds: bounds && isValidBounds(bounds) ? bounds : null,
    isEmpty
  };
}

export const createOpenTypeAdapter = (font: OpenTypeFont): FontAdapter => {
  const cmap = font.tables?.cmap?.glyphIndexMap;

  if (!cmap || typeof cmap !== "object") {
    throw createFontLoadError("missing-cmap", "The selected font has no usable Unicode cmap.");
  }

  const familyName = localizedName(font.names?.fontFamily);
  const fullName = localizedName(font.names?.fullName);

  return Object.freeze({
    unitsPerEm: font.unitsPerEm,
    familyName,
    fullName,
    getGlyph(codePoint: number): GlyphData | null {
      if (
        !Number.isInteger(codePoint) ||
        codePoint < 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return null;
      }

      try {
        const glyphIndex = cmap[codePoint];
        if (!Number.isInteger(glyphIndex) || glyphIndex <= 0) {
          return null;
        }

        const glyph = font.glyphs.get(glyphIndex);

        return glyph ? glyphToData(glyph) : null;
      } catch {
        return null;
      }
    },
  });
}

const checkFile = (file: File): void => {
  if (!file.name.toLowerCase().endsWith(".otf")) {
    throw createFontLoadError(
      "wrong-file",
      "Choose an OpenType .otf font file."
    );
  }
}

export const loadFontFile = async (
  file: File,
  parse: (buffer: ArrayBuffer) => OpenTypeFont = parseOpenType,
  fingerprint: FontFingerprint = fingerprintFont,
): Promise<FontAdapter> => {
  checkFile(file);

  let buffer: ArrayBuffer;
  let parsed: OpenTypeFont;

  try {
    buffer = await file.arrayBuffer();
    parsed = parse(buffer);
  } catch {
    throw createFontLoadError(
      "parse-failed",
      "The selected file could not be parsed as an OpenType font."
    );
  }

  if (parsed.unitsPerEm !== 1000) {
    throw createFontLoadError("invalid-upem", "The font has an invalid unitsPerEm value.");
  }

  if (!hasZtmyMetadata(parsed)) {
    throw createFontLoadError(
      "wrong-font",
      "The font metadata does not identify the required ZTMY_MOJI-R family.",
    );
  }

  const adapter = createOpenTypeAdapter(parsed);
  const missingCodePoints = Array.from(DEFAULT_TEXT, (character) => character.codePointAt(0)!)
    .filter((codePoint) => adapter.getGlyph(codePoint) === null);

  if (missingCodePoints.length > 0) {
    throw createFontLoadError(
      "missing-required-glyphs",
      `The font is missing required glyphs: ${missingCodePoints
        .map((codePoint) => String.fromCodePoint(codePoint))
        .join(" ")}`,
      missingCodePoints
    );
  }

  if (!hasRequiredGlyphBounds(adapter)) {
    throw createFontLoadError(
      "wrong-font",
      "The selected font does not match the ZTMY_MOJI-R glyph profile."
    );
  }

  let actualFingerprint: string;

  try {
    actualFingerprint = await fingerprint(buffer);
  } catch {
    throw createFontLoadError(
      "verification-unavailable",
      "This browser could not verify ZTMY_MOJI-R font data."
    );
  }

  if (actualFingerprint !== REQUIRED_FONT_SHA256) {
    throw createFontLoadError(
      "wrong-font",
      "The selected file is not the required ZTMY_MOJI-R font data."
    );
  }

  return adapter;
}