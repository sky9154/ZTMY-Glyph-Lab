interface TextSectionProps {
  text: string;
  onTextChange: (value: string) => void;
}

export const TextSection = ({ text, onTextChange }: TextSectionProps) => {
  return (
    <section className="panel-section" aria-labelledby="text-heading">
      <h2 id="text-heading">01 / TEXT</h2>
      <label className="field-label" htmlFor="source-text">Source text</label>
      <textarea
        id="source-text"
        value={text}
        onChange={(event) => onTextChange(event.currentTarget.value)}
        rows={3}
      />
    </section>
  );
};
