import { PAGE_SIZE } from "../constants";
import { AppPagination } from "@/components/common/AppPagination";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  goPage: (p: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  loading,
  goPage,
}: PaginationProps) {
  if (loading || totalPages <= 1) return null;

  return (
    <AppPagination
      page={page}
      totalPages={totalPages}
      total={total}
      limit={PAGE_SIZE}
      onPageChange={goPage}
      activeLinkClassName="!bg-red-500 !text-white !border-red-500"
    />
  );
}
