import type { HomeWidget } from "./plugin";
import {
  CollectionsWidget,
  RecentWidget,
  RediscoverWidget,
  SharedWithMeWidget,
} from "../sections/HomeWidgets";

// Labels are translation keys; plugin widgets pass plain text instead
export const standardHomeWidgets: HomeWidget[] = [
  {
    id: "builtin:recent",
    label: "home.widgets.recent",
    priority: 10,
    Component: RecentWidget,
  },
  {
    id: "builtin:shared",
    label: "home.widgets.shared",
    priority: 20,
    Component: SharedWithMeWidget,
  },
  {
    id: "builtin:collections",
    label: "home.widgets.collections",
    priority: 30,
    permission: "collection:read",
    Component: CollectionsWidget,
  },
  {
    id: "builtin:rediscover",
    label: "home.widgets.rediscover",
    priority: 40,
    Component: RediscoverWidget,
  },
];
