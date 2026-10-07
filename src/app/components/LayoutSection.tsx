import { useEffect, useState, type KeyboardEvent } from "react";

import { getMeasurementError, LETTER_SPACING_LIMITS, PADDING_LIMITS } from "@components/measurement-validation";
import type { Orientation } from "@core/svg/canonical-svg";


interface LayoutSectionProps {
  orientation: Orientation;
  onOrientationChange: (value: Orientation) => void;
  letterSpacing: number;
  onLetterSpacingChange: (value: number) => void;
  padding: number;
  onPaddingChange: (value: number) => void;
  onDraftStateChange?: (hasDraft: boolean) => void;
}

export const LayoutSection = ({
  orientation,
  onOrientationChange,
  letterSpacing,
  onLetterSpacingChange,
  padding,
  onPaddingChange,
  onDraftStateChange = () => { }
}: LayoutSectionProps) => {
  const [letterSpacingDraft, setLetterSpacingDraft] = useState(String(letterSpacing));
  const [paddingDraft, setPaddingDraft] = useState(String(padding));
  const letterSpacingError = getMeasurementError(letterSpacingDraft, LETTER_SPACING_LIMITS.min, LETTER_SPACING_LIMITS.max, LETTER_SPACING_LIMITS.step);
  const paddingError = getMeasurementError(paddingDraft, PADDING_LIMITS.min, PADDING_LIMITS.max, PADDING_LIMITS.step);

  const reportDraftState = (
    nextLetterSpacingDraft = letterSpacingDraft,
    nextPaddingDraft = paddingDraft,
    nextLetterSpacing = letterSpacing,
    nextPadding = padding
  ) => {
    const hasLetterSpacingDraft = nextLetterSpacingDraft !== String(nextLetterSpacing)
      || getMeasurementError(nextLetterSpacingDraft, LETTER_SPACING_LIMITS.min, LETTER_SPACING_LIMITS.max, LETTER_SPACING_LIMITS.step) !== null;
    const hasPaddingDraft = nextPaddingDraft !== String(nextPadding)
      || getMeasurementError(nextPaddingDraft, PADDING_LIMITS.min, PADDING_LIMITS.max, PADDING_LIMITS.step) !== null;

    onDraftStateChange(hasLetterSpacingDraft || hasPaddingDraft);
  };

  useEffect(() => {
    setLetterSpacingDraft(String(letterSpacing));
  }, [letterSpacing]);

  useEffect(() => {
    setPaddingDraft(String(padding));
  }, [padding]);

  const handleMeasurementKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const handleLetterSpacingCommit = () => {
    if (letterSpacingError) {
      return;
    }

    const committedSpacing = Number(letterSpacingDraft);
    setLetterSpacingDraft(String(committedSpacing));
    reportDraftState(String(committedSpacing), paddingDraft, committedSpacing);
    onLetterSpacingChange(committedSpacing);
  };

  const handlePaddingCommit = () => {
    if (paddingError) {
      return;
    }

    const committedPadding = Number(paddingDraft);
    setPaddingDraft(String(committedPadding));
    reportDraftState(letterSpacingDraft, String(committedPadding), letterSpacing, committedPadding);
    onPaddingChange(committedPadding);
  };

  return (
    <section className="panel-section" aria-labelledby="layout-heading">
      <h2 id="layout-heading">LAYOUT</h2>
      <fieldset className="orientation-control">
        <legend>Orientation</legend>
        <button
          type="button"
          aria-pressed={orientation === "vertical"}
          onClick={() => onOrientationChange("vertical")}
        >
          Vertical
        </button>
        <button
          type="button"
          aria-pressed={orientation === "horizontal"}
          onClick={() => onOrientationChange("horizontal")}
        >
          Horizontal
        </button>
      </fieldset>

      <div className="measurement-field">
        <label className="range-field" htmlFor="letter-spacing">Letter spacing</label>
        <div className="measurement-input">
          <input
            id="letter-spacing"
            type="range"
            min={LETTER_SPACING_LIMITS.min}
            max={LETTER_SPACING_LIMITS.max}
            step={LETTER_SPACING_LIMITS.step}
            value={letterSpacing}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setLetterSpacingDraft(value);
              const nextValue = Number(value);
              reportDraftState(value, paddingDraft, nextValue);
              onLetterSpacingChange(nextValue);
            }}
          />
          <div className="number-wrap">
            <input
              className="number-input"
              aria-label="Letter spacing in font units"
              aria-invalid={letterSpacingError !== null}
              aria-describedby={letterSpacingError ? "letter-spacing-error" : undefined}
              type="number"
              min={LETTER_SPACING_LIMITS.min}
              max={LETTER_SPACING_LIMITS.max}
              step={LETTER_SPACING_LIMITS.step}
              value={letterSpacingDraft}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setLetterSpacingDraft(value);
                reportDraftState(value);
              }}
              onBlur={handleLetterSpacingCommit}
              onKeyDown={handleMeasurementKeyDown}
            />
            <span>units</span>
          </div>
        </div>
        {letterSpacingError && <p id="letter-spacing-error" className="field-error" role="alert">{letterSpacingError}</p>}
      </div>

      <div className="measurement-field">
        <label className="range-field" htmlFor="padding">Padding</label>
        <div className="measurement-input">
          <input
            id="padding"
            type="range"
            min={PADDING_LIMITS.min}
            max={PADDING_LIMITS.max}
            step={PADDING_LIMITS.step}
            value={padding}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setPaddingDraft(value);
              const nextValue = Number(value);
              reportDraftState(letterSpacingDraft, value, letterSpacing, nextValue);
              onPaddingChange(nextValue);
            }}
          />
          <div className="number-wrap">
            <input
              className="number-input"
              aria-label="Padding in font units"
              aria-invalid={paddingError !== null}
              aria-describedby={paddingError ? "padding-error" : undefined}
              type="number"
              min={PADDING_LIMITS.min}
              max={PADDING_LIMITS.max}
              step={PADDING_LIMITS.step}
              value={paddingDraft}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setPaddingDraft(value);
                reportDraftState(letterSpacingDraft, value);
              }}
              onBlur={handlePaddingCommit}
              onKeyDown={handleMeasurementKeyDown}
            />
            <span>units</span>
          </div>
        </div>
        {paddingError && <p id="padding-error" className="field-error" role="alert">{paddingError}</p>}
      </div>
    </section>
  );
};
