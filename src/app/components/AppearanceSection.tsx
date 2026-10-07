import { useEffect, useState, type KeyboardEvent } from "react";

import { isValidSvgFill } from "@core/svg/serialize-svg";


interface AppearanceSectionProps {
  fill: string;
  onFillChange: (value: string) => void;
  onDraftStateChange?: (hasDraft: boolean) => void;
}

export const AppearanceSection = ({ fill, onFillChange, onDraftStateChange = () => { } }: AppearanceSectionProps) => {
  const [fillDraft, setFillDraft] = useState(fill);
  const isValidFill = isValidSvgFill(fillDraft);

  useEffect(() => {
    setFillDraft(fill);
  }, [fill]);

  const handleFillCommit = () => {
    if (!isValidFill) {
      return;
    }

    const committedFill = fillDraft.toUpperCase();
    setFillDraft(committedFill);
    onDraftStateChange(false);
    onFillChange(committedFill);
  };

  const handleFillKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleFillCommit();
    }
  };

  return (
    <section className="panel-section" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading">APPEARANCE</h2>
      <label className="field-label" htmlFor="fill">Glyph fill</label>
      <div className="fill-control">
        <input
          id="fill"
          aria-label="Glyph fill color"
          type="color"
          value={fill}
          onChange={(event) => {
            const nextFill = event.currentTarget.value.toUpperCase();
            setFillDraft(nextFill);
            onDraftStateChange(false);
            onFillChange(nextFill);
          }}
        />
        <input
          aria-label="Glyph fill hex value"
          type="text"
          pattern="^#[0-9a-fA-F]{6}$"
          aria-invalid={!isValidFill}
          aria-describedby={!isValidFill ? "fill-error" : undefined}
          value={fillDraft}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFillDraft(value);
            onDraftStateChange(value !== fill || !isValidSvgFill(value));
          }}
          onBlur={handleFillCommit}
          onKeyDown={handleFillKeyDown}
        />
      </div>
      {!isValidFill && <p id="fill-error" className="field-error" role="alert">Enter a six-digit hex color such as #1A2B3C.</p>}
    </section>
  );
};
