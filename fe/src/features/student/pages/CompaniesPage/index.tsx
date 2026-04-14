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
    <div className="min-h-screen bg-blue-50/40">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 px-6 py-5 justify-center">
       <center> <h1 className="text-xl font-bold text-gray-800 mb-4">
          Khám phá công ty
        </h1></center>
         <div className="w-full">
      {/* Container canh giữa */}
      <div className="flex gap-3 max-w-xl mx-auto items-center">
        {/* Input */}
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm tên công ty, lĩnh vực..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg text-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleSearch}
          className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white 
                     rounded-lg text-sm font-medium transition-colors 
                     whitespace-nowrap"
        >
          Tìm kiếm
        </button>
      </div>
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
                className="bg-white rounded-xl border border-blue-100 h-52 animate-pulse"
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
