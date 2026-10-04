import type { FontAdapter } from "@core/font/font-adapter";


export type FontStatus = "required" | "loading" | "ready" | "error";

export type FontState =
  | { status: "required" }
  | { status: "loading"; fileName: string }
  | { status: "ready"; font: FontAdapter }
  | { status: "error"; message: string };

export type FontAction =
  | { type: "loading"; fileName: string }
  | { type: "ready"; font: FontAdapter }
  | { type: "error"; message: string }
  | { type: "reset" };

export const initialFontState: FontState = { status: "required" };

export const fontStateReducer = (_state: FontState, action: FontAction): FontState => {
  switch (action.type) {
    case "loading":
      return { status: "loading", fileName: action.fileName };
    case "ready":
      return { status: "ready", font: action.font };
    case "error":
      return { status: "error", message: action.message };
    case "reset":
      return initialFontState;
  }
};

export const createLoadSequence = () => {
  let current = 0;

  return {
    begin(): number {
      current += 1;
      return current;
    },
    isCurrent(sequence: number): boolean {
      return sequence === current;
    }
  };
};
