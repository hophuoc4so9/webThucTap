import { useState, useEffect } from "react";
import { Search, Building2 } from "lucide-react";
import { companyService } from "@/features/company/services/companyService";
import type { Company } from "@/features/company/types";
import { CompanyCard } from "./components/CompanyCard";
import { AppPagination } from "@/components/common/AppPagination";

const DEFAULT_PAGE_SIZE = 12;

export const CompaniesPage = () => {
  const [results, setResults] = useState<Company[]>([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    setLoading(true);
    companyService
      .getCompanies(page, limit, keyword.trim() || undefined)
      .then((res) => {
        setResults(res.data);
        setTotal(res.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, keyword, limit]);

  const handleSearch = () => {
    setPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-800 mb-4">
          Khám phá công ty
        </h1>
        <div className="flex gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm tên công ty, lĩnh vực..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <p className="text-sm text-gray-500 mb-5">
          {loading
            ? "Đang tải..."
            : `${total.toLocaleString()} công ty`}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 h-52 animate-pulse"
              />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>Không tìm thấy công ty phù hợp.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((c) => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </div>

            <AppPagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={handlePageSizeChange}
              pageSizeOptions={[12, 24, 48]}
              activeLinkClassName="!bg-red-500 !text-white !border-red-500"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
