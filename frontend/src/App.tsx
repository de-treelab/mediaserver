import { RouterProvider } from "react-router";
import "./App.css";
import { FileUploadView } from "./sections/FileUploadView";
import { router } from "./app/router";

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <FileUploadView />
    </>
  );
}
