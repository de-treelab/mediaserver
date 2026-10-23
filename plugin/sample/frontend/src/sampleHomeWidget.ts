import type { HomeWidget } from "@lars_hagemann/mediaserver-frontend-plugin-types";

// A home page section built from the host's filmstrip. `video` matches every
// document carrying a `video:<subtype>` tag, which uploads get automatically.
export const sampleHomeWidget: HomeWidget = {
  id: "sample-plugin:videos",
  label: "Videos (Sample Plugin)",
  priority: 50,
  Component: ({ React, components }) =>
    React.createElement(components.DocumentFilmstrip, {
      title: "Videos",
      query: "video",
      limit: 12,
      hideWhenEmpty: true,
    }),
};
