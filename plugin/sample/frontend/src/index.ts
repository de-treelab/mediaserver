import type { FrontendPlugin } from "@lars_hagemann/mediaserver-frontend-plugin-types";
import { scorePanel } from "./scorePanel.js";
import { samplePage } from "./samplePage.js";
import { sampleHomeWidget } from "./sampleHomeWidget.js";

const plugin: FrontendPlugin = {
  id: "sample-plugin",
  name: "Sample Plugin",
  description: "Demonstrates nav items, routes, home widgets, and API access",

  navItems: [
    {
      id: "sample-page",
      path: "/sample",
      label: "Sample",
      icon: (icons) => icons.FaFlask,
      priority: 10,
    },
  ],

  documentInfo: scorePanel,

  routes: [samplePage],

  homeWidgets: [sampleHomeWidget],
};

export default plugin;
