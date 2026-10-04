import { useCallback, useReducer, useRef } from "react";

import { fontStateReducer, initialFontState, createLoadSequence } from "@core/font/font-state";
import { loadFontFile } from "@core/font/opentype-font";


export const useFont = () => {
  const [state, dispatch] = useReducer(fontStateReducer, initialFontState);
  const sequence = useRef(createLoadSequence());

  const load = useCallback((file: File) => {
    const current = sequence.current.begin();
    dispatch({ type: "loading", fileName: file.name });

    void loadFontFile(file).then(
      (font) => {
        if (sequence.current.isCurrent(current)) {
          dispatch({ type: "ready", font });
        }
      },
      (error: unknown) => {
        if (!sequence.current.isCurrent(current)) {
          return;
        }
        dispatch({
          type: "error",
          message: error instanceof Error ? error.message : "The font could not be loaded."
        });
      }
    );
  }, []);

  return { state, load };
};
