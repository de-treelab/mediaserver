import { createBrowserRouter } from "react-router";
import { Layout } from "../pages/Layout";
import { GalleryPage } from "../pages/GalleryPage";
import { UploadPage } from "../pages/UploadPage";
import { TagsPage } from "../pages/TagsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        Component: GalleryPage,
      },
      {
        path: "upload",
        Component: UploadPage,
      },
      {
        path: "tags",
        Component: TagsPage,
      },
    ],
  },
]);
