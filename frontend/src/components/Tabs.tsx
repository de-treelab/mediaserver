import { twMerge } from "tailwind-merge";

export type TabSpec<Tabs extends string> = {
  tabId: Tabs;
  node: React.ReactNode;
};

type Props<Tabs extends string, AllowNoSelection extends boolean> = {
  allowNoSelection?: AllowNoSelection;
  currentTab:
    | NoInfer<Tabs>
    | (AllowNoSelection extends true ? undefined : never);
  onTabChange: (
    tab: NoInfer<Tabs> | (AllowNoSelection extends true ? undefined : never),
  ) => void;
  tabs: TabSpec<Tabs>[];
  className?: string;
};

export const Tabs = <
  Tabs extends string,
  AllowNoSelection extends boolean = false,
>({
  allowNoSelection,
  currentTab,
  onTabChange,
  tabs,
  className,
}: Props<Tabs, AllowNoSelection>) => {
  return (
    <div
      className={twMerge(
        "flex flex-row items-center justify-between gap-0 overflow-hidden",
        className,
      )}
    >
      {tabs.map((tab) => (
        <div
          key={tab.tabId}
          className={twMerge(
            "flex basis-0 grow p-2 justify-center  cursor-pointer hover:bg-gray-200 transition-colors duration-200",
            tab.tabId === currentTab
              ? "bg-gray-400 hover:bg-gray-400"
              : "bg-white",
          )}
          onClick={() => {
            if (allowNoSelection === true && currentTab === tab.tabId) {
              // @ts-expect-error we ignore this
              onTabChange(undefined);
            } else if (currentTab !== tab.tabId) {
              onTabChange(tab.tabId);
            }
          }}
        >
          {tab.node}
        </div>
      ))}
    </div>
  );
};
