import { useState, useEffect } from "react";
import { Search, Building2 } from "lucide-react";
import { companyService } from "@/features/company/services/companyService";
import type { Company } from "@/features/company/types";
import { CompanyCard } from "./components/CompanyCard";

const PAGE_SIZE = 12;

export const CompaniesPage = () => {
  const [all, setAll] = useState<Company[]>([]);
  const [results, setResults] = useState<Company[]>([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const paged = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    companyService
      .getCompanies(1, 500)
      .then((res) => {
        setAll(res.data);
        setResults(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    const q = keyword.trim().toLowerCase();
    setPage(1);
    if (!q) {
      setResults(all);
      return;
    }
    setResults(
      all.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.shortDescription?.toLowerCase().includes(q) ||
          c.industry?.toLowerCase().includes(q),
      ),
    );
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
            : `${results.length.toLocaleString()} công ty`}
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
        ) : paged.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>Không tìm thấy công ty phù hợp.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paged.map((c) => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  ←
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const pg = start + i;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
                        pg === page
                          ? "bg-red-500 text-white border-red-500"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
