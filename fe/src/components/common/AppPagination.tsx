import ReactPaginate from "react-paginate";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageSizeSelect } from "./PageSizeSelect";

interface AppPaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  activeLinkClassName?: string;
  summaryLabel?: string;
}

export const AppPagination = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions,
  activeLinkClassName = "!bg-blue-500 !text-white !border-blue-500",
  summaryLabel,
}: AppPaginationProps) => {
  const safePage = Math.max(1, page);
  const safeLimit = limit ?? 12;
  const safeTotal = total ?? 0;
  const start = safeTotal === 0 ? 0 : (safePage - 1) * safeLimit + 1;
  const end = safeTotal === 0 ? 0 : Math.min(safePage * safeLimit, safeTotal);

  return (
    <div className="mt-8 border-t border-gray-200 pt-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="hidden lg:block" />

        <div className="order-1 flex flex-wrap items-center justify-center gap-2 lg:order-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-medium text-gray-500">Trang</span>
            <ReactPaginate
              forcePage={Math.max(0, page - 1)}
              pageCount={totalPages}
              pageRangeDisplayed={5}
              marginPagesDisplayed={1}
              onPageChange={(e) => onPageChange(e.selected + 1)}
              previousLabel={<ChevronLeft size={16} />}
              nextLabel={<ChevronRight size={16} />}
              breakLabel="..."
              containerClassName="flex items-center gap-1.5 sm:gap-2"
              pageClassName="h-8 w-8 sm:h-9 sm:w-9"
              pageLinkClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:h-9 sm:w-9 sm:text-sm"
              previousClassName=""
              previousLinkClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 sm:h-9 sm:w-9"
              nextClassName=""
              nextLinkClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 sm:h-9 sm:w-9"
              breakClassName="px-1 text-gray-400"
              activeLinkClassName={activeLinkClassName}
              disabledClassName="opacity-40 pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
