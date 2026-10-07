export const LETTER_SPACING_LIMITS = { min: -500, max: 2000, step: 10 } as const;
export const PADDING_LIMITS = { min: 0, max: 300, step: 1 } as const;

export const getMeasurementError = (value: string, min: number, max: number, step: number): string | null => {
  if (!value.trim()) {
    return "Enter a number.";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "Enter a valid number.";
  }

  if (parsed < min || parsed > max) {
    return `Enter a value from ${min} to ${max}.`;
  }

  const stepPosition = (parsed - min) / step;

  if (Math.abs(stepPosition - Math.round(stepPosition)) > 0.000001) {
    return `Use increments of ${step}.`;
  }

  return null;
};
