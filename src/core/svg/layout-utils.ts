export class LayoutValidationError extends RangeError { }

export const validateLayoutOptions = (
  unitsPerEm: number,
  options: { letterSpacing: number; padding: number }
): void => {
  if (!Number.isFinite(unitsPerEm) || unitsPerEm <= 0) {
    throw new LayoutValidationError("unitsPerEm must be a positive finite number.");
  }

  if (!Number.isFinite(options.letterSpacing) || !Number.isFinite(options.padding)) {
    throw new LayoutValidationError("letterSpacing and padding must be finite numbers.");
  }
};

export const validateLayoutDimensions = (width: number, height: number): void => {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new LayoutValidationError("Layout dimensions must be positive finite numbers.");
  }
};

export const formatSvgNumber = (value: number): string => {
  if (Math.abs(value - Math.round(value)) < 0.000001) {
    return String(Math.round(value));
  }

  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
};
