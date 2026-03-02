import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE } from "../constants";

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
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-gray-400">
        Hiển thị {(page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, total)} / {total.toLocaleString()} tin
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
          let p: number;
          if (totalPages <= 7) p = i + 1;
          else if (page <= 4) p = i + 1;
          else if (page >= totalPages - 3) p = totalPages - 6 + i;
          else p = page - 3 + i;
          return p;
        }).map((p) => (
          <button
            key={p}
            onClick={() => goPage(p)}
            className={`w-8 h-8 rounded-lg text-sm transition-colors
              ${p === page ? "bg-red-500 text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => goPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
