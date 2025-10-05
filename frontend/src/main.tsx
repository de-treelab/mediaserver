import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { Provider } from "react-redux";
import { store } from "./app/store.ts";
import { WebSocketContextProvider } from "./websocket/WebSocketProvider.tsx";
import { UploadContextProvider } from "./upload/UploadContextProvider.tsx";
import * as plugins from "./plugins/standardPlugins.tsx";
import { addFileTypePlugin } from "./plugins/fileTypes.ts";

import "./i18n.ts";

addFileTypePlugin(plugins.imagePlugin);
addFileTypePlugin(plugins.videoPlugin);
addFileTypePlugin(plugins.pdfPlugin);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <WebSocketContextProvider>
        <UploadContextProvider>
          <App />
        </UploadContextProvider>
      </WebSocketContextProvider>
    </Provider>
  </StrictMode>,
);
