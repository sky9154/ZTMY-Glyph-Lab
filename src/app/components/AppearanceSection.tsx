interface AppearanceSectionProps {
  fill: string;
  onFillChange: (value: string) => void;
}

export const AppearanceSection = ({ fill, onFillChange }: AppearanceSectionProps) => {
  return (
    <section className="panel-section" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading">04 / APPEARANCE</h2>
      <label className="field-label" htmlFor="fill">Glyph fill</label>
      <div className="fill-control">
        <input
          id="fill"
          aria-label="Glyph fill color"
          type="color"
          value={fill}
          onChange={(event) => onFillChange(event.currentTarget.value.toUpperCase())}
        />
        <input
          aria-label="Glyph fill hex value"
          type="text"
          pattern="^#[0-9a-fA-F]{6}$"
          value={fill}
          onChange={(event) => {
            if (/^#[\da-fA-F]{0,6}$/.test(event.currentTarget.value)) {
              onFillChange(event.currentTarget.value);
            }
          }}
        />
      </div>
    </section>
  );
};
