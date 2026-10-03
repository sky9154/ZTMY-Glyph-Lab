import type { ChangeEvent } from "react";

import type { FontState } from "@core/font/font-state";


interface FontSectionProps {
  fontState: FontState;
  onFontLoad: (file: File) => void;
}

const FONT_STATUS_SYMBOLS = {
  required: "○",
  loading: "○",
  ready: "●",
  error: "▲"
} as const;

export const FontSection = ({ fontState, onFontLoad }: FontSectionProps) => {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (file) {
      onFontLoad(file);
    }
  };

  return (
    <section className="panel-section" aria-labelledby="font-heading">
      <h2 id="font-heading">02 / FONT</h2>
      <p className="font-profile-label">SUPPORTED TYPEFACE</p>
      <p className="font-file-name">ZTMY_MOJI-R</p>
      <p className="font-profile-note">Only compatible ZTMY_MOJI-R font data is accepted. The local filename may differ.</p>
      <p className={"font-status font-status--" + fontState.status} role="status">
        <span aria-hidden="true">{FONT_STATUS_SYMBOLS[fontState.status]}</span>
        {fontState.status === "required" && "FONT REQUIRED"}
        {fontState.status === "loading" && "LOADING " + fontState.fileName}
        {fontState.status === "ready" && "FONT READY"}
        {fontState.status === "error" && "FONT LOAD FAILED"}
      </p>
      {fontState.status === "ready" && <p className="font-units">UPEM / {fontState.font.unitsPerEm}</p>}
      {fontState.status === "error" && <p className="font-error">{fontState.message}</p>}
      <label className="file-picker">
        <span>{fontState.status === "ready" ? "REPLACE FONT" : "LOAD FONT"}</span>
        <input
          aria-label="Load ZTMY font"
          type="file"
          accept=".otf,font/otf,application/x-font-opentype"
          onChange={handleFileChange}
        />
      </label>
      <p className="local-note">The font is read in this browser session. It is not uploaded or saved.</p>
    </section>
  );
};
