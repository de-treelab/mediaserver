import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Small uppercase caption above a group of content (field, list, panel). */
export const SectionLabel = ({ children, className }: Props) => (
  <p
    className={twMerge(
      "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted",
      className,
    )}
  >
    {children}
  </p>
);

/** Group caption inside navigation lists (sidebar, settings, role list). */
export const NavGroupLabel = ({ children, className }: Props) => (
  <p
    className={twMerge(
      "px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-widest text-text-faint select-none",
      className,
    )}
  >
    {children}
  </p>
);
