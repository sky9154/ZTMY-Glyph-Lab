export const MIN_ZOOM = 1;
export const MAX_ZOOM = 400;
export const INPUT_ARROW_STEP = 5;
export const BUTTON_ZOOM_STEP = 10;
export const VIEWER_PADDING = 32;
export const VIEWER_BOUNDS_STROKE_PX = 1.25;

export type Backdrop = "light" | "dark";

export interface ViewerSize {
  width: number;
  height: number;
}

export function clampManualZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return MIN_ZOOM;
  }

  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function roundZoomToStep(zoom: number, step: number): number {
  if (!Number.isFinite(zoom)) {
    return MIN_ZOOM;
  }

  return clampManualZoom(Math.round(zoom / step) * step);
}

export function roundZoomTo5(zoom: number): number {
  return roundZoomToStep(zoom, INPUT_ARROW_STEP);
}

export function roundZoomTo10(zoom: number): number {
  return roundZoomToStep(zoom, BUTTON_ZOOM_STEP);
}

export function stepInputArrowZoom(zoom: number, direction: -1 | 1): number {
  return roundZoomTo5(zoom + INPUT_ARROW_STEP * direction);
}

export function stepButtonZoom(zoom: number, direction: -1 | 1): number {
  return roundZoomTo10(zoom + BUTTON_ZOOM_STEP * direction);
}

export function parseManualZoomDraft(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? clampManualZoom(parsed) : null;
}

export function formatZoomDisplay(zoom: number, fitMode: boolean): string {
  const validZoom = clampManualZoom(zoom);

  return String(fitMode ? Math.round(validZoom) : validZoom);
}

export function calculateFitZoom(documentSize: ViewerSize, viewerSize: ViewerSize, padding = VIEWER_PADDING): number {
  if (
    ![documentSize.width, documentSize.height, viewerSize.width, viewerSize.height, padding].every(Number.isFinite) ||
    documentSize.width <= 0 ||
    documentSize.height <= 0 ||
    viewerSize.width <= 0 ||
    viewerSize.height <= 0 ||
    padding < 0
  ) {
    return 100;
  }

  const availableWidth = Math.max(1, viewerSize.width - padding * 2);
  const availableHeight = Math.max(1, viewerSize.height - padding * 2);
  const fitZoom = Math.min(availableWidth / documentSize.width, availableHeight / documentSize.height) * 100;

  if (!Number.isFinite(fitZoom)) {
    return MIN_ZOOM;
  }

  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fitZoom));
}

export interface ViewerTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export const viewerTransformCss = (transform: ViewerTransform): string => {
  const zoom = clampManualZoom(transform.zoom);
  const panX = Number.isFinite(transform.panX) ? transform.panX : 0;
  const panY = Number.isFinite(transform.panY) ? transform.panY : 0;

  return `translate(${panX}px, ${panY}px) scale(${zoom / 100})`;
}

export const viewerBoundsLocalStrokeWidth = (zoom: number): number => {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    return 0;
  }

  return VIEWER_BOUNDS_STROKE_PX * 100 / zoom;
}

export interface ViewerInteractionState extends ViewerTransform {
  fitMode: boolean;
}

export type ViewerInteractionAction =
  | { type: "fit"; transform: ViewerTransform }
  | { type: "fit-resize"; transform: ViewerTransform }
  | { type: "manual-zoom"; direction: -1 | 1 }
  | { type: "manual-zoom-to"; zoom: number }
  | { type: "pan"; deltaX: number; deltaY: number }
  | { type: "reset" }
  | { type: "orientation-change" };

export const INITIAL_VIEWER_STATE: ViewerInteractionState = {
  zoom: 100,
  panX: 0,
  panY: 0,
  fitMode: false
};

export const viewerSurfaceClassName = (backdrop: Backdrop, showGrid: boolean, isDragging = false): string => {
  const classNames = ["preview-viewer", `preview-viewer--${backdrop}`];

  if (showGrid) {
    classNames.push("preview-viewer--grid");
  }

  if (isDragging) {
    classNames.push("is-dragging");
  }

  return classNames.join(" ");
}

export const reduceViewerInteraction = (
  state: ViewerInteractionState,
  action: ViewerInteractionAction
): ViewerInteractionState => {
  switch (action.type) {
    case "fit":
      return { ...action.transform, zoom: clampManualZoom(action.transform.zoom), fitMode: true };
    case "fit-resize":
      return state.fitMode
        ? { ...action.transform, zoom: clampManualZoom(action.transform.zoom), fitMode: true }
        : state;
    case "manual-zoom":
      return { ...state, zoom: stepButtonZoom(state.zoom, action.direction), fitMode: false };
    case "manual-zoom-to":
      return Number.isFinite(action.zoom)
        ? { ...state, zoom: clampManualZoom(action.zoom), fitMode: false }
        : state;
    case "pan":
      if (!Number.isFinite(action.deltaX) || !Number.isFinite(action.deltaY)) {
        return state;
      }

      if (!Number.isFinite(state.panX + action.deltaX) || !Number.isFinite(state.panY + action.deltaY)) {
        return state;
      }

      return {
        ...state,
        panX: state.panX + action.deltaX,
        panY: state.panY + action.deltaY
      };
    case "reset":
      return INITIAL_VIEWER_STATE;
    case "orientation-change":
      return { ...state, panX: 0, panY: 0, fitMode: true };
  }
}

export interface PointerDragState {
  pointerId: number;
  x: number;
  y: number;
}

export const beginPointerDrag = (pointerId: number, x: number, y: number): PointerDragState => {
  return { pointerId, x, y };
}

export const movePointerDrag = (
  drag: PointerDragState,
  pointerId: number,
  x: number,
  y: number
): { drag: PointerDragState; deltaX: number; deltaY: number } | null => {
  if (drag.pointerId !== pointerId || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    drag: { pointerId, x, y },
    deltaX: x - drag.x,
    deltaY: y - drag.y
  };
}

export const endPointerDrag = (drag: PointerDragState | null, pointerId: number): PointerDragState | null => {
  return drag?.pointerId === pointerId ? null : drag;
}

export const calculateFitTransform = (documentSize: ViewerSize, viewerSize: ViewerSize, padding = VIEWER_PADDING): ViewerTransform => {
  return { zoom: calculateFitZoom(documentSize, viewerSize, padding), panX: 0, panY: 0 };
}

export const readSvgSize = (svg: string): ViewerSize | null => {
  const viewBox = svg.match(
    /<svg\b[^>]*\bviewBox\s*=\s*["']\s*(-?[\d.]+)[ ,]+(-?[\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i
  );

  if (!viewBox) {
    return null;
  }

  const width = Number(viewBox[3]);
  const height = Number(viewBox[4]);

  return width > 0 && height > 0 ? { width, height } : null;
}
