import { AnimatePresence, motion } from "motion/react";


interface ExportSectionProps {
  filename: string;
  onFilenameChange: (value: string) => void;
  isSvgAvailable: boolean;
  onCopy: () => void;
  onExport: () => void;
  feedback: string;
}

export const ExportSection = ({
  filename,
  onFilenameChange,
  isSvgAvailable,
  onCopy,
  onExport,
  feedback
}: ExportSectionProps) => {
  return (
    <section className="export-section" aria-labelledby="export-heading">
      <h2 id="export-heading">05 / EXPORT</h2>
      <label className="field-label" htmlFor="filename">File name</label>
      <div className="filename-control">
        <input
          id="filename"
          type="text"
          value={filename}
          onChange={(event) => onFilenameChange(event.currentTarget.value)}
        />
        <span aria-hidden="true">.SVG</span>
      </div>
      <div className="button-row">
        <button type="button" disabled={!isSvgAvailable} onClick={onCopy}>Copy SVG</button>
        <button type="button" disabled={!isSvgAvailable} onClick={onExport}>Export SVG</button>
      </div>
      <p className="action-feedback" role="status" aria-live="polite">
        <AnimatePresence initial={false} mode="wait">
          {feedback && (
            <motion.span
              key={feedback}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
              {feedback}
            </motion.span>
          )}
        </AnimatePresence>
      </p>
    </section>
  );
};
