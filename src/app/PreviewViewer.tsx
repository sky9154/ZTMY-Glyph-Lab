import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { motion } from "motion/react";

import {
  beginPointerDrag,
  calculateFitTransform,
  endPointerDrag,
  formatZoomDisplay,
  INPUT_ARROW_STEP,
  INITIAL_VIEWER_STATE,
  MAX_ZOOM,
  MIN_ZOOM,
  movePointerDrag,
  parseManualZoomDraft,
  readSvgSize,
  reduceViewerInteraction,
  stepInputArrowZoom,
  type Backdrop,
  type ViewerSize,
  type ViewerTransform,
  viewerBoundsLocalStrokeWidth,
  viewerSurfaceClassName,
  viewerTransformCss
} from "@app/viewer";


interface PreviewViewerProps {
  svg: string | null;
  orientation: "vertical" | "horizontal";
}

interface SvgStageProps {
  svg: string;
  documentSize: ViewerSize;
  transform: ViewerTransform;
  showBounds: boolean;
  orientation?: "vertical" | "horizontal";
}

export const SvgStage = ({ svg, documentSize, transform, showBounds, orientation = "vertical" }: SvgStageProps) => {
  return (
    <div
      className="svg-stage"
      data-testid="svg-stage"
      style={{
        width: documentSize.width,
        height: documentSize.height,
        marginLeft: -documentSize.width / 2,
        marginTop: -documentSize.height / 2,
        transform: viewerTransformCss(transform)
      }}
    >
      <motion.div
        key={orientation}
        className="canonical-svg"
        data-testid="canonical-svg"
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {showBounds && (
        <motion.div
          className="svg-bounds-overlay"
          aria-hidden="true"
          style={{ borderWidth: viewerBoundsLocalStrokeWidth(transform.zoom) + "px" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

export const PreviewViewer = ({ svg, orientation }: PreviewViewerProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ReturnType<typeof beginPointerDrag> | null>(null);
  const previousOrientation = useRef(orientation);
  const [interaction, dispatch] = useReducer(reduceViewerInteraction, INITIAL_VIEWER_STATE);
  const [isDragging, setIsDragging] = useState(false);
  const [backdrop, setBackdrop] = useState<Backdrop>("light");
  const [showGrid, setShowGrid] = useState(false);
  const [showBounds, setShowBounds] = useState(false);
  const [zoomDraft, setZoomDraft] = useState(String(INITIAL_VIEWER_STATE.zoom));
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const documentSize = useMemo(() => svg ? readSvgSize(svg) : null, [svg]);
  const { zoom, panX, panY, fitMode } = interaction;
  const displayedZoom = formatZoomDisplay(zoom, fitMode);
  const viewerMessage = svg ? "SVG viewBox is unavailable" : "LOAD ZTMY_MOJI-R.otf TO CONTINUE";

  const getFitTransform = useCallback(() => {
    if (!documentSize) {
      return null;
    }

    const bounds = viewportRef.current?.getBoundingClientRect();
    const width = bounds?.width || viewportSize.width;
    const height = bounds?.height || viewportSize.height;

    return calculateFitTransform(documentSize, { width, height });
  }, [documentSize, viewportSize]);

  const handleFit = useCallback(() => {
    const transform = getFitTransform();

    if (transform) {
      dispatch({ type: "fit", transform });
    }
  }, [getFitTransform]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const update = () => {
      const bounds = element.getBoundingClientRect();
      setViewportSize({ width: bounds.width, height: bounds.height });
    };

    update();

    const observer = new ResizeObserver(update);

    observer.observe(element);

    return () => {
      observer.disconnect();
    }
  }, []);

  useEffect(() => {
    if (!fitMode || !documentSize || !viewportSize.width || !viewportSize.height) {
      return;
    }

    const transform = getFitTransform();

    if (transform) {
      dispatch({ type: "fit-resize", transform });
    }
  }, [fitMode, documentSize, viewportSize, getFitTransform]);

  useEffect(() => {
    setZoomDraft(displayedZoom);
  }, [displayedZoom]);

  useEffect(() => {
    if (previousOrientation.current !== orientation) {
      previousOrientation.current = orientation;

      dispatch({ type: "orientation-change" });
    }
  }, [orientation]);

  const handleReset = () => dispatch({ type: "reset" });
  const handleZoomStep = (direction: -1 | 1) => dispatch({ type: "manual-zoom", direction });
  const handleInputArrow = (direction: -1 | 1) => {
    const nextZoom = stepInputArrowZoom(zoom, direction);
    dispatch({ type: "manual-zoom-to", zoom: nextZoom });
    setZoomDraft(formatZoomDisplay(nextZoom, false));
  };
  const handleZoomCommit = () => {
    const nextZoom = parseManualZoomDraft(zoomDraft);

    if (nextZoom === null) {
      setZoomDraft(displayedZoom);

      return;
    }

    if (fitMode && zoomDraft === displayedZoom) {
      return;
    }

    dispatch({ type: "manual-zoom-to", zoom: nextZoom });
    setZoomDraft(formatZoomDisplay(nextZoom, false));
  };

  const handleZoomDraftChange = (value: string) => {
    const nextZoom = parseManualZoomDraft(value);
    if (nextZoom === null) {
      setZoomDraft(value);

      return;
    }

    setZoomDraft(formatZoomDisplay(nextZoom, false));
    dispatch({ type: "manual-zoom-to", zoom: nextZoom });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const wasDragging = dragRef.current?.pointerId === event.pointerId;
    dragRef.current = endPointerDrag(dragRef.current, event.pointerId);

    if (wasDragging) {
      setIsDragging(false);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!svg || event.button !== 0) {
      return;
    }

    dragRef.current = beginPointerDrag(event.pointerId, event.clientX, event.clientY);
    setIsDragging(true);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      console.log("Ciallo～(∠・ω< )⌒★");
    }

    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const movement = movePointerDrag(drag, event.pointerId, event.clientX, event.clientY);

    if (!movement) {
      return;
    }

    dragRef.current = movement.drag;
    dispatch({ type: "pan", deltaX: movement.deltaX, deltaY: movement.deltaY });
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      handlePointerEnd(event);
    }
  };

  const handleZoomKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

      handleZoomCommit();

      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();

      handleInputArrow(event.key === "ArrowUp" ? 1 : -1);
    }
  };

  return (
    <motion.section
      className="preview-section"
      aria-labelledby="preview-heading"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: 0.05, ease: "easeOut" }}
    >
      <div className="preview-toolbar">
        <div className="preview-titleblock">
          <h2 id="preview-heading">06 / PREVIEW</h2>
          <p>VECTOR PLATE <span aria-hidden="true">·</span> FIELD 01</p>
        </div>
        <div className="viewer-controls" aria-label="Viewer controls" data-fit-mode={fitMode ? "true" : "false"}>
          <button type="button" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => handleZoomStep(-1)}>−</button>
          <div className="zoom-value-control">
            <label className="sr-only" htmlFor="viewer-zoom">Zoom percentage</label>
            <div className="zoom-input-control">
              <input
                id="viewer-zoom"
                className="zoom-input"
                aria-describedby="viewer-zoom-unit"
                type="number"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={INPUT_ARROW_STEP}
                inputMode="numeric"
                value={zoomDraft}
                onChange={(event) => handleZoomDraftChange(event.currentTarget.value)}
                onBlur={handleZoomCommit}
                onKeyDown={handleZoomKeyDown}
              />
              <span className="zoom-spinner" aria-hidden="false">
                <button type="button" aria-label="Increase zoom percentage" disabled={zoom >= MAX_ZOOM} onClick={() => handleInputArrow(1)}>▲</button>
                <button type="button" aria-label="Decrease zoom percentage" disabled={zoom <= MIN_ZOOM} onClick={() => handleInputArrow(-1)}>▼</button>
              </span>
            </div>
            <span id="viewer-zoom-unit">%</span>
          </div>
          <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => handleZoomStep(1)}>+</button>
          <button type="button" onClick={handleFit}>Fit</button>
          <button type="button" onClick={handleReset}>Reset</button>
        </div>
        <div className="viewer-backdrop-control">
          <label className="viewer-select-label" htmlFor="backdrop">Backdrop</label>
          <select id="backdrop" value={backdrop} onChange={(event) => setBackdrop(event.currentTarget.value as Backdrop)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <fieldset className="viewer-options">
          <legend>View options</legend>
          <label className="bounds-toggle">
            <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.currentTarget.checked)} />
            <span>Grid</span>
          </label>
          <label className="bounds-toggle">
            <input type="checkbox" checked={showBounds} onChange={(event) => setShowBounds(event.currentTarget.checked)} />
            <span>Show bounds</span>
          </label>
        </fieldset>
      </div>

      <div
        className={viewerSurfaceClassName(backdrop, showGrid, isDragging)}
        data-show-grid={showGrid ? "true" : "false"}
        data-show-bounds={showBounds ? "true" : "false"}
      >
        <div className="viewer-rulers" aria-hidden="true">
          <div className="viewer-ruler viewer-ruler--top" />
          <div className="viewer-ruler viewer-ruler--left" />
        </div>
        <div
          ref={viewportRef}
          className="viewer-canvas"
          aria-live="polite"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerLeave}
          onLostPointerCapture={handlePointerEnd}
        >
          <motion.div
            className="viewer-grid"
            aria-hidden="true"
            initial={false}
            animate={{ opacity: showGrid ? 1 : 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          />
          <div className="plate-annotation" aria-hidden="true">
            <span>PLATE / 001</span>
            <span>FORM STUDY&nbsp;&nbsp;·&nbsp;&nbsp;1:1</span>
          </div>
          {svg && documentSize
            ? <SvgStage
              svg={svg}
              documentSize={documentSize}
              transform={{ zoom, panX, panY }}
              showBounds={showBounds}
              orientation={orientation}
            />
            : <p>{viewerMessage}</p>}
        </div>
      </div>

      <div className="viewport-meta" aria-label="Preview information">
        <span><strong>{orientation === "vertical" ? "VERTICAL" : "HORIZONTAL"}</strong><i aria-hidden="true"> / </i>ZOOM {displayedZoom}%</span>
        <span>VIEWBOX {documentSize ? documentSize.width + " × " + documentSize.height : "—"}</span>
        <span>{svg ? "FONT READY" : "FONT REQUIRED"}</span>
      </div>
      <span className="sr-only">{orientation === "vertical" ? "Vertical" : "Horizontal"} SVG preview. Drag to pan.</span>
    </motion.section>
  );
}
