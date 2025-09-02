import type React from "react";
import type { IconType } from "react-icons";
import { twMerge } from "tailwind-merge";

const sizes = {
  xsmall: "text-sm",
  small: "text-md",
  medium: "text-xl",
  large: "text-2xl",
  xlarge: "text-3xl",
  xxlarge: "text-4xl",
};

type Props = {
  Icon: IconType;
  size: keyof typeof sizes;
  className?: string;
  title?: string;
};

export const Icon: React.FC<Props> = ({ Icon, size, className, title }) => {
  const iconSize = sizes[size];
  return <Icon className={twMerge(iconSize, className)} title={title} />;
};
