import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import {
  beginPointerDrag,
  applyViewerWheelZoom,
  calculateFitTransform,
  endPointerDrag,
  formatZoomDisplay,
  getViewerKeyboardAction,
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
  VIEWER_WHEEL_LISTENER_OPTIONS,
  viewerSurfaceClassName,
  viewerTransformCss
} from "@app/viewer";


interface PreviewViewerProps {
  svg: string | null;
  orientation: "vertical" | "horizontal";
  emptyStateMessage?: string;
  canResetSettings?: boolean;
  onResetSettings?: () => void;
}

interface SvgStageProps {
  svg: string;
  documentSize: ViewerSize;
  transform: ViewerTransform;
  showBounds: boolean;
  orientation?: "vertical" | "horizontal";
}

export const SvgStage = ({ svg, documentSize, transform, showBounds }: SvgStageProps) => {
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
      <div
        className="canonical-svg"
        data-testid="canonical-svg"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {showBounds && (
        <div
          className="svg-bounds-overlay"
          aria-hidden="true"
          style={{ borderWidth: viewerBoundsLocalStrokeWidth(transform.zoom) + "px" }}
        />
      )}
    </div>
  );
};

export const PreviewViewer = ({
  svg,
  orientation,
  emptyStateMessage = "Load the ZTMY_MOJI-R OTF to preview SVG.",
  canResetSettings = false,
  onResetSettings = () => { }
}: PreviewViewerProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const backdropControlRef = useRef<HTMLDivElement>(null);
  const backdropTriggerRef = useRef<HTMLButtonElement>(null);
  const backdropOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dragRef = useRef<ReturnType<typeof beginPointerDrag> | null>(null);
  const wheelZoomRemainder = useRef(0);
  const previousOrientation = useRef(orientation);
  const [interaction, dispatch] = useReducer(reduceViewerInteraction, INITIAL_VIEWER_STATE);
  const [isDragging, setIsDragging] = useState(false);
  const [backdrop, setBackdrop] = useState<Backdrop>("light");
  const [isBackdropOpen, setIsBackdropOpen] = useState(false);
  const [activeBackdropIndex, setActiveBackdropIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showBounds, setShowBounds] = useState(false);
  const [zoomDraft, setZoomDraft] = useState(String(INITIAL_VIEWER_STATE.zoom));
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const documentSize = useMemo(() => svg ? readSvgSize(svg) : null, [svg]);
  const { zoom, panX, panY, fitMode } = interaction;
  const displayedZoom = formatZoomDisplay(zoom, fitMode);
  const zoomValueText = `${parseManualZoomDraft(zoomDraft) ?? displayedZoom} percent`;
  const hasViewToReset = zoom !== INITIAL_VIEWER_STATE.zoom
    || panX !== INITIAL_VIEWER_STATE.panX
    || panY !== INITIAL_VIEWER_STATE.panY
    || fitMode !== INITIAL_VIEWER_STATE.fitMode
    || zoomDraft !== displayedZoom;
  const viewerMessage = svg ? "SVG viewBox is unavailable" : emptyStateMessage;
  const backdropOptions: Backdrop[] = ["light", "dark"];
  const selectedBackdropIndex = backdropOptions.indexOf(backdrop);

  useEffect(() => {
    if (!isBackdropOpen) {
      return;
    }

    backdropOptionRefs.current[activeBackdropIndex]?.focus();
  }, [activeBackdropIndex, isBackdropOpen]);

  useEffect(() => {
    if (!isBackdropOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!backdropControlRef.current?.contains(event.target as Node)) {
        setIsBackdropOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);

    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isBackdropOpen]);

  const openBackdropMenu = (index = selectedBackdropIndex) => {
    setActiveBackdropIndex(index);
    setIsBackdropOpen(true);
  };

  const closeBackdropMenu = (restoreFocus = false) => {
    setIsBackdropOpen(false);

    if (restoreFocus) {
      backdropTriggerRef.current?.focus();
    }
  };

  const handleBackdropTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    openBackdropMenu(selectedBackdropIndex);
  };

  const handleBackdropOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;

    if (event.key === "ArrowDown") {
      nextIndex = (index + 1) % backdropOptions.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = (index + backdropOptions.length - 1) % backdropOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = backdropOptions.length - 1;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setBackdrop(backdropOptions[index]);
      closeBackdropMenu(true);
      return;
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeBackdropMenu(true);
      return;
    } else if (event.key === "Tab") {
      closeBackdropMenu();
      return;
    } else {
      return;
    }

    event.preventDefault();
    setActiveBackdropIndex(nextIndex);
  };

  const getFitTransform = useCallback(() => {
    if (!documentSize) {
      return null;
    }

    const bounds = viewportRef.current?.getBoundingClientRect();
    const width = bounds?.width || viewportSize.width;
    const height = bounds?.height || viewportSize.height;

    return width && height ? calculateFitTransform(documentSize, { width, height }) : null;
  }, [documentSize, viewportSize]);

  const handleFit = useCallback(() => {
    const transform = getFitTransform();

    if (transform) {
      wheelZoomRemainder.current = 0;
      dispatch({ type: "fit", transform });
    }
  }, [getFitTransform]);

  useLayoutEffect(() => {
    const transform = getFitTransform();

    if (transform) {
      wheelZoomRemainder.current = 0;
      dispatch({ type: "initial-fit", transform });
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
    };
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
      wheelZoomRemainder.current = 0;

      dispatch({ type: "orientation-change" });
    }
  }, [orientation]);

  useEffect(() => {
    const element = viewportRef.current;

    if (!element || !svg || !documentSize) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      const bounds = element.getBoundingClientRect();

      const result = applyViewerWheelZoom(
        event,
        { zoom, panX, panY },
        bounds,
        dispatch,
        wheelZoomRemainder.current
      );
      wheelZoomRemainder.current = result.remainder;
    };

    element.addEventListener("wheel", handleWheel, VIEWER_WHEEL_LISTENER_OPTIONS);

    return () => element.removeEventListener("wheel", handleWheel);
  }, [documentSize, panX, panY, svg, zoom]);

  const handleReset = () => {
    wheelZoomRemainder.current = 0;
    dispatch({ type: "reset" });
    setZoomDraft(formatZoomDisplay(INITIAL_VIEWER_STATE.zoom, INITIAL_VIEWER_STATE.fitMode));
    onResetSettings();
  };
  const handleZoomStep = (direction: -1 | 1) => {
    wheelZoomRemainder.current = 0;
    dispatch({ type: "manual-zoom", direction });
  };
  const handleInputArrow = (direction: -1 | 1) => {
    const nextZoom = stepInputArrowZoom(zoom, direction);
    wheelZoomRemainder.current = 0;
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

    wheelZoomRemainder.current = 0;
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
    wheelZoomRemainder.current = 0;
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
    wheelZoomRemainder.current = 0;
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
    wheelZoomRemainder.current = 0;
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

  const handleViewerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!svg) {
      return;
    }

    if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, button, [contenteditable='true']")) {
      return;
    }

    const action = getViewerKeyboardAction(event.key, event.shiftKey);

    if (action) {
      event.preventDefault();
      wheelZoomRemainder.current = 0;
      dispatch(action);
    }
  };

  return (
    <section
      className="preview-section"
      aria-labelledby="preview-heading"
    >
      <div className="preview-toolbar">
        <div className="preview-titleblock">
          <h2 id="preview-heading">PREVIEW</h2>
          <p>SVG PREVIEW</p>
        </div>
        <div className="viewer-group viewer-group--zoom" role="group" aria-label="Zoom">
          <span className="viewer-group-label" aria-hidden="true">ZOOM</span>
          <div className="zoom-control-set">
            <button type="button" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => handleZoomStep(-1)}>−</button>
            <input
              id="viewer-zoom"
              className="zoom-input"
              aria-label="Zoom level"
              aria-valuetext={zoomValueText}
              type="text"
              inputMode="decimal"
              value={zoomDraft}
              onChange={(event) => handleZoomDraftChange(event.currentTarget.value)}
              onBlur={handleZoomCommit}
              onKeyDown={handleZoomKeyDown}
            />
            <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => handleZoomStep(1)}>+</button>
          </div>
        </div>

        <div className="viewer-group viewer-group--view" role="group" aria-label="View">
          <span className="viewer-group-label" aria-hidden="true">VIEW</span>
          <div className="viewer-actions">
            <button type="button" disabled={!documentSize} onClick={handleFit}>Fit</button>
            <button type="button" disabled={!hasViewToReset && !canResetSettings} onClick={handleReset}>Reset</button>
          </div>
        </div>

        <div className="viewer-group viewer-group--backdrop">
          <label className="viewer-select-label" id="backdrop-label" htmlFor="backdrop-trigger">Backdrop</label>
          <div className="backdrop-control" ref={backdropControlRef}>
            <button
              ref={backdropTriggerRef}
              className="backdrop-trigger"
              id="backdrop-trigger"
              type="button"
              aria-labelledby="backdrop-label backdrop-value"
              aria-haspopup="listbox"
              aria-expanded={isBackdropOpen}
              aria-controls="backdrop-listbox"
              onClick={() => isBackdropOpen ? closeBackdropMenu() : openBackdropMenu()}
              onKeyDown={handleBackdropTriggerKeyDown}
            >
              <span id="backdrop-value">{backdrop === "light" ? "Light" : "Dark"}</span>
              <span className="backdrop-chevron" aria-hidden="true" />
            </button>
            <div
              className="backdrop-listbox"
              id="backdrop-listbox"
              role="listbox"
              aria-labelledby="backdrop-label"
              hidden={!isBackdropOpen}
            >
              {backdropOptions.map((option, index) => (
                <button
                  key={option}
                  ref={(element) => { backdropOptionRefs.current[index] = element; }}
                  className="backdrop-option"
                  id={`backdrop-option-${option}`}
                  type="button"
                  role="option"
                  aria-selected={backdrop === option}
                  tabIndex={activeBackdropIndex === index ? 0 : -1}
                  onClick={(event) => {
                    event.stopPropagation();
                    setBackdrop(option);
                    closeBackdropMenu(true);
                  }}
                  onKeyDown={(event) => handleBackdropOptionKeyDown(event, index)}
                >
                  {option === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="viewer-options" role="group" aria-labelledby="viewer-options-label">
          <span className="viewer-options-label" id="viewer-options-label">View options</span>
          <label className="bounds-toggle bounds-toggle--grid">
            <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.currentTarget.checked)} />
            <span>Grid</span>
          </label>
          <label className="bounds-toggle bounds-toggle--bounds">
            <input type="checkbox" checked={showBounds} onChange={(event) => setShowBounds(event.currentTarget.checked)} />
            <span>Show bounds</span>
          </label>
        </div>
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
          role="region"
          aria-label="SVG preview canvas"
          aria-describedby="viewer-keyboard-help"
          tabIndex={0}
          aria-live="polite"
          onKeyDown={handleViewerKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerLeave}
          onLostPointerCapture={handlePointerEnd}
        >
          <div
            className="viewer-grid"
            aria-hidden="true"
            data-visible={showGrid ? "true" : "false"}
          />
          <div className="preview-grid-frame" aria-hidden="true" />
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
        <span>{svg ? "SVG READY" : "SVG UNAVAILABLE"}</span>
      </div>
      <span id="viewer-keyboard-help" className="sr-only">With the preview focused, use the arrow keys to pan, Shift plus an arrow to pan farther, plus or minus to zoom. Use Fit to fit the SVG and Reset to restore the default view.</span>
    </section>
  );
};
