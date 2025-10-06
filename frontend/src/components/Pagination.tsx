import ReactPaginate from "react-paginate";
import style from "./Pagination.module.scss";
import { twMerge } from "tailwind-merge";

type Props = {
  total: number;
  limit: number;
  currentPage: number;
  onPageChange: (page: number) => void;
};

export const Pagination = ({
  total,
  limit,
  currentPage,
  onPageChange,
}: Props) => {
  if (total < limit) return null;

  return (
    <ReactPaginate
      className={twMerge(
        "flex flex-row gap-2 justify-center",
        style["pagination"],
      )}
      pageCount={Math.ceil(total / limit)}
      onPageChange={({ selected }) => onPageChange(selected)}
      previousLabel="<"
      nextLabel=">"
      forcePage={currentPage}
      pageRangeDisplayed={5}
    />
  );
};
