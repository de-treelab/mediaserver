import type { IconType } from "react-icons";
import { Icon } from "./Icon";
import { useLocation } from "react-router";
import { twMerge } from "tailwind-merge";

type Props = {
  Icon: IconType;
  pathPrefix: string;
  onClick?: () => void;
};

export const SideBarButton = ({
  Icon: IconComponent,
  pathPrefix,
  onClick,
}: Props) => {
  const location = useLocation();

  const isActive = location.pathname === pathPrefix;

  return (
    <div
      onClick={onClick}
      className={twMerge(
        `cursor-pointer p-2 hover:bg-gray-800 rounded-sm transition-colors duration-200 mb-2`,
        isActive && "bg-gray-800",
      )}
    >
      <Icon Icon={IconComponent} size="xxlarge" />
    </div>
  );
};
