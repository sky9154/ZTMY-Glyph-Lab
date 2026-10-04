import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { App } from "@app/App";
import { AppearanceSection } from "@components/AppearanceSection";
import { GlyphInspector } from "@components/GlyphInspector";
import { getMeasurementError as validateMeasurementDraft } from "@components/measurement-validation";


describe("App font-required state", () => {
  it("keeps the default text available and does not render an SVG before font loading", () => {
    const markup = renderToStaticMarkup(<App />);
    const controlStart = markup.indexOf('<aside class="control-archive"');
    const controlEnd = markup.indexOf("</aside>", controlStart);
    const controls = markup.slice(controlStart, controlEnd);
    const recordStart = markup.indexOf('<aside class="specimen-record"');
    const record = markup.slice(recordStart, markup.indexOf("</aside>", recordStart));

    expect(markup).toContain("ずとまよ");
    expect(markup).toContain('aria-pressed="true">Vertical</button>');
    expect(markup).toContain('aria-pressed="false">Horizontal</button>');
    expect(markup).toContain("OTF NOT LOADED");
    expect(markup).toContain("SVG UNAVAILABLE");
    expect(markup).toContain("<h1>GLYPH LAB.</h1>");
    expect(markup).toContain("ZTMY TYPE SPECIMEN / LOCAL TOOL");
    expect(markup).toContain("Load the ZTMY_MOJI-R OTF, choose vertical or horizontal layout, adjust spacing and color, and export SVG.");
    expect(markup).toContain("REQUIRED FILE");
    expect(markup).toContain("Select the ZTMY_MOJI-R OTF. The filename may differ.");
    expect(markup).toContain("The font is processed only in this browser tab. It is not uploaded.");
    expect(markup).toContain("Controls");
    expect(markup).toContain("<h2 id=\"text-heading\">TEXT</h2>");
    expect(markup).toContain("<h2 id=\"font-heading\">FONT</h2>");
    expect(markup).toContain("<h2 id=\"layout-heading\">LAYOUT</h2>");
    expect(markup).toMatch(/id="letter-spacing" type="range" min="-500" max="2000" step="10" value="160"/);
    expect(markup).toContain("<h2 id=\"appearance-heading\">APPEARANCE</h2>");
    expect(markup).toContain("<h2 id=\"export-heading\">EXPORT</h2>");
    expect(controls).toContain("<h2 id=\"export-heading\">EXPORT</h2>");
    expect(markup).toContain("<h2 id=\"preview-heading\">PREVIEW</h2>");
    expect(record).toContain('aria-label="Glyph inspection and specimen record"');
    expect(record).toContain("<h2>GLYPH</h2>");
    expect(record).toContain("Glyph selection");
    expect(markup.indexOf("<h2 id=\"export-heading\">EXPORT</h2>")).toBeLessThan(markup.indexOf("<h2 id=\"preview-heading\">PREVIEW</h2>"));
    expect(markup.indexOf("<h2 id=\"preview-heading\">PREVIEW</h2>")).toBeLessThan(markup.indexOf("<h2>GLYPH</h2>"));
    expect(markup).not.toContain("01 / TEXT");
    expect(markup).not.toContain("02 / FONT");
    expect(markup).not.toContain("03 / LAYOUT");
    expect(markup).not.toContain("04 / APPEARANCE");
    expect(markup).not.toContain("05 / EXPORT");
    expect(markup).not.toContain("06 / PREVIEW");
    expect(markup).not.toContain("07 / GLYPH");
    expect(markup).not.toContain("FORM RECORD / 001");
    expect(markup).not.toContain("FIELD 01");
    expect(markup).not.toContain("PLATE / 001");
    expect(markup).not.toContain("A—01");
    expect(markup).not.toContain("R—01");
    expect(markup).not.toContain("microstructure-mark");
    expect(markup).not.toContain("zoom-spinner");
    expect(markup).toContain('role="region" aria-label="SVG preview canvas" aria-describedby="viewer-keyboard-help" tabindex="0"');
    expect(markup).toContain("With the preview focused, use the arrow keys to pan");
    expect(controls).not.toContain("glyph-cell-list");
    expect(controls).not.toContain("03 / GLYPH");
    expect(markup).toContain("Load the ZTMY_MOJI-R OTF to preview SVG.");
    expect(markup).toContain("Zoom out");
    expect(markup).toContain("Show bounds");
    expect(markup).toContain("Copy SVG");
    expect(markup).toContain("Export SVG");
    expect(markup).toContain("Backdrop");
    expect(markup).toContain("View options");
    expect(markup).toContain("Copyright © oF. All Rights Reserved.");
    expect(markup.lastIndexOf('<footer class="copyright-footer"')).toBeGreaterThan(markup.lastIndexOf("LIVE SVG OUTPUT"));
    expect(markup).not.toContain("<svg");
  });

  it("uses a distinct prompt when text is empty", () => {
    const markup = renderToStaticMarkup(
      <GlyphInspector
        isFontReady={true}
        cells={[]}
        orientation="vertical"
        selectedCell={null}
        onSelectCell={() => { }}
      />
    );

    expect(markup).toContain("Enter text to inspect glyphs.");
    expect(markup).toContain("No glyph selected.");
  });

  it("shows inline color validation and reports numeric draft errors", () => {
    const markup = renderToStaticMarkup(
      <AppearanceSection fill="not-a-color" onFillChange={() => { }} />
    );

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("Enter a six-digit hex color such as #1A2B3C.");
    expect(validateMeasurementDraft("", -500, 2000, 10)).toBe("Enter a number.");
    expect(validateMeasurementDraft("-510", -500, 2000, 10)).toBe("Enter a value from -500 to 2000.");
    expect(validateMeasurementDraft("1.5", 0, 300, 1)).toBe("Use increments of 1.");
    expect(validateMeasurementDraft("160", -500, 2000, 10)).toBeNull();
  });
});
