import type { Orientation } from "@core/svg/canonical-svg";


interface LayoutSectionProps {
  orientation: Orientation;
  onOrientationChange: (value: Orientation) => void;
  letterSpacing: number;
  onLetterSpacingChange: (value: number) => void;
  padding: number;
  onPaddingChange: (value: number) => void;
}

export const LayoutSection = ({
  orientation,
  onOrientationChange,
  letterSpacing,
  onLetterSpacingChange,
  padding,
  onPaddingChange
}: LayoutSectionProps) => {
  return (
    <section className="panel-section" aria-labelledby="layout-heading">
      <h2 id="layout-heading">03 / LAYOUT</h2>
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
            onChange={(event) => onLetterSpacingChange(Number(event.currentTarget.value))}
          />
          <div className="number-wrap">
            <input
              className="number-input"
              aria-label="Letter spacing in font units"
              type="number"
              min="-500"
              max="2000"
              step="10"
              value={letterSpacing}
              onChange={(event) => onLetterSpacingChange(Number(event.currentTarget.value))}
            />
            <span>units</span>
          </div>
        </div>
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
            onChange={(event) => onPaddingChange(Number(event.currentTarget.value))}
          />
          <div className="number-wrap">
            <input
              className="number-input"
              aria-label="Padding in font units"
              type="number"
              min="0"
              max="300"
              step="1"
              value={padding}
              onChange={(event) => onPaddingChange(Number(event.currentTarget.value))}
            />
            <span>units</span>
          </div>
        </div>
      </div>
    </section>
  );
};
