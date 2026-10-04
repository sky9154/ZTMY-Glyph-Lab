import { describe, expect, it } from "vitest";

import type { FontAdapter, GlyphData } from "@core/font/font-adapter";
import { createHorizontalLayout } from "@core/svg/horizontal-layout";
import { serializeHorizontalSvg } from "@core/svg/horizontal-svg";


const glyph = (id: number, bounds = { xMin: 100, yMin: 200, xMax: 500, yMax: 800 }): GlyphData => ({
  glyphId: id, pathData: `M${id} 0L${id} 10Z`, bounds, isEmpty: false
});
const cp = (char: string) => char.codePointAt(0)!;
function mockFont(mapping: Record<number, GlyphData> = {}): FontAdapter {
  return { unitsPerEm: 1000, familyName: "test", fullName: "test", getGlyph: (codePoint) => mapping[codePoint] ?? null };
}
const glyphs = Object.fromEntries(Array.from("ずとまよ", (char, index) => [cp(char), glyph(index + 1)]));
const defaults = { letterSpacing: 160, padding: 20 };

describe("horizontal fixed-cell geometry", () => {
  it("positions one and two glyphs from left to right", () => {
    const font = mockFont(glyphs);
    expect(createHorizontalLayout("ず", font, defaults)).toMatchObject({ width: 1040, height: 1040, columnCount: 1, glyphs: [{ translateX: 220, translateY: 1020 }] });
    expect(createHorizontalLayout("ずと", font, defaults)).toMatchObject({ width: 2200, height: 1040, columnCount: 2, glyphs: [{ columnIndex: 0, translateX: 220, translateY: 1020 }, { columnIndex: 1, translateX: 1380, translateY: 1020 }] });
  });

  it("matches the fixed four glyph golden dimensions", () => {
    const layout = createHorizontalLayout("ずとまよ", mockFont(glyphs), defaults)!;
    expect(layout).toMatchObject({ width: 4520, height: 1040, columnCount: 4 });
    expect(serializeHorizontalSvg(layout)).toContain('viewBox="0 0 4520 1040"');
  });

  it("supports zero/custom/negative spacing and zero/custom padding", () => {
    const font = mockFont(glyphs);
    expect(createHorizontalLayout("ずと", font, { letterSpacing: 0, padding: 0 })).toMatchObject({ width: 2000, height: 1000, glyphs: [{ translateX: 200, translateY: 1000 }, { translateX: 1200, translateY: 1000 }] });
    expect(createHorizontalLayout("ずと", font, { letterSpacing: 25, padding: 7 })).toMatchObject({ width: 2039, height: 1014, glyphs: [{ translateX: 207, translateY: 1007 }, { translateX: 1232, translateY: 1007 }] });
    expect(createHorizontalLayout("ずと", font, { letterSpacing: -50, padding: 0 })?.width).toBe(1950);
    expect(() => createHorizontalLayout("ずと", font, { letterSpacing: -2100, padding: 0 })).toThrow(/positive finite/);
  });
});

describe("horizontal text and cell behavior", () => {
  it("normalizes to NFC and iterates Unicode code points", () => {
    expect(createHorizontalLayout("か\u3099", mockFont({ [cp("が")]: glyph(1) }), defaults)?.glyphs).toMatchObject([{ char: "が", codePoint: cp("が") }]);
    const supplementary = createHorizontalLayout("𐀀", mockFont(), defaults)!;
    expect(supplementary.glyphs).toMatchObject([{ codePoint: 0x10000, char: "𐀀", columnIndex: 0 }]);
  });

  it("ignores LF, preserves CR as a cell, including in CRLF", () => {
    const font = mockFont({ [cp("ず")]: glyph(1), [cp("と")]: glyph(2) });
    expect(createHorizontalLayout("ず\nと", font, defaults)?.glyphs.map(({ char, columnIndex }) => [char, columnIndex])).toEqual([["ず", 0], ["と", 1]]);
    for (const text of ["ず\rと", "ず\r\nと"]) {
      const layout = createHorizontalLayout(text, font, defaults)!;
      expect(layout.columnCount).toBe(3);
      expect(layout.glyphs.map(({ char, columnIndex, glyph }) => [char, columnIndex, glyph === null])).toEqual([["ず", 0, false], ["\r", 1, true], ["と", 2, false]]);
      expect(layout.glyphs[2]?.translateX).toBe(2540);
    }
  });

  it("reserves a missing column and keeps mapped empty glyph distinct", () => {
    const empty: GlyphData = { glyphId: 9, pathData: "", bounds: null, isEmpty: true };
    const font = mockFont({ [cp("ず")]: glyph(1), [cp(" ")]: empty, [cp("と")]: glyph(2) });
    const missing = createHorizontalLayout("ず𐀀と", font, defaults)!;
    expect(missing.columnCount).toBe(3);
    expect(missing.glyphs[1]).toMatchObject({ codePoint: 0x10000, glyph: null, columnIndex: 1 });
    expect(missing.glyphs[2]).toMatchObject({ columnIndex: 2, translateX: 2540 });
    const mappedEmpty = createHorizontalLayout("ず と", font, defaults)!;
    expect(mappedEmpty.glyphs[1]?.glyph).toMatchObject({ glyphId: 9, isEmpty: true });
    expect(mappedEmpty.glyphs[2]?.columnIndex).toBe(2);
  });

  it("returns no layout for empty normalized content", () => {
    expect(createHorizontalLayout("\n\n", mockFont(), defaults)).toBeNull();
  });
});

describe("horizontal SVG serialization", () => {
  it("is deterministic, path-only, transparent and uses the required transform", () => {
    const svg = serializeHorizontalSvg(createHorizontalLayout("ず", mockFont({ [cp("ず")]: glyph(1) }), defaults)!);
    expect(serializeHorizontalSvg(createHorizontalLayout("ず", mockFont({ [cp("ず")]: glyph(1) }), defaults)!)).toBe(svg);
    expect(svg).toContain('viewBox="0 0 1040 1040"');
    expect(svg).toContain('transform="translate(220 1020) scale(1 -1)"');
    expect(svg).not.toContain("scale(1 - 1)");
    expect(svg).toContain('<path d="M1 0L1 10Z"');
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain("<rect");
    expect(svg).not.toContain("font-face");
    expect(svg).toContain('fill="#000000"');
  });
});
