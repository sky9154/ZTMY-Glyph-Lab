import { describe, expect, it, vi } from "vitest";
import type { Font as OpenTypeFont, Glyph as OpenTypeGlyph } from "opentype.js";

import {
  createOpenTypeAdapter,
  DEFAULT_TEXT,
  loadFontFile,
  REQUIRED_FONT_FILENAME,
  REQUIRED_FONT_SHA256
} from "@core/font/opentype-font";
import { createLoadSequence, fontStateReducer, initialFontState } from "@core/font/font-state";


function makeGlyph(
  index: number,
  empty = false,
  bounds = { xMin: 10, yMin: 20, xMax: 30, yMax: 40 }
): OpenTypeGlyph {
  return {
    index,
    name: `glyph-${index}`,
    path: {
      commands: empty ? [] : [{ type: "M", x: 10, y: 20 }, { type: "L", x: 30, y: 40 }],
      toPathData: (options) => {
        expect(options?.flipY).toBe(false);
        return empty ? "" : "M10 20L30 40";
      }
    },
    getBoundingBox: () => ({ x1: bounds.xMin, y1: bounds.yMin, x2: bounds.xMax, y2: bounds.yMax })
  };
}

function makeFont(overrides: Partial<OpenTypeFont> = {}, ztmyProfile = false): OpenTypeFont {
  const profileBounds = [
    { xMin: 100, yMin: -23, xMax: 900, yMax: 783 },
    { xMin: 96, yMin: -19, xMax: 903, yMax: 779 },
    { xMin: 100, yMin: -24, xMax: 900, yMax: 784 },
    { xMin: 50, yMin: -24, xMax: 949, yMax: 784 }
  ];
  const glyphs = new Map<number, OpenTypeGlyph>([
    [1, makeGlyph(1, false, ztmyProfile ? profileBounds[0] : undefined)],
    [2, makeGlyph(2, false, ztmyProfile ? profileBounds[1] : undefined)],
    [3, makeGlyph(3, false, ztmyProfile ? profileBounds[2] : undefined)],
    [4, makeGlyph(4, false, ztmyProfile ? profileBounds[3] : undefined)],
    [5, makeGlyph(5, true)],
    [6, makeGlyph(6)]
  ]);

  return {
    unitsPerEm: 1000,
    names: {
      fontFamily: { ja: "ZTMY_MOJI-R" },
      fullName: { "zh-Hant": "ZTMY_MOJI-R Regular" }
    },
    tables: {
      cmap: {
        glyphIndexMap: {
          [DEFAULT_TEXT.codePointAt(0)!]: 1,
          [DEFAULT_TEXT.codePointAt(1)!]: 2,
          [DEFAULT_TEXT.codePointAt(2)!]: 3,
          [DEFAULT_TEXT.codePointAt(3)!]: 4,
          [0x20]: 5,
          [0x1f600]: 6
        }
      }
    },
    glyphs: { get: (index) => glyphs.get(index) },
    ...overrides
  } as OpenTypeFont;
}

const requiredFontFile = () => new File(["font bytes"], REQUIRED_FONT_FILENAME);
const matchingFingerprint = async () => REQUIRED_FONT_SHA256;
const mismatchingFingerprint = async () => "not-the-ztmy-font";

describe("FontAdapter", () => {
  it("returns glyph data in raw font units with path orientation unchanged", () => {
    const adapter = createOpenTypeAdapter(makeFont());

    expect(adapter.unitsPerEm).toBe(1000);
    expect(adapter.familyName).toBe("ZTMY_MOJI-R");
    expect(adapter.fullName).toBe("ZTMY_MOJI-R Regular");
    expect(adapter.getGlyph("ず".codePointAt(0)!)).toEqual({
      glyphId: 1,
      pathData: "M10 20L30 40",
      bounds: { xMin: 10, yMin: 20, xMax: 30, yMax: 40 },
      isEmpty: false
    });
  });

  it("returns null for missing, invalid, and surrogate code points", () => {
    const adapter = createOpenTypeAdapter(makeFont());

    expect(adapter.getGlyph(0x1f600)?.glyphId).toBe(6);
    expect(adapter.getGlyph(0xd83d)).toBeNull();
    expect(adapter.getGlyph(-1)).toBeNull();
  });

  it("distinguishes a mapped empty outline from a missing glyph", () => {
    const adapter = createOpenTypeAdapter(makeFont());

    expect(adapter.getGlyph(0x20)).toMatchObject({ glyphId: 5, isEmpty: true, bounds: null });
    expect(adapter.getGlyph(0x21)).toBeNull();
  });
});

describe("font file validation", () => {
  it("accepts a valid font when its filename differs from the expected hint", async () => {
    const adapter = await loadFontFile(
      new File(["font bytes"], "renamed-font.otf"),
      () => makeFont({}, true),
      matchingFingerprint,
    );
    expect(adapter.unitsPerEm).toBe(1000);
  });

  it("rejects files that are not OTF", async () => {
    await expect(loadFontFile(new File(["x"], "ZTMY_MOJI-R.ttf"), () => makeFont())).rejects.toMatchObject({
      code: "wrong-file"
    });
  });

  it("reports parser failures as font errors", async () => {
    await expect(loadFontFile(requiredFontFile(), () => { throw new Error("bad font"); }, matchingFingerprint)).rejects.toMatchObject({
      code: "parse-failed"
    });
  });

  it("checks the required fingerprint before invoking the OpenType parser", async () => {
    const operations: string[] = [];

    await loadFontFile(
      requiredFontFile(),
      () => {
        operations.push("parse");
        return makeFont({}, true);
      },
      async () => {
        operations.push("fingerprint");
        return REQUIRED_FONT_SHA256;
      }
    );

    expect(operations).toEqual(["fingerprint", "parse"]);
  });

  it("rejects invalid unitsPerEm and missing cmap", async () => {
    await expect(
      loadFontFile(requiredFontFile(), () => makeFont({ unitsPerEm: 0 }), matchingFingerprint),
    ).rejects.toMatchObject({ code: "invalid-upem" });
    await expect(
      loadFontFile(requiredFontFile(), () => makeFont({ tables: {} }), matchingFingerprint),
    ).rejects.toMatchObject({ code: "missing-cmap" });
  });

  it("requires every default-text character to have a cmap glyph", async () => {
    const font = makeFont({
      tables: { cmap: { glyphIndexMap: { ["ず".codePointAt(0)!]: 1 } } }
    });

    await expect(loadFontFile(requiredFontFile(), () => font, matchingFingerprint)).rejects.toMatchObject({
      code: "missing-required-glyphs",
      missingCodePoints: ["と".codePointAt(0), "ま".codePointAt(0), "よ".codePointAt(0)]
    });
  });

  it("uses available localized metadata and accepts valid ZTMY glyph data", async () => {
    const adapter = await loadFontFile(requiredFontFile(), () => makeFont({}, true), matchingFingerprint);

    expect(adapter.familyName).toBe("ZTMY_MOJI-R");
    expect(adapter.fullName).toBe("ZTMY_MOJI-R Regular");
    expect(adapter.unitsPerEm).toBe(1000);
    expect(Array.from(DEFAULT_TEXT, (char) => adapter.getGlyph(char.codePointAt(0)!)).every(Boolean)).toBe(true);
  });

  it("rejects conflicting metadata even when the filename matches", async () => {
    const font = makeFont({ names: { fontFamily: { fr: "Unrelated Font" } } }, true);

    await expect(loadFontFile(requiredFontFile(), () => font, matchingFingerprint)).rejects.toMatchObject({
      code: "wrong-font"
    });
  });

  it("rejects another valid OTF by its content fingerprint even when the filename matches", async () => {
    const parse = vi.fn(() => makeFont({}, true));

    await expect(
      loadFontFile(requiredFontFile(), parse, mismatchingFingerprint),
    ).rejects.toMatchObject({ code: "wrong-font" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("requires the representative ZTMY glyph bounds before accepting the font", async () => {
    await expect(
      loadFontFile(requiredFontFile(), () => makeFont(), matchingFingerprint),
    ).rejects.toMatchObject({ code: "wrong-font" });
  });

  it("accepts unreadable family metadata when the font profile and content match", async () => {
    const font = makeFont({ names: {} }, true);
    const adapter = await loadFontFile(requiredFontFile(), () => font, matchingFingerprint);

    expect(adapter.familyName).toBeNull();
    expect(adapter.unitsPerEm).toBe(1000);
  });

  it("parses errors from real font bytes without needing a committed font fixture", async () => {
    await expect(loadFontFile(
      new File(["not an OTF"], REQUIRED_FONT_FILENAME),
      () => { throw new Error("bad font"); },
      matchingFingerprint
    )).rejects.toMatchObject({
      code: "parse-failed"
    });
  });
});

describe("font state", () => {
  it("transitions from required through loading to ready and error", () => {
    const font = createOpenTypeAdapter(makeFont());
    const loading = fontStateReducer(initialFontState, { type: "loading", fileName: REQUIRED_FONT_FILENAME });
    const ready = fontStateReducer(loading, { type: "ready", font });
    const error = fontStateReducer(loading, { type: "error", message: "parse failed" });

    expect(initialFontState.status).toBe("required");
    expect(loading.status).toBe("loading");
    expect(ready).toEqual({ status: "ready", font });
    expect(error).toEqual({ status: "error", message: "parse failed" });
  });

  it("keeps the latest file selection authoritative when loads finish out of order", () => {
    const sequence = createLoadSequence();
    const first = sequence.begin();
    const second = sequence.begin();

    expect(sequence.isCurrent(first)).toBe(false);
    expect(sequence.isCurrent(second)).toBe(true);
  });
});
