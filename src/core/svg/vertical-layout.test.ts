import { describe, expect, it } from "vitest";

import type { FontAdapter, GlyphData } from "@core/font/font-adapter";
import { createVerticalLayout, DEFAULT_VERTICAL_OPTIONS } from "@core/svg/vertical-layout";
import { serializeSvg } from "@core/svg/serialize-svg";


const glyph = (id: number, bounds = { xMin: 100, yMin: 200, xMax: 500, yMax: 800 }): GlyphData => ({
  glyphId: id,
  pathData: `M${id} 0L${id} 10Z`,
  bounds,
  isEmpty: false
});

function mockFont(mapping: Record<number, GlyphData> = {}): FontAdapter {
  return {
    unitsPerEm: 1000,
    familyName: "test",
    fullName: "test",
    getGlyph: (codePoint) => mapping[codePoint] ?? null
  };
}

const cp = (char: string) => char.codePointAt(0)!;

describe("vertical fixed-cell geometry", () => {
  it("matches the fixed golden viewBox for ずとまよ", () => {
    const font = mockFont(Object.fromEntries(Array.from("ずとまよ", (char, index) => [cp(char), glyph(index + 1)])));
    const result = createVerticalLayout("ずとまよ", font)!;

    expect(result).toMatchObject({ width: 1040, height: 4520, rowCount: 4 });
    expect(serializeSvg(result)).toContain('viewBox="0 0 1040 4520"');
  });

  it("keeps the 15-cell UPEM 1000 / spacing 40 / padding 0 vertical viewBox", () => {
    const empty: GlyphData = { glyphId: 0, pathData: "", bounds: null, isEmpty: true };
    const mapped = Object.fromEntries(Array.from(new Set("ずとまよ"), (char, index) => [cp(char), glyph(index + 1)]));
    const font = mockFont({ ...mapped, [cp(" ")]: empty });
    const result = createVerticalLayout("ずとまよずとまよ ずとまよ😀ず", font, { letterSpacing: 40, padding: 0 })!;

    expect(result).toMatchObject({ width: 1000, height: 15560, rowCount: 15 });
    expect(result.glyphs[8]?.glyph).toMatchObject({ isEmpty: true });
    expect(result.glyphs[13]?.glyph).toBeNull();
    expect(serializeSvg(result)).toContain('viewBox="0 0 1000 15560"');
  });

  it("computes one and two glyph dimensions and standard placement", () => {
    const font = mockFont({ [cp("ず")]: glyph(1), [cp("と")]: glyph(2) });
    const one = createVerticalLayout("ず", font)!;
    const two = createVerticalLayout("ずと", font)!;

    expect(one).toMatchObject({ width: 1040, height: 1040, rowCount: 1 });
    expect(two).toMatchObject({ width: 1040, height: 2200, rowCount: 2 });
    expect(two.glyphs[0]).toMatchObject({ translateX: 220, translateY: 1020 });
    expect(two.glyphs[1]).toMatchObject({ translateX: 220, translateY: 2180 });
  });

  it("supports custom, zero and negative spacing plus custom and zero padding", () => {
    const font = mockFont({ [cp("ず")]: glyph(1), [cp("と")]: glyph(2) });
    expect(createVerticalLayout("ずと", font, { letterSpacing: 25, padding: 7 })).toMatchObject({
      width: 1014, height: 2039,
      glyphs: [{ translateX: 207, translateY: 1007 }, { translateX: 207, translateY: 2032 }]
    });
    expect(createVerticalLayout("ずと", font, { letterSpacing: 0, padding: 0 })).toMatchObject({
      width: 1000, height: 2000,
      glyphs: [{ translateX: 200, translateY: 1000 }, { translateX: 200, translateY: 2000 }]
    });
    expect(createVerticalLayout("ずと", font, { letterSpacing: -50, padding: 0 })?.height).toBe(1950);
    expect(() => createVerticalLayout("ずと", font, { letterSpacing: -2100, padding: 0 })).toThrow(/positive finite/);
  });
});

describe("vertical text cell behavior", () => {
  it("normalizes text to NFC before code-point-safe lookup", () => {
    const normalized = mockFont({ [cp("が")]: glyph(1) });
    const result = createVerticalLayout("か\u3099", normalized)!;
    expect(result.rowCount).toBe(1);
    expect(result.glyphs[0]).toMatchObject({ char: "が", codePoint: cp("が"), glyph: { glyphId: 1 } });
  });

  it("ignores LF without consuming a cell", () => {
    const result = createVerticalLayout("ず\nと", mockFont({ [cp("ず")]: glyph(1), [cp("と")]: glyph(2) }))!;
    expect(result.rowCount).toBe(2);
    expect(result.glyphs.map(({ rowIndex }) => rowIndex)).toEqual([0, 1]);
  });

  it("treats standalone CR as an ordinary missing code point and reserves its row", () => {
    const result = createVerticalLayout("ず\rと", mockFont({ [cp("ず")]: glyph(1), [cp("と")]: glyph(2) }))!;
    expect(result.rowCount).toBe(3);
    expect(result.glyphs.map(({ char, rowIndex }) => [char, rowIndex])).toEqual([["ず", 0], ["\r", 1], ["と", 2]]);
    expect(result.glyphs[1]?.glyph).toBeNull();
    expect(result.glyphs[2]?.translateY).toBe(3340);
  });

  it("keeps CR in CRLF as a cell while ignoring LF", () => {
    const result = createVerticalLayout("ず\r\nと", mockFont({ [cp("ず")]: glyph(1), [cp("と")]: glyph(2) }))!;
    expect(result.rowCount).toBe(3);
    expect(result.glyphs.map(({ char, rowIndex }) => [char, rowIndex])).toEqual([["ず", 0], ["\r", 1], ["と", 2]]);
  });

  it("uses code points for supplementary characters and preserves missing-cell positions", () => {
    const result = createVerticalLayout("ず𐀀と", mockFont({ [cp("ず")]: glyph(1), [cp("と")]: glyph(2) }))!;
    expect(result.rowCount).toBe(3);
    expect(result.glyphs[1]).toMatchObject({ codePoint: 0x10000, char: "𐀀", glyph: null, translateX: null });
    expect(result.glyphs[2]).toMatchObject({ rowIndex: 2, translateY: 3340 });
    expect(serializeSvg(result)).not.toContain("Mundefined");
    expect(serializeSvg(result)).toContain("M2 0L2 10Z");
  });

  it("reserves a cell for a mapped empty glyph while distinguishing it from missing", () => {
    const empty: GlyphData = { glyphId: 9, pathData: "", bounds: null, isEmpty: true };
    const result = createVerticalLayout("ず と", mockFont({ [cp("ず")]: glyph(1), [cp(" ")]: empty, [cp("と")]: glyph(2) }))!;
    expect(result.rowCount).toBe(3);
    expect(result.glyphs[1]?.glyph).toMatchObject({ glyphId: 9, isEmpty: true });
    expect(result.glyphs[2]?.rowIndex).toBe(2);
  });

  it("returns an explicit empty result when there are no layout cells", () => {
    expect(createVerticalLayout("\n\n", mockFont())).toBeNull();
  });
});

describe("vertical SVG serialization", () => {
  it("emits transparent path-only SVG with Python-compatible transforms deterministically", () => {
    const layout = createVerticalLayout("ず", mockFont({ [cp("ず")]: glyph(1) }), DEFAULT_VERTICAL_OPTIONS)!;
    const svg = serializeSvg(layout);
    expect(svg).toBe(serializeSvg(layout));
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 1040">');
    expect(svg).toContain('transform="translate(220 1020) scale(1 -1)"');
    expect(svg).not.toContain("scale(1 - 1)");
    expect(svg).toContain('<path d="M1 0L1 10Z"');
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain("<rect");
    expect(svg).not.toContain("font-face");
    expect(svg).toContain('fill="#000000"');
  });

  it("omits missing and empty outlines from SVG paths", () => {
    const empty: GlyphData = { glyphId: 9, pathData: "", bounds: null, isEmpty: true };
    const layout = createVerticalLayout("ず と", mockFont({ [cp("ず")]: glyph(1), [cp(" ")]: empty }))!;
    const svg = serializeSvg(layout);
    expect(svg.match(/<path\b/g)).toHaveLength(1);
  });
});
