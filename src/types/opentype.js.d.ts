declare module "opentype.js" {
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface RawPath {
    commands: unknown[];
    toPathData(options?: {
      decimalPlaces?: number;
      optimize?: boolean;
      flipY?: boolean;
    }): string;
  }

  export interface Glyph {
    index: number;
    name?: string;
    path: RawPath;
    getBoundingBox(): BoundingBox;
  }

  export interface Font {
    unitsPerEm: number;
    names?: Record<string, unknown>;
    tables?: {
      cmap?: {
        glyphIndexMap?: Record<number, number>;
      };
    };
    glyphs: {
      get(index: number): Glyph | undefined;
    };
  }

  export function parse(buffer: ArrayBuffer): Font;
}