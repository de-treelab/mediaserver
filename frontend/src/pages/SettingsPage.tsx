import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../sections/LanguageSelector";
import { fileTypes } from "../plugins/addFileTypePlugin";
import { themePlugins } from "../plugins/addThemePlugin";
import { applyTheme } from "../plugins/applyTheme";
import { Icon } from "../components/Icon";
import { standardTranslations, translations } from "../i18n";
import { reactIcons, type ThemePlugin } from "../plugins/plugin";
import { isPluginTrusted } from "../hooks/useIsPluginTrusted";
import { useAppDispatch, useAppSelector } from "../app/store";
import { setActiveTheme, selectActiveThemeName } from "../app/persistent.slice";
import { standardThemes } from "../plugins/standardThemes";
import { useIdentity, usePermission } from "../hooks/usePermission";
import { RolesEditor2 } from "../sections/RolesEditor2";
import { UsersTab, ConfigTab } from "../sections/AdminSection";
import { UserAvatar } from "../components/UserAvatar";
import { api } from "../app/api";
import { enhancedApi } from "../app/enhancedApi";
import { twMerge } from "tailwind-merge";
import { useState } from "react";
import { MdAccessTime, MdDeleteOutline, MdLock } from "react-icons/md";
import { Card } from "../components/Card";
import { NavGroupLabel, SectionLabel } from "../components/SectionLabel";

type Section =
  | "profile"
  | "sessions"
  | "appearance"
  | "language"
  | "plugins"
  | "roles"
  | "users"
  | "configuration";

type NavGroup = {
  label: string;
  items: { id: Section; label: string; adminOnly?: boolean }[];
};

const SettingsSection = ({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      {actions}
    </div>
    {children}
  </div>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <SectionLabel>{label}</SectionLabel>
    {children}
  </div>
);

const getUsername = (email?: string | null, name?: string | null): string => {
  if (email) return "@" + email.split("@")[0];
  if (name) return "@" + name.toLowerCase().replace(/\s+/g, ".");
  return "";
};

export const SettingsPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const activeThemeName = useAppSelector(selectActiveThemeName);
  const { data: identity } = useIdentity();
  const canManageRoles = usePermission("admin:roles");
  const canManageUsers = usePermission("admin:users");
  const isAdmin = canManageRoles || canManageUsers;

  // Profile/sessions only exist for a signed-in account (not with IdP disabled).
  const hasAccount =
    !!identity?.isAuthenticated && identity.userId !== "system";

  const [section, setSection] = useState<Section>(
    hasAccount ? "profile" : "appearance",
  );
  const { data: sessionsData, isLoading: sessionsLoading } =
    api.useListSessionsQuery(undefined, { skip: section !== "sessions" });
  const [deleteSession] = api.useDeleteSessionMutation();
  const { data: backendState } = enhancedApi.useGetBackendStateQuery(void 0, {
    skip: section !== "plugins",
  });

  const languages = Object.keys(translations).filter(
    (lng) => lng !== "languages",
  );

  const handleThemeSelect = (plugin: ThemePlugin | null) => {
    applyTheme(plugin);
    dispatch(setActiveTheme(plugin?.name ?? null));
  };

  const isThemeTrusted = (plugin: ThemePlugin) =>
    standardThemes.some((t) => t.name === plugin.name);

  const username = getUsername(identity?.email, identity?.name);

  const navGroups: NavGroup[] = [
    ...(hasAccount
      ? [
          {
            label: t("settings.nav.account", "Account"),
            items: [
              {
                id: "profile" as const,
                label: t("settings.nav.profile", "Profile"),
              },
              {
                id: "sessions" as const,
                label: t("settings.nav.sessions", "Sessions"),
              },
            ],
          },
        ]
      : []),
    {
      label: t("settings.nav.workspace", "Workspace"),
      items: [
        { id: "appearance", label: t("settings.nav.appearance", "Appearance") },
        {
          id: "language",
          label: t("settings.nav.language", "Language & translations"),
        },
      ],
    },
    {
      label: t("settings.nav.administration", "Administration"),
      items: [
        { id: "plugins", label: t("settings.nav.plugins", "Plugins") },
        {
          id: "roles",
          label: t("settings.nav.roles", "Roles"),
          adminOnly: true,
        },
        {
          id: "users",
          label: t("settings.nav.users", "Users"),
          adminOnly: true,
        },
        {
          id: "configuration",
          label: t("settings.nav.configuration", "Configuration"),
          adminOnly: true,
        },
      ],
    },
  ];

  return (
    <div className="flex min-h-full w-full">
      {/* Left nav */}
      <div className="hidden sm:flex flex-col w-56 flex-shrink-0 py-6 px-3 gap-2 sticky top-0 self-start h-[calc(100vh-64px)] sm:h-screen overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <NavGroupLabel>{group.label}</NavGroupLabel>
            {group.items.map((item) => {
              const locked = item.adminOnly && !isAdmin;
              return (
                <button
                  key={item.id}
                  onClick={() => !locked && setSection(item.id)}
                  disabled={locked}
                  className={twMerge(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                    section === item.id
                      ? "bg-surface-1 text-text-primary font-medium"
                      : locked
                        ? "text-text-faint cursor-not-allowed"
                        : "text-text-secondary hover:bg-surface-1 hover:text-text-primary",
                  )}
                >
                  {item.label}
                  {locked && <MdLock className="w-3 h-3 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        {section === "profile" && (
          <SettingsSection title={t("settings.nav.profile", "Profile")}>
            <div className="flex items-center gap-4">
              <UserAvatar
                name={identity?.name}
                email={identity?.email}
                size="lg"
              />
              <div>
                <p className="text-text-primary font-semibold">
                  {identity?.name ?? identity?.email ?? t("account.user")}
                </p>
                {username && (
                  <p className="text-text-secondary text-sm">{username}</p>
                )}
              </div>
            </div>
            {identity?.name && (
              <Field label={t("account.profile.name")}>
                <p className="text-text-primary">{identity.name}</p>
              </Field>
            )}
            {identity?.email && (
              <Field label={t("account.profile.email")}>
                <p className="text-text-primary">{identity.email}</p>
              </Field>
            )}
            {identity?.userId && (
              <Field label={t("account.profile.userId")}>
                <p className="text-text-secondary text-xs font-mono break-all">
                  {identity.userId}
                </p>
              </Field>
            )}
          </SettingsSection>
        )}

        {section === "sessions" && (
          <SettingsSection title={t("settings.nav.sessions", "Sessions")}>
            {sessionsLoading && (
              <p className="text-text-secondary text-sm">
                {t("common.loading")}
              </p>
            )}
            {sessionsData?.sessions.map((session) => (
              <div
                key={session.id}
                className={twMerge(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  session.isCurrent
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface-1",
                )}
              >
                <MdAccessTime className="text-text-secondary w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">
                    {session.browser && session.os
                      ? `${session.browser} on ${session.os}`
                      : (session.browser ??
                        session.os ??
                        t("account.sessions.unknownDevice"))}
                  </p>
                  <p className="text-text-secondary text-xs">
                    {t("account.sessions.started", {
                      date: new Date(session.createdAt).toLocaleString(),
                    })}
                  </p>
                </div>
                {session.isCurrent ? (
                  <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full flex-shrink-0">
                    {t("account.sessions.current")}
                  </span>
                ) : (
                  <button
                    onClick={() => deleteSession(session.id)}
                    title={t("account.sessions.delete")}
                    className="text-text-secondary hover:text-danger-subtle transition-colors flex-shrink-0"
                  >
                    <MdDeleteOutline size={18} />
                  </button>
                )}
              </div>
            ))}
          </SettingsSection>
        )}

        {section === "appearance" && (
          <SettingsSection title={t("settings.nav.appearance", "Appearance")}>
            <div className="flex flex-row flex-wrap gap-3">
              {themePlugins.map((plugin) => {
                const isActive =
                  activeThemeName === plugin.name ||
                  (activeThemeName === null && plugin.name === "dark");
                return (
                  <button
                    key={plugin.name}
                    onClick={() => handleThemeSelect(plugin)}
                    className={`flex flex-col gap-2 p-3 rounded-lg border-2 bg-surface-1 cursor-pointer transition-all ${
                      isActive
                        ? "border-accent"
                        : "border-border hover:border-border-strong"
                    }`}
                  >
                    <div className="flex flex-row gap-1">
                      {plugin.preview && (
                        <>
                          <div
                            className="w-6 h-6 rounded-full border border-border-strong"
                            style={{
                              backgroundColor: plugin.preview.background,
                            }}
                          />
                          <div
                            className="w-6 h-6 rounded-full border border-border-strong"
                            style={{ backgroundColor: plugin.preview.accent }}
                          />
                        </>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {plugin.description}
                    </span>
                    {!isThemeTrusted(plugin) && (
                      <span className="text-xs text-warning">
                        {t("settings.plugin.untrusted")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </SettingsSection>
        )}

        {section === "language" && (
          <SettingsSection
            title={t("settings.nav.language", "Language & translations")}
            actions={<LanguageSelector />}
          >
            {languages.map((lng) => (
              <Card key={lng}>
                <span className="font-semibold">
                  {t(`languages.${lng}.name`)}
                </span>{" "}
                ({t(`languages.${lng}.localName`)}) -{" "}
                {t(`languages.${lng}.flag`)}
                <div className="text-sm text-text-secondary mt-1">
                  {t(`settings.languageExtension.trusted`)}:{" "}
                  {t(
                    "settings.languageExtension." +
                      (lng in standardTranslations ? "yes" : "no"),
                  )}
                </div>
              </Card>
            ))}
          </SettingsSection>
        )}

        {section === "plugins" && (
          <SettingsSection title={t("settings.nav.plugins", "Plugins")}>
            <div className="flex flex-col gap-3">
              <SectionLabel>
                {t("settings.nav.frontendPlugins", "Frontend Plugins")}
              </SectionLabel>
              {fileTypes.map((plugin, index) => (
                <Card key={index} className="flex items-start gap-3">
                  <Icon
                    Icon={plugin.icon(reactIcons)}
                    size="medium"
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">
                      {plugin.description}
                    </p>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {t(`settings.plugin.trusted`)}:{" "}
                      <span
                        className={
                          isPluginTrusted(plugin)
                            ? "text-success"
                            : "text-warning"
                        }
                      >
                        {t(
                          "settings.plugin." +
                            (isPluginTrusted(plugin) ? "yes" : "no"),
                        )}
                      </span>
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <SectionLabel>
                {t("state.backendPlugins", "Backend Plugins")}
              </SectionLabel>
              {backendState?.plugins.map((plugin, index) => (
                <Card key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-surface-3 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-text-secondary uppercase">
                      {plugin.name.slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">
                      {plugin.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {plugin.description}
                    </p>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {t(`settings.plugin.trusted`)}:{" "}
                      <span
                        className={
                          plugin.trusted ? "text-success" : "text-warning"
                        }
                      >
                        {t(
                          "settings.plugin." + (plugin.trusted ? "yes" : "no"),
                        )}
                      </span>
                    </p>
                  </div>
                </Card>
              ))}
              {backendState && backendState.plugins.length === 0 && (
                <p className="text-text-secondary text-sm">
                  {t("settings.plugins.none", "No backend plugins installed.")}
                </p>
              )}
            </div>
          </SettingsSection>
        )}

        {section === "roles" && isAdmin && (
          <SettingsSection title={t("settings.nav.roles", "Roles")}>
            <RolesEditor2 />
          </SettingsSection>
        )}

        {section === "users" && isAdmin && (
          <SettingsSection title={t("settings.nav.users", "Users")}>
            <UsersTab />
          </SettingsSection>
        )}

        {section === "configuration" && isAdmin && (
          <SettingsSection
            title={t("settings.nav.configuration", "Configuration")}
          >
            <ConfigTab />
          </SettingsSection>
        )}
      </div>
    </div>
  );
};
