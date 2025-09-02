import { configureStore } from "@reduxjs/toolkit";
import { enhancedApi } from "./enhancedApi";

export const store = configureStore({
  reducer: {
    [enhancedApi.reducerPath]: enhancedApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(enhancedApi.middleware),
});
