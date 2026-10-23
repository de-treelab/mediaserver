import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import { MdArrowDownward, MdArrowUpward, MdHome, MdTune } from "react-icons/md";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Page, PageHeader } from "../components/Page";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { PluginErrorBoundary } from "../components/PluginErrorBoundary";
import { useAppDispatch, useAppSelector } from "../app/store";
import {
  resetHomeWidgets,
  selectHiddenHomeWidgets,
  selectHomeWidgetOrder,
  setHomeWidgetOrder,
  toggleHomeWidgetHidden,
} from "../app/persistent.slice";
import { enhancedApi } from "../app/enhancedApi";
import { useIdentity } from "../hooks/usePermission";
import { pluginRegistry } from "../plugins/pluginRegistry";
import { pluginApi } from "../plugins/pluginApi";
import { pluginComponents } from "../plugins/pluginComponents";
import { standardHomeWidgets } from "../plugins/standardHomeWidgets";
import type { HomeWidget, HomeWidgetContext } from "../plugins/plugin";

const widgetContext: HomeWidgetContext = {
  React,
  api: pluginApi,
  components: pluginComponents,
  dataApi: enhancedApi,
};

/**
 * Widgets in the user's order. Widgets the user has not ordered yet (e.g. of a
 * newly installed plugin) follow by priority.
 */
const orderWidgets = (
  widgets: HomeWidget[],
  order: string[] | null,
): HomeWidget[] => {
  const unique = widgets.filter(
    (widget, i) => widgets.findIndex((w) => w.id === widget.id) === i,
  );
  const byPriority = [...unique].sort(
    (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
  );
  if (!order) return byPriority;
  const ordered = order.flatMap((id) => unique.filter((w) => w.id === id));
  return [...ordered, ...byPriority.filter((w) => !order.includes(w.id))];
};

export const HomePage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { data: identity } = useIdentity();
  const order = useAppSelector(selectHomeWidgetOrder);
  const hidden = useAppSelector(selectHiddenHomeWidgets);
  const [customizing, setCustomizing] = useState(false);

  const widgets = useMemo(
    () =>
      orderWidgets(
        [...standardHomeWidgets, ...pluginRegistry.getHomeWidgets()],
        order,
      ).filter(
        (widget) =>
          !widget.permission ||
          (identity?.permissions.includes(widget.permission) ?? false),
      ),
    [order, identity],
  );

  const move = (index: number, by: -1 | 1) => {
    const ids = widgets.map((w) => w.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    dispatch(setHomeWidgetOrder(ids));
  };

  const visibleWidgets = customizing
    ? widgets
    : widgets.filter((w) => !hidden.includes(w.id));

  return (
    <Page>
      <PageHeader
        title={t("home.title")}
        icon={<MdHome />}
        actions={
          <>
            {customizing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(resetHomeWidgets())}
              >
                {t("home.reset")}
              </Button>
            )}
            <Button
              variant={customizing ? "primary" : "outline"}
              size="sm"
              onClick={() => setCustomizing((c) => !c)}
            >
              <MdTune />
              {t(customizing ? "home.done" : "home.customize")}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-8">
        {visibleWidgets.map((widget, index) => {
          const isHidden = hidden.includes(widget.id);
          return (
            <div
              key={widget.id}
              className={twMerge(
                "flex flex-col gap-8 empty:hidden",
                customizing &&
                  "rounded-lg border border-dashed border-border p-3",
              )}
            >
              {customizing && (
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={twMerge(
                      "text-sm font-medium",
                      isHidden ? "text-text-faint" : "text-text-secondary",
                    )}
                  >
                    {t(widget.label)}
                  </span>
                  <div className="flex items-center gap-3 text-text-muted">
                    <IconButton
                      aria-label={t("home.moveUp")}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <MdArrowUpward />
                    </IconButton>
                    <IconButton
                      aria-label={t("home.moveDown")}
                      disabled={index === visibleWidgets.length - 1}
                      onClick={() => move(index, 1)}
                      className="hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <MdArrowDownward />
                    </IconButton>
                    <IconButton
                      aria-label={t(isHidden ? "home.show" : "home.hide")}
                      onClick={() =>
                        dispatch(toggleHomeWidgetHidden(widget.id))
                      }
                      className="hover:text-text-primary"
                    >
                      {isHidden ? <FaEyeSlash /> : <FaEye />}
                    </IconButton>
                  </div>
                </div>
              )}
              {!isHidden && (
                <PluginErrorBoundary pluginName={t(widget.label)}>
                  <widget.Component {...widgetContext} />
                </PluginErrorBoundary>
              )}
            </div>
          );
        })}
      </div>
    </Page>
  );
};
