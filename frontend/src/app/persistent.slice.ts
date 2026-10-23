import { createSlice } from "@reduxjs/toolkit";
import type { translations } from "../i18n";
import type { RootState } from "./store";

type PersistentState = {
  language: Omit<keyof typeof translations, "languages">;
  activeThemeName: string | null;
  maxConcurrentUploads: number;
  tagInputEasyMode: boolean;
  // null: decided by screen size
  showFilmstrip: boolean | null;
};

const initialState: PersistentState = {
  language: "en",
  activeThemeName: null,
  maxConcurrentUploads: 3,
  tagInputEasyMode: true,
  showFilmstrip: null,
};

export const persistentSlice = createSlice({
  name: "local",
  initialState,
  reducers: {
    setLanguage: (state, action: { payload: PersistentState["language"] }) => {
      state.language = action.payload;
    },
    setActiveTheme: (state, action: { payload: string | null }) => {
      state.activeThemeName = action.payload;
    },
    setMaxConcurrentUploads: (state, action: { payload: number }) => {
      state.maxConcurrentUploads = Math.min(5, Math.max(1, action.payload));
    },
    setTagInputEasyMode: (state, action: { payload: boolean }) => {
      state.tagInputEasyMode = action.payload;
    },
    setShowFilmstrip: (state, action: { payload: boolean }) => {
      state.showFilmstrip = action.payload;
    },
  },
});

export const {
  setLanguage,
  setActiveTheme,
  setMaxConcurrentUploads,
  setTagInputEasyMode,
  setShowFilmstrip,
} = persistentSlice.actions;
export const persistentSliceReducer = persistentSlice.reducer;

export const selectLanguage = (state: RootState) => state.local.language;
export const selectActiveThemeName = (state: RootState) =>
  state.local.activeThemeName;
export const selectMaxConcurrentUploads = (state: RootState) =>
  state.local.maxConcurrentUploads ?? 3;
export const selectTagInputEasyMode = (state: RootState) =>
  state.local.tagInputEasyMode ?? true;
export const selectShowFilmstrip = (state: RootState) =>
  state.local.showFilmstrip ?? null;
