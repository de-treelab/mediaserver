import ReactPaginate from "react-paginate";
import style from "./Pagination.module.scss";
import { twMerge } from "tailwind-merge";
import { useTranslation } from "react-i18next";

type Props = {
  total: number;
  limit: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export const Pagination = ({
  total,
  limit,
  currentPage,
  onPageChange,
  className,
}: Props) => {
  const { t } = useTranslation();

  if (total < limit) return null;

  return (
    <ReactPaginate
      className={twMerge(
        "flex flex-row gap-2 justify-center",
        style["pagination"],
        className,
      )}
      pageCount={Math.ceil(total / limit)}
      onPageChange={({ selected }) => onPageChange(selected)}
      previousLabel={"< " + t("pagination.previous")}
      nextLabel={t("pagination.next") + " >"}
      forcePage={currentPage}
      pageRangeDisplayed={5}
    />
  );
};
