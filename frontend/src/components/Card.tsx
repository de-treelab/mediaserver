import { type HTMLAttributes, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const Card = ({ className, children, ...props }: Props) => (
  <div
    {...props}
    className={twMerge(
      "bg-surface-1 border border-border rounded-lg p-4",
      className,
    )}
  >
    {children}
  </div>
);

/** Title bar for a `Card` rendered with `className="p-0"`. */
export const CardHeader = ({ className, children, ...props }: Props) => (
  <div
    {...props}
    className={twMerge(
      "flex items-center justify-between gap-3 px-4 py-3 border-b border-border",
      className,
    )}
  >
    {children}
  </div>
);
