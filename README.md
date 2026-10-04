# ZTMY Glyph Lab

ZTMY Glyph Lab is a browser-based tool for turning text set in ZUTOMAYO's `ZTMY_MOJI-R` font into SVG. It supports vertical and horizontal layouts, live preview controls, per-glyph inspection, and deterministic SVG export.

## Required font

The font is not included in this repository. Download it yourself from the [official ZUTOMAYO font page](https://zutomayo.net/font/), then select the downloaded `.otf` file in the app.

The official page states that commercial use is not allowed. Check the terms on that page before using the font or any exported SVG.

The app verifies the expected `ZTMY_MOJI-R` file data before passing it to the OpenType parser. Renaming the file does not affect validation, but a different or modified font will be rejected.

## Features

- Compose text with vertical or horizontal glyph placement.
- Adjust letter spacing, document padding, and glyph fill color.
- Preview the full SVG with automatic first-load fitting, zoom, pan, light and dark backdrops, an optional grid, and document bounds.
- Inspect each character's Unicode value, glyph ID, bounds, dimensions, placement, and kana metadata.
- Distinguish mapped, empty, and missing glyph cells without changing the font outlines.
- Copy the canonical SVG source or download it as an `.svg` file.
- Use the preview with a pointer or keyboard, with reduced-motion preferences respected.

## Run locally

You need [Bun](https://bun.sh/) and a recent browser with Web Crypto support.

Open the project directory in Terminal, then install the dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Open the local address printed in Terminal. Load the downloaded `ZTMY_MOJI-R` OTF from the **Font** section to generate the first preview.

## Using the preview

The preview automatically fits the first valid SVG. After that, manual zoom and pan choices are preserved when the text or orientation changes.

- Scroll over the canvas to zoom around the pointer position.
- Drag the canvas to pan.
- Use the arrow keys to pan while the canvas is focused. Hold `Shift` to move farther.
- Use `+` and `-` to zoom from the keyboard.
- Select **Fit** to show the whole SVG.
- Select **Reset** to restore the preview transform and the default layout and appearance settings.

The default layout is vertical with `160` font units of letter spacing, `20` units of padding, and a `#000000` glyph fill.

## Project commands

Run these from the project directory in Terminal.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the Vite development server. |
| `bun run build` | Type-check the project and create a production build. |
| `bun run preview` | Serve the production build locally. |
| `bun run lint` | Run ESLint across the project. |
| `bun run test` | Run the Vitest suite once. |
| `bun run test:watch` | Run Vitest in watch mode. |
| `bun run typecheck` | Run the TypeScript project checks. |
| `bun run format:check` | Check the configured code and asset formatting rules. |

## Project structure

```text
├── src/
│   ├── app/              Interface, preview behavior, and component tests
│   ├── core/
│   │   ├── font/         Font validation and OpenType adaptation
│   │   ├── svg/          Layout, canonical SVG generation, and export logic
│   │   └── ztmy/         Kana metadata used by the glyph inspector
│   ├── hooks/            Browser-side font loading state
│   ├── styles/           Global design tokens and preview styles
│   └── main.tsx          React application entry point
├── index.html            Browser document and page metadata
├── package.json          Bun scripts and project dependencies
├── bun.lock              Locked dependency versions
├── vite.config.ts        Vite, Vitest, and source alias configuration
├── LICENSE               MIT License
└── README.md
```

The exported document is a transparent, path-only SVG. Preview overlays such as the grid and bounds remain viewer-only and are not written into the exported file.

## License

The original source code and documentation in this repository are available under the [MIT License](LICENSE). Copyright © 2026 oF.

This license does not grant rights to the `ZTMY_MOJI-R` font, ZUTOMAYO names or branding, or glyph outlines generated from the font. Those remain subject to the terms published by their respective rights holders. The [official font page](https://zutomayo.net/font/) states that commercial use is not allowed.
