import { describe, expect, it } from "vitest";
import type { FontAdapter } from "../font/font-adapter";
import { createCanonicalSvg } from "./canonical-svg";
import { getLayoutCells, inspectCell, formatUnicodeCodePoint, summarizeGlyphCells } from "./glyph-inspector";


const font: FontAdapter = {
  unitsPerEm: 1000, familyName: "test", fullName: "test",
  getGlyph: (cp) => cp === 0x305a ? { glyphId: 12, pathData: "M0 0", bounds: { xMin: 1, yMin: 2, xMax: 11, yMax: 22 }, isEmpty: false }
    : cp === 0x3068 ? { glyphId: 0, pathData: "", bounds: null, isEmpty: true } : null
};
const options = { letterSpacing: 160, padding: 20 };

describe("glyph inspection", () => {
  it("uses NFC code point cells, omits LF, and keeps supplementary characters whole", () => {
    const cells = getLayoutCells("す\u3099\n𐀀と", font, options, "vertical");
    expect(cells.map((cell) => cell.char)).toEqual(["ず", "𐀀", "と"]);
    expect(cells.map((cell, i) => inspectCell(cell, i, "vertical").status)).toEqual(["Mapped", "Missing", "Empty"]);
    expect(formatUnicodeCodePoint(0x10000)).toBe("U+10000");
  });
  it("reports mapped, empty, and missing distinctly", () => {
    const cells = getLayoutCells("ずと𐀀", font, options, "vertical");
    expect(cells.map((cell, i) => inspectCell(cell, i, "vertical").status)).toEqual(["Mapped", "Empty", "Missing"]);
    expect(inspectCell(cells[0], 0, "vertical").glyph?.bounds).toEqual({ xMin: 1, yMin: 2, xMax: 11, yMax: 22 });
    expect(inspectCell(cells[2], 2, "vertical").translateX).toBeNull();
  });
  it("counts mapped, empty, and missing cells exactly once", () => {
    const cells = getLayoutCells("ずと𐀀", font, options, "vertical");
    const counts = summarizeGlyphCells(cells);

    expect(counts).toEqual({ total: 3, mapped: 1, empty: 1, missing: 1 });
    expect(counts.total).toBe(counts.mapped + counts.empty + counts.missing);
  });
  it("keeps SVG output independent of selection and inspection", () => {
    const before = createCanonicalSvg("ずと", font, { ...options, fill: "#000000", orientation: "vertical" });
    const cells = getLayoutCells("ずと", font, options, "vertical");
    inspectCell(cells[1], 1, "vertical");
    const after = createCanonicalSvg("ずと", font, { ...options, fill: "#000000", orientation: "vertical" });
    expect(after).toEqual(before);
  });
  it("reports orientation-specific placement while preserving the glyph data", () => {
    const vertical = getLayoutCells("ずず", font, options, "vertical");
    const horizontal = getLayoutCells("ずず", font, options, "horizontal");
    expect(inspectCell(vertical[0], 0, "vertical").glyph).toEqual(inspectCell(horizontal[0], 0, "horizontal").glyph);
    expect(inspectCell(vertical[1], 1, "vertical").translateY).not.toBe(inspectCell(horizontal[1], 1, "horizontal").translateY);
  });
});
