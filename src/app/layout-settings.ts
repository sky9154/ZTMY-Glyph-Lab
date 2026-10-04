import { DEFAULT_LAYOUT_SETTINGS, type LayoutSettings } from "@core/svg/layout-settings";


interface LayoutSettingsState {
  settings: LayoutSettings;
  hasLayoutDraft: boolean;
  hasAppearanceDraft: boolean;
  draftResetVersion: number;
}

type LayoutSettingsAction =
  | { type: "orientation"; value: LayoutSettings["orientation"] }
  | { type: "letter-spacing"; value: number }
  | { type: "padding"; value: number }
  | { type: "fill"; value: string }
  | { type: "layout-draft"; value: boolean }
  | { type: "appearance-draft"; value: boolean }
  | { type: "reset" };

export const INITIAL_LAYOUT_SETTINGS_STATE: LayoutSettingsState = {
  settings: DEFAULT_LAYOUT_SETTINGS,
  hasLayoutDraft: false,
  hasAppearanceDraft: false,
  draftResetVersion: 0
};

export const hasResettableLayoutSettings = (state: LayoutSettingsState): boolean => {
  const { settings } = state;

  return state.hasLayoutDraft
    || state.hasAppearanceDraft
    || settings.orientation !== DEFAULT_LAYOUT_SETTINGS.orientation
    || settings.letterSpacing !== DEFAULT_LAYOUT_SETTINGS.letterSpacing
    || settings.padding !== DEFAULT_LAYOUT_SETTINGS.padding
    || settings.fill !== DEFAULT_LAYOUT_SETTINGS.fill;
};

const updateSettings = (state: LayoutSettingsState, settings: LayoutSettings): LayoutSettingsState => {
  const current = state.settings;

  if (current.orientation === settings.orientation
    && current.letterSpacing === settings.letterSpacing
    && current.padding === settings.padding
    && current.fill === settings.fill) {
    return state;
  }

  return { ...state, settings };
};

export const reduceLayoutSettings = (
  state: LayoutSettingsState,
  action: LayoutSettingsAction
): LayoutSettingsState => {
  if (action.type === "reset") {
    if (!hasResettableLayoutSettings(state)) {
      return state;
    }

    return {
      settings: DEFAULT_LAYOUT_SETTINGS,
      hasLayoutDraft: false,
      hasAppearanceDraft: false,
      draftResetVersion: state.draftResetVersion + 1
    };
  }

  if (action.type === "layout-draft") {
    return state.hasLayoutDraft === action.value
      ? state
      : { ...state, hasLayoutDraft: action.value };
  }

  if (action.type === "appearance-draft") {
    return state.hasAppearanceDraft === action.value
      ? state
      : { ...state, hasAppearanceDraft: action.value };
  }

  switch (action.type) {
    case "orientation":
      return updateSettings(state, { ...state.settings, orientation: action.value });
    case "letter-spacing":
      return updateSettings(state, { ...state.settings, letterSpacing: action.value });
    case "padding":
      return updateSettings(state, { ...state.settings, padding: action.value });
    case "fill":
      return updateSettings(state, { ...state.settings, fill: action.value });
  }
};
