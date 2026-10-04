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
      <h2 id="font-heading">FONT</h2>
      <p className="font-profile-label">REQUIRED FILE</p>
      <p className="font-file-name">ZTMY_MOJI-R</p>
      <p className="font-profile-note">Select the ZTMY_MOJI-R OTF. The filename may differ.</p>
      <p className={"font-status font-status--" + fontState.status} role="status">
        <span aria-hidden="true">{FONT_STATUS_SYMBOLS[fontState.status]}</span>
        {fontState.status === "required" && "OTF NOT LOADED"}
        {fontState.status === "loading" && "LOADING " + fontState.fileName}
        {fontState.status === "ready" && "OTF LOADED"}
        {fontState.status === "error" && "OTF LOAD FAILED"}
      </p>
      {fontState.status === "ready" && <p className="font-units">UPEM / {fontState.font.unitsPerEm}</p>}
      {fontState.status === "error" && <p className="font-error">{fontState.message}</p>}
      <label className="file-picker">
        <span>{fontState.status === "ready" ? "REPLACE OTF" : "LOAD OTF"}</span>
        <input
          aria-label="Load ZTMY_MOJI-R OTF"
          type="file"
          accept=".otf,font/otf,application/x-font-opentype"
          onChange={handleFileChange}
        />
      </label>
      <p className="local-note">The font is processed only in this browser tab. It is not uploaded.</p>
    </section>
  );
};
