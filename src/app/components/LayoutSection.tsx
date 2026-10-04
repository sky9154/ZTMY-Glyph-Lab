import { useEffect, useState, type KeyboardEvent } from "react";

import { getMeasurementError } from "@components/measurement-validation";
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
  const letterSpacingError = getMeasurementError(letterSpacingDraft, -500, 2000, 10);
  const paddingError = getMeasurementError(paddingDraft, 0, 300, 1);

  const reportDraftState = (
    nextLetterSpacingDraft = letterSpacingDraft,
    nextPaddingDraft = paddingDraft,
    nextLetterSpacing = letterSpacing,
    nextPadding = padding
  ) => {
    const hasLetterSpacingDraft = nextLetterSpacingDraft !== String(nextLetterSpacing)
      || getMeasurementError(nextLetterSpacingDraft, -500, 2000, 10) !== null;
    const hasPaddingDraft = nextPaddingDraft !== String(nextPadding)
      || getMeasurementError(nextPaddingDraft, 0, 300, 1) !== null;

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
            min="-500"
            max="2000"
            step="10"
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
              min="-500"
              max="2000"
              step="10"
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
            min="0"
            max="300"
            step="1"
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
              min="0"
              max="300"
              step="1"
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
