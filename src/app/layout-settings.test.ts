import { describe, expect, it } from "vitest";

import type { FontAdapter, GlyphData } from "@core/font/font-adapter";
import { createCanonicalSvg } from "@core/svg/canonical-svg";
import { DEFAULT_LAYOUT_SETTINGS } from "@core/svg/layout-settings";
import {
  hasResettableLayoutSettings,
  INITIAL_LAYOUT_SETTINGS_STATE,
  reduceLayoutSettings
} from "@app/layout-settings";
import { INITIAL_VIEWER_STATE, reduceViewerInteraction } from "@app/viewer";


const glyph: GlyphData = { glyphId: 1, pathData: "M0 0L10 10Z", bounds: { xMin: 0, yMin: 0, xMax: 10, yMax: 10 }, isEmpty: false };
const font: FontAdapter = { unitsPerEm: 1000, familyName: "test", fullName: "test", getGlyph: () => glyph };

describe("layout settings reset", () => {
  it("enables reset for each changed setting or pending draft", () => {
    const changedSettings = [
      { type: "orientation", value: "horizontal" },
      { type: "letter-spacing", value: 170 },
      { type: "padding", value: 21 },
      { type: "fill", value: "#123456" },
      { type: "layout-draft", value: true },
      { type: "appearance-draft", value: true }
    ] as const;

    expect(hasResettableLayoutSettings(INITIAL_LAYOUT_SETTINGS_STATE)).toBe(false);

    for (const action of changedSettings) {
      expect(hasResettableLayoutSettings(reduceLayoutSettings(INITIAL_LAYOUT_SETTINGS_STATE, action))).toBe(true);
    }
  });

  it("restores every setting, clears drafts, regenerates the default SVG, and is idempotent", () => {
    const changedState = ([
      { type: "orientation", value: "horizontal" },
      { type: "letter-spacing", value: 240 },
      { type: "padding", value: 48 },
      { type: "fill", value: "#123456" },
      { type: "layout-draft", value: true },
      { type: "appearance-draft", value: true }
    ] as const).reduce(reduceLayoutSettings, INITIAL_LAYOUT_SETTINGS_STATE);
    const changedViewer = reduceViewerInteraction(
      reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "manual-zoom-to", zoom: 160 }),
      { type: "pan", deltaX: 20, deltaY: -12 }
    );
    const resetState = reduceLayoutSettings(changedState, { type: "reset" });
    const resetViewer = reduceViewerInteraction(changedViewer, { type: "reset" });
    const resetSvg = createCanonicalSvg("ず", font, resetState.settings);
    const defaultSvg = createCanonicalSvg("ず", font, DEFAULT_LAYOUT_SETTINGS);

    expect(resetState.settings).toEqual(DEFAULT_LAYOUT_SETTINGS);
    expect(resetState.hasLayoutDraft).toBe(false);
    expect(resetState.hasAppearanceDraft).toBe(false);
    expect(resetState.draftResetVersion).toBe(1);
    expect(resetViewer).toMatchObject({ zoom: INITIAL_VIEWER_STATE.zoom, panX: 0, panY: 0, fitMode: false });
    expect(resetSvg).toEqual(defaultSvg);
    expect(resetSvg).toMatchObject({ status: "ready" });
    expect(hasResettableLayoutSettings(resetState)).toBe(false);
    expect(reduceLayoutSettings(resetState, { type: "reset" })).toBe(resetState);
    expect(reduceViewerInteraction(resetViewer, { type: "reset" })).toBe(resetViewer);
    expect(reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "reset" })).toBe(INITIAL_VIEWER_STATE);
  });
});
