import type { ReactNode } from "react";
import style from "./Pagination.module.scss";
import { twMerge } from "tailwind-merge";
import { useTranslation } from "react-i18next";

type Props = {
  hasPrevious: boolean;
  hasNext: boolean;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  className?: string;
};

/**
 * First / previous / next / last navigation for cursor paginated listings,
 * which (unlike `Pagination`) cannot jump to arbitrary page numbers.
 */
export const CursorPagination = ({
  hasPrevious,
  hasNext,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  className,
}: Props) => {
  const { t } = useTranslation();

  if (!hasPrevious && !hasNext) return null;

  const item = (
    label: ReactNode,
    enabled: boolean,
    onClick: () => void,
    kind: "previous" | "next",
  ) => (
    <li className={twMerge(kind, !enabled && "disabled")}>
      <a
        role="button"
        tabIndex={enabled ? 0 : -1}
        aria-disabled={!enabled}
        onClick={enabled ? onClick : undefined}
        onKeyDown={(e) => {
          if (enabled && (e.key === "Enter" || e.key === " ")) onClick();
        }}
      >
        {label}
      </a>
    </li>
  );

  return (
    <ul
      className={twMerge(
        "flex flex-row gap-2 justify-center",
        style["pagination"],
        className,
      )}
    >
      {item(
        <>
          &laquo;{" "}
          <span className="hidden sm:inline">{t("pagination.first")}</span>
        </>,
        hasPrevious,
        onFirst,
        "previous",
      )}
      {item(
        <>
          &lt;{" "}
          <span className="hidden sm:inline">{t("pagination.previous")}</span>
        </>,
        hasPrevious,
        onPrevious,
        "previous",
      )}
      {item(
        <>
          <span className="hidden sm:inline">{t("pagination.next")}</span> &gt;
        </>,
        hasNext,
        onNext,
        "next",
      )}
      {item(
        <>
          <span className="hidden sm:inline">{t("pagination.last")}</span>{" "}
          &raquo;
        </>,
        hasNext,
        onLast,
        "next",
      )}
    </ul>
  );
};
