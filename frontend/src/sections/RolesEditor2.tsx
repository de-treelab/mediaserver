import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type AdminRole } from "../app/api";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { Input } from "../components/Input";
import { EmptyState } from "../components/Page";
import { NavGroupLabel } from "../components/SectionLabel";

const NS_CONFIG: Record<string, { prefix: string; color: string }> = {
  document: { prefix: "DC", color: "bg-indigo-600" },
  tag: { prefix: "TG", color: "bg-teal-600" },
  collection: { prefix: "CL", color: "bg-emerald-600" },
  admin: { prefix: "AD", color: "bg-orange-500" },
};

const groupActions = (actions: string[]): [string, string[]][] => {
  const order = ["document", "tag", "collection", "admin"];
  const groups: Record<string, string[]> = {};
  for (const action of actions) {
    const ns = action.split(":")[0];
    if (!groups[ns]) groups[ns] = [];
    groups[ns].push(action);
  }
  return Object.entries(groups).sort(
    ([a], [b]) => order.indexOf(a) - order.indexOf(b),
  );
};

const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={disabled ? undefined : onChange}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
      checked ? "bg-accent" : "bg-surface-3"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-[3px]"
      }`}
    />
  </button>
);

const RoleListItem = ({
  role,
  isSelected,
  userCount,
  totalActions,
  onClick,
}: {
  role: AdminRole;
  isSelected: boolean;
  userCount: number;
  totalActions: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
      isSelected
        ? "bg-surface-2 text-text-primary"
        : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
    }`}
  >
    <div className="flex items-center gap-1.5 text-sm font-medium">
      <span>{role.name}</span>
      {role.isSystem && (
        <svg
          className="h-3 w-3 opacity-50 shrink-0"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1.5V4.5A3.5 3.5 0 0 0 8 1zm-2 3.5a2 2 0 1 1 4 0V6H6V4.5z" />
        </svg>
      )}
    </div>
    <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
      <span className="tabular-nums">
        {role.policies.length}/{totalActions}
      </span>
      <span>·</span>
      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5 5.5a5 5 0 0 0-10 0h10z" />
      </svg>
      <span>{userCount}</span>
    </div>
  </button>
);

const PermissionGroupCard = ({
  namespace,
  actions,
  enabledActions,
  onToggle,
  onGrantAll,
  onClearAll,
  readonly,
}: {
  namespace: string;
  actions: string[];
  enabledActions: string[];
  onToggle: (action: string) => void;
  onGrantAll: () => void;
  onClearAll: () => void;
  readonly?: boolean;
}) => {
  const { t } = useTranslation();
  const cfg = NS_CONFIG[namespace] ?? {
    prefix: namespace.slice(0, 2).toUpperCase(),
    color: "bg-surface-3",
  };
  const label = t(`admin.roles.namespaces.${namespace}`, {
    defaultValue: namespace,
  });
  const enabledCount = actions.filter((a) => enabledActions.includes(a)).length;
  const remaining = actions.length - enabledCount;

  const bulkButton = readonly ? null : enabledCount === actions.length ? (
    <Button variant="outline" size="sm" onClick={onClearAll}>
      {t("admin.roles.clearAll")}
    </Button>
  ) : enabledCount === 0 ? (
    <Button variant="outline" size="sm" onClick={onGrantAll}>
      {t("admin.roles.grantAll")}
    </Button>
  ) : (
    <Button variant="outline" size="sm" onClick={onGrantAll}>
      {t("admin.roles.grantRemaining")} ({remaining})
    </Button>
  );

  return (
    <Card className="p-0 overflow-hidden">
      <CardHeader className="justify-start">
        <span
          className={`${cfg.color} text-white text-xs font-bold px-1.5 py-0.5 rounded leading-none shrink-0`}
        >
          {cfg.prefix}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{label}</span>
          <span className="text-xs text-text-secondary ml-2">
            {t("admin.roles.actionsAllowed", {
              enabled: enabledCount,
              total: actions.length,
            })}
          </span>
        </div>
        {bulkButton}
      </CardHeader>
      <div className="divide-y divide-border">
        {actions.map((action) => {
          const isEnabled = enabledActions.includes(action);
          // ":" is i18next's namespace separator, so map to a nested key
          const desc = t(`admin.roles.actions.${action.replace(":", ".")}`, {
            defaultValue: "",
          });
          return (
            <div key={action} className="flex items-center gap-3 px-4 py-2.5">
              <Toggle
                checked={isEnabled}
                onChange={() => onToggle(action)}
                disabled={readonly}
              />
              <code
                className={`text-sm font-mono shrink-0 ${
                  isEnabled ? "text-accent" : "text-text-secondary"
                }`}
              >
                {action}
              </code>
              {desc && (
                <span className="text-sm text-text-secondary">{desc}</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const NewRolePanel = ({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (name: string, desc: string) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    await onCreate(name.trim(), desc.trim());
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h2 className="text-xl font-semibold">{t("admin.roles.newRole")}</h2>
      <div className="flex flex-col gap-3 max-w-md">
        <Input
          placeholder={t("admin.roles.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
        />
        <Input
          placeholder={t("admin.roles.descriptionPlaceholder")}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => void handleSubmit()}
          disabled={!name.trim() || loading}
        >
          {t("admin.roles.createRole")}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
};

const RoleDetailPanel = ({
  role,
  groupedActions,
  userCount,
  totalActions,
  onToggle,
  onGrantGroup,
  onClearGroup,
  onDelete,
  onClone,
}: {
  role: AdminRole;
  groupedActions: [string, string[]][];
  userCount: number;
  totalActions: number;
  onToggle: (action: string) => void;
  onGrantGroup: (actions: string[]) => void;
  onClearGroup: (actions: string[]) => void;
  onDelete: () => void;
  onClone: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{role.name}</h2>
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded border leading-none ${
                role.isSystem
                  ? "bg-badge-static border-transparent text-badge-static-text"
                  : "bg-accent-dim border-transparent text-accent-muted"
              }`}
            >
              {role.isSystem ? "SYSTEM" : "CUSTOM"}
            </span>
          </div>
          {role.description && (
            <p className="text-sm text-text-secondary mt-1">
              {role.description}
            </p>
          )}
          <p className="text-xs text-text-secondary mt-1.5 flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5 5.5a5 5 0 0 0-10 0h10z" />
            </svg>
            {userCount} {t("admin.roles.assigned")}
            <span className="mx-1">·</span>
            {t("admin.roles.permissionsGrantedCount", {
              granted: role.policies.length,
              total: totalActions,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!role.isSystem && (
            <Button
              variant="outline"
              className="text-danger-subtle hover:enabled:text-danger-subtle hover:enabled:border-danger"
              onClick={onDelete}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M6.5 1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM2 4.5A.5.5 0 0 1 2.5 4h11a.5.5 0 0 1 0 1h-.538l-.853 9.668A2 2 0 0 1 10.115 16h-4.23a2 2 0 0 1-1.994-1.832L3.038 5H2.5A.5.5 0 0 1 2 4.5z" />
              </svg>
              {t("common.delete")}
            </Button>
          )}
          <Button variant="outline" onClick={onClone}>
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
              <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
            </svg>
            {t("admin.roles.clone")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {groupedActions.map(([ns, actions]) => (
          <PermissionGroupCard
            key={ns}
            namespace={ns}
            actions={actions}
            enabledActions={role.policies}
            onToggle={onToggle}
            onGrantAll={() => onGrantGroup(actions)}
            onClearAll={() => onClearGroup(actions)}
            readonly={role.isSystem}
          />
        ))}
      </div>
    </div>
  );
};

export const RolesEditor2 = () => {
  const { t } = useTranslation();
  const { data, isLoading } = api.useListRolesQuery();
  const { data: actionsData } = api.useGetActionsQuery();
  const { data: usersData } = api.useListUsersQuery();
  const [createRole] = api.useCreateRoleMutation();
  const [deleteRole] = api.useDeleteRoleMutation();
  const [addPolicy] = api.useAddRolePolicyMutation();
  const [removePolicy] = api.useRemoveRolePolicyMutation();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");

  const availableActions = actionsData?.actions ?? [];
  const groupedActions = groupActions(availableActions);
  const totalActions = availableActions.length;

  const allRoles = data?.roles ?? [];
  const systemRoles = allRoles.filter((r) => r.isSystem);
  const customRoles = allRoles.filter((r) => !r.isSystem);

  const filterRoles = (roles: AdminRole[]) =>
    roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const selectedRole = selectedRoleId
    ? allRoles.find((r) => r.id === selectedRoleId)
    : null;

  const userCountFor = (roleId: string) =>
    usersData?.users.filter((u) => u.roles.some((r) => r.id === roleId))
      .length ?? 0;

  const selectRole = (id: string) => {
    setSelectedRoleId(id);
    setIsCreating(false);
  };

  const togglePolicy = (action: string) => {
    if (!selectedRole) return;
    if (selectedRole.policies.includes(action)) {
      void removePolicy({ roleId: selectedRole.id, action });
    } else {
      void addPolicy({ roleId: selectedRole.id, action });
    }
  };

  const grantGroup = (actions: string[]) => {
    if (!selectedRole) return;
    for (const action of actions) {
      if (!selectedRole.policies.includes(action)) {
        void addPolicy({ roleId: selectedRole.id, action });
      }
    }
  };

  const clearGroup = (actions: string[]) => {
    if (!selectedRole) return;
    for (const action of actions) {
      if (selectedRole.policies.includes(action)) {
        void removePolicy({ roleId: selectedRole.id, action });
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    await deleteRole(selectedRole.id);
    setSelectedRoleId(null);
  };

  const handleClone = async (source: AdminRole) => {
    const result = await createRole({
      name: `${source.name} (copy)`,
      description: source.description,
    });
    if ("data" in result && result.data) {
      const newId = result.data.role.id;
      for (const action of source.policies) {
        void addPolicy({ roleId: newId, action });
      }
      selectRole(newId);
    }
  };

  const handleCreate = async (name: string, desc: string) => {
    const result = await createRole({ name, description: desc || undefined });
    if ("data" in result && result.data) {
      selectRole(result.data.role.id);
    }
  };

  if (isLoading) return <div>{t("common.loading")}</div>;

  const filteredSystem = filterRoles(systemRoles);
  const filteredCustom = filterRoles(customRoles);

  return (
    <Card
      className="flex p-0 overflow-hidden h-full"
      style={{ minHeight: 520 }}
    >
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-border flex flex-col gap-2">
          <h3 className="font-semibold text-sm">{t("admin.tabs.roles")}</h3>
          <Input
            inputSize="sm"
            className="w-full text-sm"
            placeholder={t("admin.roles.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
          {filteredSystem.length > 0 && (
            <div>
              <NavGroupLabel>{t("admin.roles.systemSection")}</NavGroupLabel>
              <div className="flex flex-col gap-0.5">
                {filteredSystem.map((role) => (
                  <RoleListItem
                    key={role.id}
                    role={role}
                    isSelected={selectedRoleId === role.id && !isCreating}
                    userCount={userCountFor(role.id)}
                    totalActions={totalActions}
                    onClick={() => selectRole(role.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredCustom.length > 0 && (
            <div>
              <NavGroupLabel>{t("admin.roles.customSection")}</NavGroupLabel>
              <div className="flex flex-col gap-0.5">
                {filteredCustom.map((role) => (
                  <RoleListItem
                    key={role.id}
                    role={role}
                    isSelected={selectedRoleId === role.id && !isCreating}
                    userCount={userCountFor(role.id)}
                    totalActions={totalActions}
                    onClick={() => selectRole(role.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => {
              setIsCreating(true);
              setSelectedRoleId(null);
            }}
          >
            + {t("admin.roles.newRole")}
          </Button>
          {selectedRole && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void handleClone(selectedRole)}
            >
              {t("admin.roles.cloneNamed", { name: selectedRole.name })}
            </Button>
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto">
        {isCreating ? (
          <NewRolePanel
            onCancel={() => setIsCreating(false)}
            onCreate={handleCreate}
          />
        ) : selectedRole ? (
          <RoleDetailPanel
            role={selectedRole}
            groupedActions={groupedActions}
            userCount={userCountFor(selectedRole.id)}
            totalActions={totalActions}
            onToggle={togglePolicy}
            onGrantGroup={grantGroup}
            onClearGroup={clearGroup}
            onDelete={() => void handleDelete()}
            onClone={() => void handleClone(selectedRole)}
          />
        ) : (
          <EmptyState className="flex items-center justify-center h-full p-8">
            {t("admin.roles.selectRole")}
          </EmptyState>
        )}
      </div>
    </Card>
  );
};
