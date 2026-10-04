import { describe, expect, it, vi } from "vitest";

import type { FontAdapter, GlyphData } from "@core/font/font-adapter";
import {
  copyCanonicalSvg,
  createCanonicalSvg,
  createSvgBlob,
  exportCanonicalSvg,
  getSvgUnavailableMessage,
  isValidSvgFill,
  sanitizeSvgFilename
} from "@core/svg/canonical-svg";


const glyph: GlyphData = { glyphId: 1, pathData: "M0 0L10 10Z", bounds: { xMin: 0, yMin: 0, xMax: 10, yMax: 10 }, isEmpty: false };
const font: FontAdapter = { unitsPerEm: 1000, familyName: "test", fullName: "test", getGlyph: () => glyph };
const opts = { letterSpacing: 160, padding: 20, fill: "#000000" };

describe("canonical SVG document", () => {
  it("produces one path-only canonical string and preserves the Phase 3 golden viewBox", () => {
    const doc = createCanonicalSvg("ずとまよ", font, opts);
    expect(doc.status).toBe("ready");

    if (doc.status !== "ready") {
      return;
    }

    expect(doc.svg).toContain('viewBox="0 0 1040 4520"');
    expect(doc.svg).toContain('transform="translate(515 525) scale(1 -1)"');
    expect(doc.svg).not.toContain("scale(1 - 1)");
    expect(doc.svg).not.toContain("<text");
    expect(doc.svg).not.toContain("<rect");
  });

  it("reports distinct reasons for a missing font, empty text, and invalid fill", () => {
    expect(createCanonicalSvg("ず", null, opts)).toEqual({
      status: "unavailable",
      svg: null,
      reason: "font-required"
    });
    expect(createCanonicalSvg("\n", font, opts)).toEqual({
      status: "unavailable",
      svg: null,
      reason: "empty-text"
    });
    expect(createCanonicalSvg("ず", font, { ...opts, fill: "red" })).toEqual({
      status: "unavailable",
      svg: null,
      reason: "invalid-fill"
    });
    expect(createCanonicalSvg("ず", null, { ...opts, fill: "bad-color" })).toMatchObject({ reason: "invalid-fill" });
  });

  it("validates six-digit hex colors and provides clear empty-state messages", () => {
    expect(isValidSvgFill("#1A2B3C")).toBe(true);
    expect(isValidSvgFill("#12FG56")).toBe(false);
    expect(isValidSvgFill("#12345")).toBe(false);
    expect(getSvgUnavailableMessage({ status: "unavailable", svg: null, reason: "invalid-fill" }))
      .toBe("Enter a valid six-digit hex color, such as #1A2B3C.");
    expect(getSvgUnavailableMessage({ status: "unavailable", svg: null, reason: "empty-text" }))
      .toBe("Enter text to preview the SVG.");
    expect(getSvgUnavailableMessage({ status: "unavailable", svg: null, reason: "generation-error" }))
      .toBe("SVG generation failed. See the browser console for details.");
  });

  it("reports invalid layout dimensions with a specific message", () => {
    const state = createCanonicalSvg("ずと", font, { ...opts, letterSpacing: -2100 });

    expect(state).toMatchObject({ status: "unavailable", reason: "invalid-layout" });
    if (state.status === "unavailable") {
      expect(getSvgUnavailableMessage(state)).toBe("Spacing and padding must produce positive SVG dimensions.");
    }
  });

  it("keeps unknown generation failures visible and logs the original error", () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => { });
    const failingFont = { ...font, getGlyph: () => { throw new Error("unexpected adapter failure"); } };

    try {
      expect(createCanonicalSvg("ず", failingFont, opts)).toEqual({
        status: "unavailable",
        svg: null,
        reason: "generation-error"
      });
      expect(logError).toHaveBeenCalledWith("Failed to create canonical SVG.", expect.any(Error));
    } finally {
      logError.mockRestore();
    }
  });

  it("changes the canonical string when fill, spacing, or padding changes", () => {
    const baseline = createCanonicalSvg("ずと", font, opts);
    expect(createCanonicalSvg("ずと", font, { ...opts, fill: "#FF0000" })).not.toEqual(baseline);
    expect(createCanonicalSvg("ずと", font, { ...opts, letterSpacing: 161 })).not.toEqual(baseline);
    expect(createCanonicalSvg("ずと", font, { ...opts, padding: 21 })).not.toEqual(baseline);
  });

  it("defaults to Vertical, switches the canonical document to Horizontal and restores Vertical output", () => {
    const vertical = createCanonicalSvg("ずとまよ", font, opts);
    const horizontal = createCanonicalSvg("ずとまよ", font, { ...opts, orientation: "horizontal" });
    expect(vertical).toEqual(createCanonicalSvg("ずとまよ", font, { ...opts, orientation: "vertical" }));
    expect(vertical.status).toBe("ready");
    expect(horizontal.status).toBe("ready");

    if (vertical.status === "ready" && horizontal.status === "ready") {
      expect(vertical.svg).toContain('viewBox="0 0 1040 4520"');
      expect(horizontal.svg).toContain('viewBox="0 0 4520 1040"');
      expect(horizontal.svg).not.toBe(vertical.svg);
      expect(createCanonicalSvg("ずとまよ", font, { ...opts, orientation: "vertical" })).toEqual(vertical);
    }
  });

  it("keeps missing glyph cells while leaving the SVG available", () => {
    const partialFont = { ...font, getGlyph: (codePoint: number) => codePoint === "😀".codePointAt(0) ? null : glyph };
    expect(createCanonicalSvg("ず😀と", partialFont, opts).status).toBe("ready");
  });

  it("keeps preview, clipboard, and exported Blob on the exact same canonical string", async () => {
    const svg = createCanonicalSvg("ず", font, opts);

    if (svg.status !== "ready") {
      throw new Error("expected SVG");
    }

    const writeText = vi.fn().mockResolvedValue(undefined);

    await copyCanonicalSvg(svg.svg, { writeText });

    expect(writeText).toHaveBeenCalledExactlyOnceWith(svg.svg);
    const previewSvg = svg.svg;
    expect(previewSvg).toBe(svg.svg);
    expect(await createSvgBlob(svg.svg).text()).toBe(previewSvg);
  });

  it("safely reports clipboard failure", async () => {
    const svg = createCanonicalSvg("ず", font, opts);
    if (svg.status !== "ready") throw new Error("expected SVG");
    await expect(copyCanonicalSvg(svg.svg, { writeText: vi.fn().mockRejectedValue(new Error("denied")) })).rejects.toThrow("denied");
    await expect(copyCanonicalSvg(svg.svg, undefined)).rejects.toThrow("unavailable");
  });

  it("sanitizes filenames and emits only one .svg extension", () => {
    expect(sanitizeSvgFilename("my:glyph")).toBe("my-glyph.svg");
    expect(sanitizeSvgFilename(" test.svg ")).toBe("test.svg");
    expect(sanitizeSvgFilename("test.svg.svg")).toBe("test.svg");
    expect(sanitizeSvgFilename("   ")).toBe("glyph-export.svg");
    expect(sanitizeSvgFilename("<>:\"/\\|?*")).toBe("---------.svg");
  });

  it("creates an export Blob containing precisely the canonical SVG", async () => {
    const svg = createCanonicalSvg("ず", font, opts);
    if (svg.status !== "ready") throw new Error("expected SVG");
    const blob = createSvgBlob(svg.svg);
    expect(await blob.text()).toBe(svg.svg);
    expect(blob.type).toBe("image/svg+xml;charset=utf-8");
  });

  it("keeps a document-attached download link until delayed cleanup", () => {
    const url = "blob:test-svg";
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue(url);
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => { });
    let linkAttachedDuringClick = false;
    let downloadName = "";
    const events: string[] = [];
    const body = {
      append: vi.fn((element: HTMLAnchorElement) => {
        (element as unknown as { parentElement: unknown }).parentElement = body;
      })
    } as unknown as HTMLElement;
    const link = {
      href: "",
      download: "",
      parentElement: null,
      click: vi.fn(() => {
        events.push("click");
        linkAttachedDuringClick = link.parentElement === body;
        downloadName = link.download;
      }),
      remove: vi.fn(() => events.push("remove"))
    } as unknown as HTMLAnchorElement;
    const createElement = vi.fn(() => link);
    const mockDocument = { body, createElement } as unknown as Document;
    let delayedCleanup: (() => void) | undefined;
    const timeout = vi.fn((callback: () => void) => {
      delayedCleanup = callback;
      return 0;
    });

    try {
      vi.stubGlobal("document", mockDocument);
      vi.stubGlobal("window", { setTimeout: timeout });
      exportCanonicalSvg("<svg />", "test");

      expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
      expect(createElement).toHaveBeenCalledWith("a");
      expect(body.append).toHaveBeenCalledWith(link);
      expect(link.click).toHaveBeenCalledOnce();
      expect(linkAttachedDuringClick).toBe(true);
      expect(downloadName).toBe("test.svg");
      expect(link.remove).not.toHaveBeenCalled();
      expect(events).toEqual(["click"]);
      expect(timeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(revokeObjectUrl).not.toHaveBeenCalled();
      expect(delayedCleanup).toBeDefined();
      delayedCleanup?.();
      expect(link.remove).toHaveBeenCalledOnce();
      expect(events).toEqual(["click", "remove"]);
      expect(revokeObjectUrl).toHaveBeenCalledWith(url);
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
