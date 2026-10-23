import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const variants = {
  primary: "bg-accent hover:enabled:bg-accent-hover text-text-primary",
  ghost: "text-text-muted hover:enabled:text-text-primary",
  danger: "bg-danger hover:enabled:bg-danger-hover text-text-primary",
  outline:
    "border border-border text-text-secondary hover:enabled:border-border-strong hover:enabled:text-text-primary",
  secondary:
    "bg-surface-2 border border-border hover:enabled:bg-surface-3 text-text-secondary",
};

const sizes = {
  sm: "px-2.5 py-1 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  children: ReactNode;
};

export const Button = ({
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...props
}: Props) => (
  <button
    {...props}
    disabled={disabled}
    className={twMerge(
      "inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer",
      sizes[size],
      variants[variant],
      disabled && "opacity-50 cursor-not-allowed",
      className,
    )}
  >
    {children}
  </button>
);
