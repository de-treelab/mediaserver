import { type HTMLAttributes, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { pageGutter } from "./styles";

type PageProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const Page = ({ children, className, ...props }: PageProps) => (
  <div
    {...props}
    className={twMerge(
      pageGutter,
      "py-4 sm:py-6 flex flex-col gap-6",
      className,
    )}
  >
    {children}
  </div>
);

type PageHeaderProps = {
  title: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export const PageHeader = ({
  title,
  icon,
  description,
  actions,
  className,
}: PageHeaderProps) => (
  <div
    className={twMerge(
      "flex flex-col sm:flex-row sm:items-start justify-between gap-3",
      className,
    )}
  >
    <div className="flex flex-col gap-1 min-w-0">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
        {icon && <span className="text-text-muted">{icon}</span>}
        {title}
      </h1>
      {description && (
        <p className="text-sm text-text-secondary max-w-xl">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex flex-row flex-wrap items-center gap-2 shrink-0">
        {actions}
      </div>
    )}
  </div>
);

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
};

export const EmptyState = ({ children, className }: EmptyStateProps) => (
  <div
    className={twMerge("text-sm text-text-muted text-center py-12", className)}
  >
    {children}
  </div>
);
