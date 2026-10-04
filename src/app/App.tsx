import { useMemo, useReducer, useState } from "react";

import { DEFAULT_TEXT } from "@core/font/opentype-font";
import {
  copyCanonicalSvg,
  createCanonicalSvg,
  exportCanonicalSvg,
  getSvgUnavailableMessage
} from "@core/svg/canonical-svg";
import { getLayoutCells } from "@core/svg/glyph-inspector";
import { INITIAL_LAYOUT_SETTINGS_STATE, hasResettableLayoutSettings, reduceLayoutSettings } from "@app/layout-settings";
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
  required: "SVG UNAVAILABLE",
  loading: "LOADING FONT",
  ready: "SVG READY",
  error: "FONT ERROR"
} as const;

export const App = () => {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [layoutSettingsState, dispatchLayoutSettings] = useReducer(reduceLayoutSettings, INITIAL_LAYOUT_SETTINGS_STATE);
  const { settings, draftResetVersion } = layoutSettingsState;
  const { letterSpacing, padding, fill, orientation } = settings;
  const [filename, setFilename] = useState("glyph-export");
  const [feedback, setFeedback] = useState("");
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const { state: fontState, load } = useFont();

  const canonicalSvg = useMemo(() => createCanonicalSvg(
    text,
    fontState.status === "ready" ? fontState.font : null,
    settings
  ), [text, fontState, settings]);
  const isSvgAvailable = canonicalSvg.status === "ready";
  const outputStatusLabel = canonicalSvg.status === "unavailable"
    && canonicalSvg.reason !== "font-required"
    ? {
      "empty-text": "EMPTY TEXT",
      "invalid-fill": "INVALID COLOR",
      "invalid-layout": "INVALID LAYOUT",
      "generation-error": "SVG ERROR"
    }[canonicalSvg.reason]
    : OUTPUT_STATUS_LABELS[fontState.status];
  const fontAdapter = fontState.status === "ready" ? fontState.font : null;
  const shouldShowGlyphCells = canonicalSvg.status === "ready" || (
    canonicalSvg.reason !== "invalid-layout" && canonicalSvg.reason !== "generation-error"
  );
  const glyphCells = useMemo(
    () => (fontAdapter && shouldShowGlyphCells
      ? getLayoutCells(text, fontAdapter, { letterSpacing, padding }, orientation)
      : []),
    [text, fontAdapter, letterSpacing, padding, orientation, shouldShowGlyphCells]
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
  };

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
  };

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
  };

  return (
    <main className="app-shell">
      <header className="app-heading">
        <div className="brand-lockup">
          <p className="eyebrow">ZTMY TYPE SPECIMEN / LOCAL TOOL</p>
          <h1>GLYPH LAB.</h1>
          <p className="brand-subtitle">Load the ZTMY_MOJI-R OTF, choose vertical or horizontal layout, adjust spacing and color, and export SVG.</p>
        </div>
        <div className="header-side" aria-label="Specimen identification">
          <div className="header-meta">
            <span className="specimen-number">ZTMY / FORM RECORD</span>
            <span className="header-notation">LOCAL FIELD NOTE&nbsp;&nbsp;·&nbsp;&nbsp;OTF → SVG</span>
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="control-archive" aria-label="Controls">
          <div className="archive-heading">
            <span className="archive-mark" aria-hidden="true">+</span>
            <div>
              <p className="eyebrow">PREPARATION LOG</p>
              <h2>Controls</h2>
            </div>
          </div>

          <TextSection text={text} onTextChange={handleTextChange} />

          <FontSection fontState={fontState} onFontLoad={load} />

          <LayoutSection
            key={draftResetVersion}
            orientation={orientation}
            onOrientationChange={(value) => dispatchLayoutSettings({ type: "orientation", value })}
            letterSpacing={letterSpacing}
            onLetterSpacingChange={(value) => dispatchLayoutSettings({ type: "letter-spacing", value })}
            padding={padding}
            onPaddingChange={(value) => dispatchLayoutSettings({ type: "padding", value })}
            onDraftStateChange={(value) => dispatchLayoutSettings({ type: "layout-draft", value })}
          />

          <AppearanceSection
            key={`appearance-${draftResetVersion}`}
            fill={fill}
            onFillChange={(value) => dispatchLayoutSettings({ type: "fill", value })}
            onDraftStateChange={(value) => dispatchLayoutSettings({ type: "appearance-draft", value })}
          />

          <ExportSection
            filename={filename}
            onFilenameChange={setFilename}
            isSvgAvailable={isSvgAvailable}
            onCopy={handleCopy}
            onExport={handleExport}
            feedback={feedback}
          />
        </aside>

        <PreviewViewer
          svg={isSvgAvailable ? canonicalSvg.svg : null}
          orientation={orientation}
          canResetSettings={hasResettableLayoutSettings(layoutSettingsState)}
          onResetSettings={() => dispatchLayoutSettings({ type: "reset" })}
          emptyStateMessage={canonicalSvg.status === "unavailable"
            ? canonicalSvg.reason === "font-required"
              ? "Load the ZTMY_MOJI-R OTF to preview SVG."
              : getSvgUnavailableMessage(canonicalSvg)
            : undefined}
        />

        <GlyphInspector
          isFontReady={fontState.status === "ready"}
          cells={glyphCells}
          orientation={orientation}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
        />
      </div>

      <footer className="status-rail" aria-label="Output status">
        <p className="status-caption"><span className="registration-dot" aria-hidden="true">＋</span> LIVE SVG OUTPUT</p>
        <dl className="status-values">
          <div><dt>Status</dt><dd>{outputStatusLabel}</dd></div>
          <div><dt>Cells</dt><dd>{String(glyphCells.length).padStart(2, "0")}</dd></div>
          <div><dt>UPEM</dt><dd>{fontAdapter ? fontAdapter.unitsPerEm : "—"}</dd></div>
          <div><dt>ViewBox</dt><dd>{outputSize ? outputSize.width + " × " + outputSize.height : "—"}</dd></div>
          <div><dt>Orientation</dt><dd>{orientation}</dd></div>
        </dl>
      </footer>

      <footer className="copyright-footer" aria-label="Copyright">
        <span className="copyright-label">GLYPH LAB. / LOCAL TYPE SPECIMEN</span>
        <p>Copyright © oF. All Rights Reserved.</p>
      </footer>
    </main>
  );
};
