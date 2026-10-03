import { useMemo, useState } from "react";
import { motion } from "motion/react";

import { DEFAULT_TEXT } from "@core/font/opentype-font";
import { copyCanonicalSvg, createCanonicalSvg, exportCanonicalSvg, type Orientation } from "@core/svg/canonical-svg";
import { getLayoutCells } from "@core/svg/glyph-inspector";
import { DEFAULT_VERTICAL_OPTIONS } from "@core/svg/vertical-layout";
import { useFont } from "@hooks/useFont";
import { AppearanceSection } from "@components/AppearanceSection";
import { ExportSection } from "@components/ExportSection";
import { FontSection } from "@components/FontSection";
import { GlyphInspector } from "@components/GlyphInspector";
import { LayoutSection } from "@components/LayoutSection";
import { TextSection } from "@components/TextSection";
import { PreviewViewer } from "@app/PreviewViewer";
import { readSvgSize } from "@app/viewer";


const OUTPUT_STATUS_LABELS = {
  required: "FONT REQUIRED",
  loading: "LOADING FONT",
  ready: "FONT READY",
  error: "LOAD ERROR"
} as const;

export const App = () => {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [letterSpacing, setLetterSpacing] = useState(DEFAULT_VERTICAL_OPTIONS.letterSpacing);
  const [padding, setPadding] = useState(DEFAULT_VERTICAL_OPTIONS.padding);
  const [fill, setFill] = useState("#000000");
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [filename, setFilename] = useState("glyph-export");
  const [feedback, setFeedback] = useState("");
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const { state: fontState, load } = useFont();

  const canonicalSvg = useMemo(() => {
    try {
      return createCanonicalSvg(text, fontState.status === "ready" ? fontState.font : null, {
        letterSpacing,
        padding,
        fill,
        orientation
      });
    } catch {
      return { status: "unavailable" as const, svg: null };
    }
  }, [text, fontState, letterSpacing, padding, fill, orientation]);
  const isSvgAvailable = canonicalSvg.status === "ready";
  const fontAdapter = fontState.status === "ready" ? fontState.font : null;
  const glyphCells = useMemo(
    () => (fontAdapter ? getLayoutCells(text, fontAdapter, { letterSpacing, padding }, orientation) : []),
    [text, fontAdapter, letterSpacing, padding, orientation]
  );

  const outputSize = canonicalSvg.svg ? readSvgSize(canonicalSvg.svg) : null;

  const handleTextChange = (value: string) => {
    setText(value);
    const nextCellCount = [...value.normalize("NFC")].filter((char) => char !== "\n").length;
    setSelectedCell((current) => {
      if (nextCellCount === 0 || current === null) {
        return null;
      }

      if (current < nextCellCount) {
        return current;
      }

      return 0;
    });
  }

  const handleCopy = async () => {
    if (!isSvgAvailable) {
      return;
    }

    try {
      await copyCanonicalSvg(canonicalSvg.svg);

      setFeedback("Copied");
    } catch {
      setFeedback("Copy failed. Clipboard access is unavailable.");
    }
  }

  const handleExport = () => {
    if (!isSvgAvailable) {
      return;
    }

    try {
      exportCanonicalSvg(canonicalSvg.svg, filename);
      setFeedback("Exported");
    } catch {
      setFeedback("Export failed.");
    }
  }

  return (
    <main className="app-shell">
      <motion.header
        className="app-heading"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="brand-lockup">
          <p className="eyebrow">ZTMY TYPE SPECIMEN / LOCAL TOOL</p>
          <h1>GLYPH LAB.</h1>
          <p className="brand-subtitle">A study of ZUTOMAYO glyph form, outline and measured space.</p>
        </div>
        <div className="header-side" aria-label="Specimen identification">
          <span className="microstructure-mark" aria-hidden="true" />
          <div className="header-meta">
            <span className="specimen-number">ZTMY / FORM RECORD / 001</span>
            <span className="header-notation">LOCAL FIELD NOTE&nbsp;&nbsp;·&nbsp;&nbsp;OTF → SVG</span>
          </div>
        </div>
      </motion.header>

      <div className="workspace">
        <motion.aside
          className="control-archive"
          aria-label="Control archive"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.03, ease: "easeOut" }}
        >
          <div className="archive-heading">
            <span className="archive-mark" aria-hidden="true">+</span>
            <div>
              <p className="eyebrow">PREPARATION LOG</p>
              <h2>Control archive</h2>
            </div>
            <span className="archive-code">A—01</span>
          </div>

          <TextSection text={text} onTextChange={handleTextChange} />

          <FontSection fontState={fontState} onFontLoad={load} />

          <LayoutSection
            orientation={orientation}
            onOrientationChange={setOrientation}
            letterSpacing={letterSpacing}
            onLetterSpacingChange={setLetterSpacing}
            padding={padding}
            onPaddingChange={setPadding}
          />

          <AppearanceSection fill={fill} onFillChange={setFill} />

          <ExportSection
            filename={filename}
            onFilenameChange={setFilename}
            isSvgAvailable={isSvgAvailable}
            onCopy={handleCopy}
            onExport={handleExport}
            feedback={feedback}
          />
        </motion.aside>

        <PreviewViewer svg={isSvgAvailable ? canonicalSvg.svg : null} orientation={orientation} />

        <GlyphInspector
          isFontReady={fontState.status === "ready"}
          cells={glyphCells}
          orientation={orientation}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
        />
      </div>

      <footer className="status-rail" aria-label="Output status">
        <p className="status-caption"><span className="registration-dot" aria-hidden="true">＋</span> LIVE / OUTPUT RECORD</p>
        <dl className="status-values">
          <div><dt>Status</dt><dd>{OUTPUT_STATUS_LABELS[fontState.status]}</dd></div>
          <div><dt>Cells</dt><dd>{String(glyphCells.length).padStart(2, "0")}</dd></div>
          <div><dt>UPEM</dt><dd>{fontAdapter ? fontAdapter.unitsPerEm : "—"}</dd></div>
          <div><dt>ViewBox</dt><dd>{outputSize ? outputSize.width + " × " + outputSize.height : "—"}</dd></div>
          <div><dt>Orientation</dt><dd>{orientation}</dd></div>
          <div><dt>Process</dt><dd>LOCAL</dd></div>
        </dl>
      </footer>

      <footer className="copyright-footer" aria-label="Copyright">
        <span className="copyright-label">GLYPH LAB. / LOCAL TYPE SPECIMEN</span>
        <p>Copyright © oF. All Rights Reserved.</p>
      </footer>
    </main>
  );
}
