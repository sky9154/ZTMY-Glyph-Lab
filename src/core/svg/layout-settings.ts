export const DEFAULT_LAYOUT_SETTINGS = Object.freeze({
  orientation: "vertical" as const,
  letterSpacing: 160,
  padding: 20,
  fill: "#000000"
});

export interface LayoutSettings {
  orientation: "vertical" | "horizontal";
  letterSpacing: number;
  padding: number;
  fill: string;
}
