import type { ConceptualRule } from "@core/ztmy/kana-metadata";
import { inspectCell, summarizeGlyphCells, type LayoutCell } from "@core/svg/glyph-inspector";
import type { Orientation } from "@core/svg/canonical-svg";


interface GlyphInspectorProps {
  isFontReady: boolean;
  cells: readonly LayoutCell[];
  orientation: Orientation;
  selectedCell: number | null;
  onSelectCell: (index: number) => void;
}

const RULE_LABELS: Record<ConceptualRule, string> = {
  normal: "Original font outline",
  "rotate-left-90": "Rotate left 90°",
  "rotate-right-90": "Rotate right 90°",
  "rotate-180": "Rotate 180°"
};

const GLYPH_STATUS_SYMBOLS = {
  Mapped: "●",
  Empty: "○",
  Missing: "▲"
} as const;

const formatRule = (rule: ConceptualRule) => RULE_LABELS[rule] ?? rule;

const formatKanaVoice = (isVoiced: boolean, isSemiVoiced: boolean) => {
  if (isVoiced) {
    return "Voiced";
  }

  if (isSemiVoiced) {
    return "Semi-voiced";
  }

  return "Unvoiced";
};

export const GlyphInspector = ({
  isFontReady,
  cells,
  orientation,
  selectedCell,
  onSelectCell
}: GlyphInspectorProps) => {
  let activeIndex: number | null = null;

  if (cells.length > 0) {
    activeIndex = 0;

    if (selectedCell !== null && selectedCell < cells.length) {
      activeIndex = selectedCell;
    }
  }

  const inspection = activeIndex === null ? null : inspectCell(cells[activeIndex], activeIndex, orientation);
  const glyphCounts = summarizeGlyphCells(cells);
  const bounds = inspection?.glyph?.bounds;
  const dimensions = bounds
    ? String(bounds.xMax - bounds.xMin) + " × " + String(bounds.yMax - bounds.yMin)
    : "—";
  const boundsLabel = bounds
    ? [bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax].join(" / ")
    : "—";
  const hasSelectableCells = isFontReady && cells.length > 0;
  const selectionMessage = isFontReady
    ? "Enter text to inspect glyphs."
    : "Load the ZTMY_MOJI-R OTF to inspect glyphs.";

  return (
    <aside
      className="specimen-record"
      aria-label="Glyph inspection and specimen record"
    >
      <div className="record-heading">
        <div>
          <p className="eyebrow">RECORD / INSPECTION</p>
          <h2>GLYPH</h2>
        </div>
      </div>

      <section className="glyph-inspection" aria-labelledby="glyph-heading">
        <div className="glyph-inspection-heading">
          <h3 id="glyph-heading">Glyph selection</h3>
          <span>Select a cell to inspect</span>
        </div>
        {!hasSelectableCells ? (
          <p className="quiet-note">{selectionMessage}</p>
        ) : (
          <>
            <div className="glyph-summary" aria-label="Glyph counts">
              <span><strong>{String(glyphCounts.total).padStart(2, "0")}</strong> CELLS</span>
              <span><strong>{String(glyphCounts.mapped).padStart(2, "0")}</strong> MAPPED</span>
              <span className={glyphCounts.empty > 0 ? "has-empty" : ""}>
                <strong>{String(glyphCounts.empty).padStart(2, "0")}</strong> EMPTY
              </span>
              <span className={glyphCounts.missing > 0 ? "has-missing" : ""}>
                <strong>{String(glyphCounts.missing).padStart(2, "0")}</strong> MISSING
              </span>
            </div>
            <div className="glyph-cell-list" role="group" aria-label="Select a character cell">
              {cells.map((cell, index) => (
                <button
                  key={index + "-" + cell.codePoint}
                  type="button"
                  aria-pressed={activeIndex === index}
                  aria-label={"Cell " + (index + 1) + ": " + cell.char}
                  onClick={() => onSelectCell(index)}
                >
                  <span className="cell-character">{cell.char}</span>
                  <span className="cell-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {inspection ? (
        <div className="record-sheet">
          <div className="specimen-identity">
            <span className="record-field-label">SPECIMEN RECORD</span>
            <div className="specimen-identity-line">
              <strong className="specimen-character">
                {inspection.character}
              </strong>
              <span className="specimen-index">{String(inspection.cellIndex + 1).padStart(2, "0")}</span>
            </div>
          </div>

          <dl className="record-details">
            <div><dt>Unicode</dt><dd>{inspection.unicode}</dd></div>
            <div><dt>Glyph ID</dt><dd>{inspection.glyph ? String(inspection.glyph.glyphId) : "—"}</dd></div>
            <div className="record-status-row">
              <dt>Status</dt>
              <dd className={"glyph-state glyph-state--" + inspection.status.toLowerCase()}>
                <span aria-hidden="true">{GLYPH_STATUS_SYMBOLS[inspection.status]}</span>
                {inspection.status}
              </dd>
            </div>
            <div><dt>Bounds</dt><dd>{boundsLabel}</dd></div>
            <div><dt>Dimension</dt><dd>{dimensions}</dd></div>
            <div><dt>Cell</dt><dd>{inspection.cellIndex + 1} / {cells.length}</dd></div>
            <div><dt>Orientation</dt><dd>{inspection.orientation}</dd></div>
            <div><dt>Translate X / Y</dt><dd>{inspection.translateX === null ? "—" : inspection.translateX + " / " + inspection.translateY}</dd></div>
          </dl>

          <section className="kana-record" aria-labelledby="kana-heading">
            <h3 id="kana-heading">Kana record</h3>
            {inspection.metadata ? (
              <dl className="record-details record-details--kana">
                <div><dt>Base</dt><dd>{inspection.metadata.baseKana}</dd></div>
                <div><dt>Row</dt><dd>{inspection.metadata.row ?? "—"}</dd></div>
                <div><dt>Vowel</dt><dd>{inspection.metadata.vowel ?? "—"}</dd></div>
                <div><dt>Romanized</dt><dd>{inspection.metadata.romanization ?? "—"}</dd></div>
                <div><dt>Voice</dt><dd>
                  {formatKanaVoice(inspection.metadata.isVoiced, inspection.metadata.isSemiVoiced)}
                  {inspection.metadata.isSmallKana ? " · Small" : ""}
                </dd></div>
                <div><dt>Rule</dt><dd>{formatRule(inspection.metadata.conceptualRule)}</dd></div>
              </dl>
            ) : (
              <p className="quiet-note">No kana rule applies to this glyph.</p>
            )}
            <p className="record-footnote">Metadata describes the design system; the font outline remains unchanged.</p>
          </section>
        </div>
      ) : (
        <div className="record-empty">
          <span className="record-empty-mark" aria-hidden="true">+</span>
          <p>No glyph selected.</p>
          <span>UNICODE / BOUNDS / KANA DATA</span>
        </div>
      )}
    </aside>
  );
};
