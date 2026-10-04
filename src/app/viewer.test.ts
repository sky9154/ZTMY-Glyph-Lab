import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { FontAdapter, GlyphData } from "@core/font/font-adapter";
import { createHorizontalLayout } from "@core/svg/horizontal-layout";
import { serializeHorizontalSvg } from "@core/svg/horizontal-svg";
import { createVerticalLayout } from "@core/svg/vertical-layout";
import { PreviewViewer, SvgStage } from "@app/PreviewViewer";
import {
  beginPointerDrag,
  applyViewerWheelZoom,
  BUTTON_ZOOM_STEP,
  calculateFitTransform,
  calculateFitZoom,
  calculatePointerZoomTransform,
  calculateWheelZoom,
  clampManualZoom,
  endPointerDrag,
  formatZoomDisplay,
  getViewerKeyboardAction,
  INPUT_ARROW_STEP,
  INITIAL_VIEWER_STATE,
  MAX_ZOOM,
  MIN_ZOOM,
  movePointerDrag,
  parseManualZoomDraft,
  readSvgSize,
  roundZoomTo10,
  roundZoomTo5,
  reduceViewerInteraction,
  stepButtonZoom,
  stepInputArrowZoom,
  shouldCaptureWheelZoom,
  VIEWER_WHEEL_LISTENER_OPTIONS,
  viewerBoundsLocalStrokeWidth,
  viewerSurfaceClassName,
  viewerTransformCss
} from "@app/viewer";


const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200"><g fill="#000000"><path d="M0 0" /></g></svg>';
const testGlyph: GlyphData = { glyphId: 1, pathData: "M0 0L10 10Z", bounds: { xMin: 0, yMin: 0, xMax: 10, yMax: 10 }, isEmpty: false };
const testFont: FontAdapter = { unitsPerEm: 1000, familyName: "test", fullName: "test", getGlyph: () => testGlyph };

describe("viewer geometry", () => {
  it("clamps Manual Zoom to 1%-400% without normalizing typed values", () => {
    expect(MIN_ZOOM).toBe(1);
    expect(MAX_ZOOM).toBe(400);
    expect(INPUT_ARROW_STEP).toBe(5);
    expect(BUTTON_ZOOM_STEP).toBe(10);
    expect(clampManualZoom(0)).toBe(1);
    expect(clampManualZoom(-20)).toBe(1);
    expect(clampManualZoom(1)).toBe(1);
    expect(clampManualZoom(500)).toBe(400);
    expect(clampManualZoom(Number.NaN)).toBe(1);
    const manualValues = [1, 7, 29, 37, 83, 117, 399];
    expect(manualValues.map((value) => parseManualZoomDraft(String(value)))).toEqual(manualValues);
    expect(parseManualZoomDraft("0")).toBe(1);
    expect(parseManualZoomDraft("-20")).toBe(1);
    expect(parseManualZoomDraft("500")).toBe(400);
    expect(parseManualZoomDraft("29.5")).toBe(29.5);
    expect(parseManualZoomDraft("")).toBeNull();
    expect(parseManualZoomDraft("  ")).toBeNull();
    expect(parseManualZoomDraft("-")).toBeNull();
    expect(parseManualZoomDraft("29")).toBe(29);
    expect(parseManualZoomDraft("Infinity")).toBeNull();
  });

  it("normalizes numeric input arrows to 5% steps and clamps at 1%", () => {
    expect([7, 11, 13].map((zoom) => stepInputArrowZoom(zoom, 1))).toEqual([10, 15, 20]);
    expect([18, 16, 7, 1].map((zoom) => stepInputArrowZoom(zoom, -1))).toEqual([15, 10, 1, 1]);
    expect(roundZoomTo5(0)).toBe(1);
    expect(roundZoomTo5(2)).toBe(1);
    expect(roundZoomTo5(3)).toBe(5);
    expect(roundZoomTo5(8)).toBe(10);
    expect([11, 12, 13, 14, 15, 16, 17, 18, 19].map(roundZoomTo5)).toEqual([
      10, 10, 15, 15, 15, 15, 15, 20, 20
    ]);

    const fitted = reduceViewerInteraction(INITIAL_VIEWER_STATE, {
      type: "fit",
      transform: { zoom: 16, panX: 0, panY: 0 }
    });
    const afterArrow = reduceViewerInteraction(fitted, {
      type: "manual-zoom-to",
      zoom: stepInputArrowZoom(fitted.zoom, 1)
    });
    expect(afterArrow).toMatchObject({ zoom: 20, fitMode: false });
  });

  it("normalizes external zoom buttons to 10% steps and clamps at 1%", () => {
    expect([7, 1, 13, 16].map((zoom) => stepButtonZoom(zoom, 1))).toEqual([20, 10, 20, 30]);
    expect([37, 31, 14, 1].map((zoom) => stepButtonZoom(zoom, -1))).toEqual([30, 20, 1, 1]);
    expect(roundZoomTo10(4)).toBe(1);
    expect(roundZoomTo10(5)).toBe(10);
    expect([11, 14, 15, 17, 21, 25, 29].map(roundZoomTo10)).toEqual([10, 10, 20, 20, 20, 30, 30]);
  });

  it("fits a 15-cell tall document below the manual zoom minimum without changing its dimensions", () => {
    const size = { width: 1000, height: 15560 };
    const fit = calculateFitTransform(size, { width: 600, height: 500 });

    expect(fit.zoom).toBeGreaterThan(0);
    expect(fit.zoom).toBeLessThan(25);
    expect(size).toEqual({ width: 1000, height: 15560 });
  });

  it("clamps Fit to 1%-400% without 5% or 10% normalization", () => {
    expect(calculateFitZoom({ width: 1000, height: 1000 }, { width: 228, height: 228 })).toBeCloseTo(16.4);
    expect(calculateFitZoom({ width: 1000, height: 1000 }, { width: 68, height: 68 })).toBe(1);
    expect(calculateFitZoom({ width: 1, height: 1 }, { width: 10000, height: 10000 })).toBe(400);
    expect(reduceViewerInteraction(INITIAL_VIEWER_STATE, {
      type: "fit",
      transform: { zoom: 0.4, panX: 0, panY: 0 }
    })).toMatchObject({ zoom: 1, fitMode: true });
  });

  it("rounds Fit display values without changing the actual Fit zoom", () => {
    const fitValues = [16.4, 16.49, 16.5, 16.6];

    expect(fitValues.map((zoom) => formatZoomDisplay(zoom, true))).toEqual(["16", "16", "17", "17"]);
    expect(fitValues.map((zoom) => formatZoomDisplay(zoom, false))).toEqual(["16.4", "16.49", "16.5", "16.6"]);
    expect(fitValues).toEqual([16.4, 16.49, 16.5, 16.6]);
    const minFit = calculateFitZoom({ width: 1000, height: 1000 }, { width: 68, height: 68 });
    expect(formatZoomDisplay(minFit, true)).toBe("1");
  });

  it("fits the whole document while preserving aspect ratio and respecting inner padding", () => {
    const size = readSvgSize(svg)!;
    const fit = calculateFitZoom(size, { width: 600, height: 500 });
    expect(fit).toBeCloseTo(36.33, 2);
    const landscapeFit = calculateFitZoom({ width: 2000, height: 1000 }, { width: 600, height: 500 });
    expect(landscapeFit).toBeCloseTo(26.8, 1);
    expect(1000 * fit / 100).toBeLessThanOrEqual(600 - 64);
    expect(1200 * fit / 100).toBeLessThanOrEqual(500 - 64);
    expect(2000 * landscapeFit / 100).toBeLessThanOrEqual(600 - 64);
    expect(1000 * landscapeFit / 100).toBeLessThanOrEqual(500 - 64);
  });

  it("fits a 4600 × 1600 document below 25% and clears pan to center it", () => {
    const transform = calculateFitTransform({ width: 4600, height: 1600 }, { width: 800, height: 500 });
    expect(transform.zoom).toBeLessThan(25);
    expect(transform.zoom).toBeCloseTo(16, 5);
    expect(4600 * transform.zoom / 100).toBeLessThanOrEqual(800 - 64);
    expect(1600 * transform.zoom / 100).toBeLessThanOrEqual(500 - 64);
    expect(transform).toMatchObject({ panX: 0, panY: 0 });
  });

  it("fits vertical and horizontal SVG bounds within a first viewport", () => {
    const viewport = { width: 320, height: 360 };
    const sizes = [{ width: 1000, height: 15000 }, { width: 15000, height: 1000 }];

    for (const size of sizes) {
      const transform = calculateFitTransform(size, viewport);
      expect(size.width * transform.zoom / 100).toBeLessThanOrEqual(viewport.width - 64);
      expect(size.height * transform.zoom / 100).toBeLessThanOrEqual(viewport.height - 64);
      expect(transform).toMatchObject({ panX: 0, panY: 0 });
    }
  });

  it("keeps vertical and horizontal glyph bounds inside the viewBox without overlap", () => {
    const options = { letterSpacing: 160, padding: 20 };
    const text = "ずとまよ";
    const layouts = [
      { orientation: "vertical", layout: createVerticalLayout(text, testFont, options)! },
      { orientation: "horizontal", layout: createHorizontalLayout(text, testFont, options)! }
    ];

    for (const { orientation, layout } of layouts) {
      const boxes = layout.glyphs.map(({ glyph, translateX, translateY }) => ({
        left: translateX! + glyph!.bounds!.xMin,
        right: translateX! + glyph!.bounds!.xMax,
        top: translateY! - glyph!.bounds!.yMax,
        bottom: translateY! - glyph!.bounds!.yMin
      }));

      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(layout.width);
        expect(box.bottom).toBeLessThanOrEqual(layout.height);
      }

      for (let index = 1; index < boxes.length; index += 1) {
        expect(orientation === "vertical" ? boxes[index - 1]!.bottom : boxes[index - 1]!.right)
          .toBeLessThanOrEqual(orientation === "vertical" ? boxes[index]!.top : boxes[index]!.left);
      }
    }
  });

  it("scales from wheel deltas without large trackpad jumps and clamps limits", () => {
    expect(calculateWheelZoom(100, -100, 0, 600).zoom).toBe(110);
    expect(calculateWheelZoom(100, 100, 0, 600).zoom).toBe(91);
    expect(calculateWheelZoom(100, -1, 1, 600).zoom).toBe(102);
    expect(calculateWheelZoom(100, -0.1, 2, 600).zoom).toBe(106);
    expect(calculateWheelZoom(100, -1000, 0, 600).zoom).toBe(110);
    expect(calculateWheelZoom(400, -100, 0, 600).zoom).toBe(400);
    expect(calculateWheelZoom(1, 100, 0, 600).zoom).toBe(1);
    expect(calculateWheelZoom(100, Number.NaN, 0, 600).zoom).toBe(100);
    expect(calculateWheelZoom(32.4, -100, 0, 600).zoom).toBe(36);
  });

  it("keeps sub-percent trackpad deltas until the rounded zoom changes", () => {
    let zoom = 100;
    let remainder = 0;

    for (let index = 0; index < 5; index += 1) {
      const next = calculateWheelZoom(zoom, -1, 0, 600, remainder);
      zoom = next.zoom;
      remainder = next.remainder;
    }

    expect(zoom).toBe(100);

    const next = calculateWheelZoom(zoom, -1, 0, 600, remainder);

    expect(next.zoom).toBe(101);
    expect(next.remainder).toBeLessThan(0);
  });

  it("keeps the point under the pointer fixed while zooming", () => {
    expect(calculatePointerZoomTransform({ zoom: 100, panX: 0, panY: 0 }, 200, 80, 20)).toEqual({
      zoom: 200,
      panX: -80,
      panY: -20
    });
    expect(calculatePointerZoomTransform({ zoom: 100, panX: 24, panY: -18 }, 50, 80, 20)).toEqual({
      zoom: 50,
      panX: 52,
      panY: 1
    });
  });

  it("fits updated document dimensions so larger padding remains in view", () => {
    const beforeSvg = serializeHorizontalSvg(createHorizontalLayout("ずと", testFont, { letterSpacing: 100, padding: 10 })!);
    const afterSvg = serializeHorizontalSvg(createHorizontalLayout("ずと", testFont, { letterSpacing: 100, padding: 40 })!);
    const beforePadding = readSvgSize(beforeSvg)!;
    const afterPadding = readSvgSize(afterSvg)!;
    const beforeFit = calculateFitZoom(beforePadding, { width: 500, height: 300 });
    const afterTransform = calculateFitTransform(afterPadding, { width: 500, height: 300 });
    const afterFit = afterTransform.zoom;
    expect(afterPadding).not.toEqual(beforePadding);
    expect(beforePadding).toEqual({ width: 2120, height: 1020 });
    expect(afterPadding).toEqual({ width: 2180, height: 1080 });
    expect(afterFit).toBeLessThan(beforeFit);
    expect(afterPadding.width * afterFit / 100).toBeLessThanOrEqual(500 - 64);
    expect(afterPadding.height * afterFit / 100).toBeLessThanOrEqual(300 - 64);
    expect(afterTransform).toMatchObject({ panX: 0, panY: 0 });
    calculateFitTransform(afterPadding, { width: 500, height: 300 });
    expect(afterSvg).toContain('viewBox="0 0 2180 1080"');
    expect(afterSvg).not.toBe(beforeSvg);
  });

  it("reads dimensions from the canonical viewBox without rewriting the SVG", () => {
    expect(readSvgSize(svg)).toEqual({ width: 1000, height: 1200 });
    const originalCanonical = svg;
    calculateFitTransform(readSvgSize(svg)!, { width: 320, height: 240 });
    expect(svg).toBe(originalCanonical);
    expect(renderToStaticMarkup(createElement(PreviewViewer, { svg, orientation: "vertical" }))).toContain(originalCanonical);
  });
});

describe("viewer interaction state", () => {
  it("keeps Fit precise below 25%, then normalizes the manual button to a 10% step", () => {
    const fit = calculateFitTransform({ width: 4600, height: 1600 }, { width: 800, height: 500 });
    const fitted = reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "fit", transform: fit });
    expect(fitted).toMatchObject({ zoom: 16, panX: 0, panY: 0, fitMode: true });

    const at30 = reduceViewerInteraction(fitted, { type: "manual-zoom", direction: 1 });
    expect(at30).toMatchObject({ zoom: 30, fitMode: false });
    const at40 = reduceViewerInteraction(at30, { type: "manual-zoom", direction: 1 });
    const at50 = reduceViewerInteraction(at40, { type: "manual-zoom", direction: 1 });
    const backTo40 = reduceViewerInteraction(at50, { type: "manual-zoom", direction: -1 });
    const backTo30 = reduceViewerInteraction(backTo40, { type: "manual-zoom", direction: -1 });

    expect([at40.zoom, at50.zoom, backTo40.zoom, backTo30.zoom]).toEqual([40, 50, 40, 30]);
    expect(backTo30.fitMode).toBe(false);
  });

  it("uses actual Fit precision when leaving Fit with an input arrow or external button", () => {
    const fitted = reduceViewerInteraction(INITIAL_VIEWER_STATE, {
      type: "fit",
      transform: { zoom: 16.4, panX: 0, panY: 0 }
    });
    const afterArrow = reduceViewerInteraction(fitted, {
      type: "manual-zoom-to",
      zoom: stepInputArrowZoom(fitted.zoom, 1)
    });
    const afterButton = reduceViewerInteraction(fitted, { type: "manual-zoom", direction: 1 });

    expect(formatZoomDisplay(fitted.zoom, fitted.fitMode)).toBe("16");
    expect(afterArrow).toMatchObject({ zoom: 20, fitMode: false });
    expect(afterButton).toMatchObject({ zoom: 30, fitMode: false });
  });

  it("does not reapply Fit after manual zoom and resets zoom, fit mode, and pan", () => {
    const fitted = reduceViewerInteraction(INITIAL_VIEWER_STATE, {
      type: "fit",
      transform: { zoom: 16, panX: 0, panY: 0 }
    });
    const manual = reduceViewerInteraction(fitted, { type: "manual-zoom", direction: 1 });
    const afterResize = reduceViewerInteraction(manual, {
      type: "fit-resize",
      transform: { zoom: 12, panX: 0, panY: 0 }
    });
    expect(afterResize).toBe(manual);

    const panned = reduceViewerInteraction(afterResize, { type: "pan", deltaX: 24, deltaY: -18 });
    expect(panned).toMatchObject({ panX: 24, panY: -18 });
    expect(reduceViewerInteraction(panned, { type: "reset" })).toMatchObject({
      zoom: 100,
      panX: 0,
      panY: 0,
      fitMode: false,
      initialFitPending: false
    });
  });

  it("automatically fits the first available SVG and preserves a manual zoom", () => {
    const firstFit = reduceViewerInteraction(INITIAL_VIEWER_STATE, {
      type: "initial-fit",
      transform: { zoom: 24, panX: 0, panY: 0 }
    });
    const manual = reduceViewerInteraction(firstFit, { type: "manual-zoom", direction: 1 });
    const laterInitialFit = reduceViewerInteraction(manual, {
      type: "initial-fit",
      transform: { zoom: 18, panX: 0, panY: 0 }
    });

    expect(firstFit).toMatchObject({ zoom: 24, fitMode: true, initialFitPending: false });
    expect(manual).toMatchObject({ zoom: 30, fitMode: false });
    expect(laterInitialFit).toBe(manual);
  });

  it("accepts direct arbitrary manual zoom values and clamps input limits", () => {
    const values = [1, 7, 29, 37, 83, 117, 399];
    const entered = values.map((zoom) => reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "manual-zoom-to", zoom }));
    expect(entered.map((state) => state.zoom)).toEqual(values);
    expect(entered.every((state) => !state.fitMode)).toBe(true);
    expect(reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "manual-zoom-to", zoom: 500 }).zoom).toBe(400);
    expect(reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "manual-zoom-to", zoom: 0 }).zoom).toBe(1);
    expect(reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "manual-zoom-to", zoom: -20 }).zoom).toBe(1);
    expect(reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "manual-zoom-to", zoom: Number.NaN })).toBe(INITIAL_VIEWER_STATE);
  });

  it("keeps the 1% minimum finite and can zoom in from the minimum", () => {
    const atMinimum = reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "manual-zoom-to", zoom: 0 });
    const zoomedIn = reduceViewerInteraction(atMinimum, { type: "manual-zoom", direction: 1 });

    expect(atMinimum).toMatchObject({ zoom: 1, panX: 0, panY: 0, fitMode: false });
    expect(viewerTransformCss(atMinimum)).toBe("translate(0px, 0px) scale(0.01)");
    expect(viewerTransformCss(atMinimum)).not.toMatch(/NaN|Infinity/);
    expect(zoomedIn).toMatchObject({ zoom: 10, fitMode: false });
  });

  it("keeps the transformed document bound at 2 screen pixels across Fit and manual zoom", () => {
    for (const zoom of [2.8, 10, 100, 400]) {
      expect(viewerBoundsLocalStrokeWidth(zoom) * zoom / 100).toBeCloseTo(2, 5);
    }
    expect(viewerBoundsLocalStrokeWidth(0)).toBe(0);
    expect(viewerBoundsLocalStrokeWidth(Number.NaN)).toBe(0);
  });

  it("leaves Fit mode when a direct value follows a sub-25% Fit result", () => {
    const fitted = reduceViewerInteraction(INITIAL_VIEWER_STATE, {
      type: "fit",
      transform: { zoom: 16, panX: 0, panY: 0 }
    });
    const manual = reduceViewerInteraction(fitted, { type: "manual-zoom-to", zoom: 100 });

    expect(fitted).toMatchObject({ zoom: 16, fitMode: true });
    expect(manual).toMatchObject({ zoom: 100, fitMode: false });
  });

  it("keeps manual zoom and pan after orientation or SVG size updates", () => {
    const fitted = reduceViewerInteraction(INITIAL_VIEWER_STATE, {
      type: "initial-fit",
      transform: { zoom: 24, panX: 0, panY: 0 }
    });
    const manualZoom = reduceViewerInteraction(fitted, { type: "manual-zoom", direction: 1 });
    const manualView = reduceViewerInteraction(manualZoom, { type: "pan", deltaX: 40, deltaY: 30 });
    const afterOrientation = reduceViewerInteraction(manualView, { type: "orientation-change" });
    const afterSvgUpdate = reduceViewerInteraction(afterOrientation, {
      type: "fit-resize",
      transform: { zoom: 18, panX: 0, panY: 0 }
    });

    expect(manualView).toMatchObject({ zoom: 30, panX: 40, panY: 30, fitMode: false });
    expect(afterOrientation).toBe(manualView);
    expect(afterSvgUpdate).toBe(manualView);
  });

  it("keeps a fitted view centered when orientation changes", () => {
    const fitted = reduceViewerInteraction(INITIAL_VIEWER_STATE, {
      type: "initial-fit",
      transform: { zoom: 24, panX: 0, panY: 0 }
    });

    expect(reduceViewerInteraction(fitted, { type: "orientation-change" })).toMatchObject(fitted);
  });

  it("uses non-passive wheel zoom only for unmodified, cancelable events", () => {
    expect(VIEWER_WHEEL_LISTENER_OPTIONS).toEqual({ passive: false });
    expect(shouldCaptureWheelZoom({ ctrlKey: false, metaKey: false, deltaY: 20, cancelable: true })).toBe(true);
    expect(shouldCaptureWheelZoom({ ctrlKey: true, metaKey: false, deltaY: 20, cancelable: true })).toBe(false);
    expect(shouldCaptureWheelZoom({ ctrlKey: false, metaKey: true, deltaY: 20, cancelable: true })).toBe(false);
    expect(shouldCaptureWheelZoom({ ctrlKey: false, metaKey: false, deltaY: 0, cancelable: true })).toBe(false);
    expect(shouldCaptureWheelZoom({ ctrlKey: false, metaKey: false, deltaY: 20, cancelable: false })).toBe(false);
  });

  it("cancels canvas wheel scrolling and dispatches an anchored manual zoom", () => {
    const actions: Parameters<typeof reduceViewerInteraction>[1][] = [];
    let prevented = false;
    const event = {
      ctrlKey: false,
      metaKey: false,
      deltaY: 100,
      deltaMode: 0,
      cancelable: true,
      clientX: 150,
      clientY: 50,
      preventDefault: () => { prevented = true; }
    };
    const result = applyViewerWheelZoom(event, { zoom: 100, panX: 0, panY: 0 }, {
      left: 0,
      top: 0,
      width: 200,
      height: 100
    }, (action) => actions.push(action));

    expect(result.handled).toBe(true);
    expect(result.remainder).toBeCloseTo(100 / 1.1 - 91);
    expect(prevented).toBe(true);
    expect(actions).toEqual([{
      type: "manual-zoom-to-point",
      transform: { zoom: 91, panX: 4.5, panY: 0 }
    }]);
    expect(reduceViewerInteraction(INITIAL_VIEWER_STATE, actions[0])).toMatchObject({ fitMode: false, initialFitPending: false });

    prevented = false;
    expect(applyViewerWheelZoom({ ...event, ctrlKey: true }, { zoom: 100, panX: 0, panY: 0 }, {
      left: 0,
      top: 0,
      width: 200,
      height: 100
    }, () => { }).handled).toBe(false);
    expect(prevented).toBe(false);
  });

  it("maps preview keyboard input to pan and zoom actions", () => {
    expect(getViewerKeyboardAction("ArrowLeft")).toEqual({ type: "pan", deltaX: 20, deltaY: 0 });
    expect(getViewerKeyboardAction("ArrowRight", true)).toEqual({ type: "pan", deltaX: -44, deltaY: 0 });
    expect(getViewerKeyboardAction("ArrowUp")).toEqual({ type: "pan", deltaX: 0, deltaY: 20 });
    expect(getViewerKeyboardAction("ArrowDown", true)).toEqual({ type: "pan", deltaX: 0, deltaY: -44 });
    expect(getViewerKeyboardAction("+")).toEqual({ type: "manual-zoom", direction: 1 });
    expect(getViewerKeyboardAction("=")).toEqual({ type: "manual-zoom", direction: 1 });
    expect(getViewerKeyboardAction("-")).toEqual({ type: "manual-zoom", direction: -1 });
    expect(getViewerKeyboardAction("Tab")).toBeNull();
  });

  it("updates pan only for finite pointer deltas and leaves canonical data outside viewer state", () => {
    const originalCanonical = svg;
    const moved = reduceViewerInteraction(INITIAL_VIEWER_STATE, { type: "pan", deltaX: 12, deltaY: 8 });
    expect(reduceViewerInteraction(moved, { type: "pan", deltaX: Number.POSITIVE_INFINITY, deltaY: 2 })).toBe(moved);
    const hugePan = { ...INITIAL_VIEWER_STATE, panX: Number.MAX_VALUE };
    expect(reduceViewerInteraction(hugePan, { type: "pan", deltaX: Number.MAX_VALUE, deltaY: 0 })).toBe(hugePan);
    expect(svg).toBe(originalCanonical);
  });

  it("tracks pointer drag deltas and stops on matching pointer release, cancel, or capture loss", () => {
    const start = beginPointerDrag(7, 10, 20);
    const movement = movePointerDrag(start, 7, 34, 12);
    expect(movement).toMatchObject({ deltaX: 24, deltaY: -8, drag: { pointerId: 7, x: 34, y: 12 } });
    expect(movePointerDrag(start, 8, 50, 50)).toBeNull();
    expect(movePointerDrag(start, 7, Number.NaN, 30)).toBeNull();
    expect(endPointerDrag(start, 8)).toBe(start);
    expect(endPointerDrag(start, 7)).toBeNull();
    expect(endPointerDrag(movement?.drag ?? null, 7)).toBeNull();
  });

  it("keeps Grid independent from Light and Dark backdrop classes", () => {
    expect(viewerSurfaceClassName("light", false)).toBe("preview-viewer preview-viewer--light");
    expect(viewerSurfaceClassName("light", true)).toContain("preview-viewer--grid");
    expect(viewerSurfaceClassName("dark", false)).toBe("preview-viewer preview-viewer--dark");
    expect(viewerSurfaceClassName("dark", true)).toContain("preview-viewer--dark preview-viewer--grid");
  });
});

describe("viewer and canonical SVG boundary", () => {
  it("keeps one optional document bound inside the SVG stage transform without changing canonical SVG", () => {
    const transform = { zoom: 29, panX: 24, panY: -18 };
    const withBounds = renderToStaticMarkup(createElement(SvgStage, {
      svg,
      documentSize: { width: 1000, height: 1200 },
      transform,
      showBounds: true
    }));
    const withoutBounds = renderToStaticMarkup(createElement(SvgStage, {
      svg,
      documentSize: { width: 1000, height: 1200 },
      transform,
      showBounds: false
    }));

    expect(withBounds.match(/class="svg-stage"/g)).toHaveLength(1);
    expect(withBounds.match(/class="svg-bounds-overlay"/g)).toHaveLength(1);
    expect(withBounds.indexOf('class="svg-stage"')).toBeLessThan(withBounds.indexOf('class="canonical-svg"'));
    expect(withBounds.indexOf('class="canonical-svg"')).toBeLessThan(withBounds.indexOf('class="svg-bounds-overlay"'));
    expect(withBounds).toContain("scale(0.29)");
    expect(withBounds).toContain(svg);
    expect(withoutBounds).not.toContain("svg-bounds-overlay");
    expect(withoutBounds).toContain(svg);
    expect(viewerTransformCss(transform)).toBe("translate(24px, -18px) scale(0.29)");
  });

  it("keeps viewer overlays and controls outside the exact canonical SVG source", () => {
    const markup = renderToStaticMarkup(createElement(PreviewViewer, { svg, orientation: "vertical" }));
    const toolbarMarkup = markup.split('<div class="preview-toolbar">')[1]?.split('<div class="preview-viewer')[0] ?? "";
    expect(markup).toContain('aria-label="Zoom out"');
    expect(markup).toContain('aria-label="Zoom level" aria-valuetext="100 percent"');
    expect(markup).toContain('class="viewer-group-label" aria-hidden="true">ZOOM</span>');
    expect(markup).toContain('class="viewer-group-label" aria-hidden="true">VIEW</span>');
    expect(markup).toContain('class="zoom-control-set"');
    expect(markup).toContain('class="viewer-actions"');
    expect(toolbarMarkup).not.toContain("%");
    expect(markup).not.toContain("viewer-zoom-unit");
    expect(markup).not.toContain("zoom-spinner");
    expect(markup).toContain('class="viewer-canvas"');
    expect(markup).toContain('role="region" aria-label="SVG preview canvas" aria-describedby="viewer-keyboard-help" tabindex="0"');
    expect(markup).toContain("With the preview focused, use the arrow keys to pan");
    expect(markup).toContain('class="viewer-ruler viewer-ruler--top"');
    expect(markup).toContain('class="viewer-ruler viewer-ruler--left"');
    expect(markup).toContain('class="viewer-grid"');
    expect(markup).toContain('class="preview-grid-frame" aria-hidden="true"');
    expect(markup.indexOf('class="viewer-grid"')).toBeLessThan(markup.indexOf('class="preview-grid-frame"'));
    expect(markup.indexOf('class="preview-grid-frame"')).toBeLessThan(markup.indexOf('class="svg-stage"'));
    expect(markup).toContain('data-show-bounds="false"');
    expect(markup).toContain("Show bounds");
    expect(markup).toContain('data-show-grid="true"');
    expect(markup).toContain('aria-haspopup="listbox" aria-expanded="false" aria-controls="backdrop-listbox"');
    expect(markup).toContain('id="backdrop-option-light" type="button" role="option" aria-selected="true"');
    expect(markup).toContain('id="backdrop-option-dark" type="button" role="option" aria-selected="false"');
    expect(markup).not.toContain("<select");
    expect(markup).toContain(">Grid</span>");
    expect(markup).not.toContain("svg-bounds-overlay");
    expect(markup).toContain(svg);
  });

  it("does not create a second preview SVG when unavailable", () => {
    const markup = renderToStaticMarkup(createElement(PreviewViewer, { svg: null, orientation: "horizontal" }));
    expect(markup).not.toContain("<svg");
    expect(markup).toContain("Load the ZTMY_MOJI-R OTF to preview SVG.");
  });

  it("renders an explicit preview error message when SVG generation is unavailable", () => {
    const markup = renderToStaticMarkup(createElement(PreviewViewer, {
      svg: null,
      orientation: "vertical",
      emptyStateMessage: "SVG generation failed. See the browser console for details."
    }));

    expect(markup).toContain("SVG generation failed. See the browser console for details.");
    expect(markup).not.toContain("Load the ZTMY_MOJI-R OTF to preview SVG.");
  });
});
