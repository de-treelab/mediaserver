import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { Provider } from "react-redux";
import { persistor, store } from "./app/store.ts";
import { WebSocketContextProvider } from "./websocket/WebSocketProvider.tsx";
import { UploadContextProvider } from "./upload/UploadContextProvider.tsx";
import { standardPlugins } from "./plugins/standardPlugins.tsx";
import { addFileTypePlugin } from "./plugins/fileTypes.ts";

import "./i18n.ts";
import { PersistGate } from "redux-persist/integration/react";

standardPlugins.forEach((plugin) => {
  addFileTypePlugin(plugin);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <WebSocketContextProvider>
          <UploadContextProvider>
            <App />
          </UploadContextProvider>
        </WebSocketContextProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
);
