import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";
import { jobService } from "./services/jobService";
import type { Job, JobQuery } from "./types";
import { FilterTag } from "./components/FilterTag";
import { FilterSidebar, LOCATIONS } from "./components/FilterSidebar";
import { JobCard } from "./components/JobCard";
import donviData from "@/data/donviTDMU.json";
import { AppPagination } from "@/components/common/AppPagination";


interface NganhHoc {
  ten: string;
  id_news: string;
}
interface NhomNganh {
  nhom: string;
  nganh_hoc: NganhHoc[];
}
interface DonviData {
  ten_truong: string;
  he_dao_tao: string;
  du_lieu_nganh: NhomNganh[];
}


const FIELD_GROUPS = (donviData as unknown as DonviData).du_lieu_nganh;

function BriefcaseIcon({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

export const JobsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

 
  const [keyword, setKeyword] = useState(searchParams.get("name") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [industries, setIndustries] = useState<string[]>(() => {
    const t = searchParams.get("type");
    return t
      ? t
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  });
  const [page, setPage] = useState(() =>
    Math.max(1, parseInt(searchParams.get("page") ?? "1", 10)),
  );
  const [limit, setLimit] = useState(() =>
    Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)),
  );

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const totalPages = Math.ceil(total / limit);

 
  const syncURL = useCallback(
    (kw: string, loc: string, inds: string[], pg: number) => {
      const p: Record<string, string> = {};
      if (kw) p.name = kw;
      if (loc) p.location = loc;
      if (inds.length) p.type = inds.join(",");
      if (pg > 1) p.page = String(pg);
      if (limit !== 12) p.limit = String(limit);
      setSearchParams(p, { replace: true });
    },
    [setSearchParams, limit],
  );

  const fetchJobs = useCallback(async (q: JobQuery) => {
    setLoading(true);
    try {
      const res = await jobService.getJobs(q);
      setJobs(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs({
      keyword,
      location,
      industry: industries.join(","),
      page,
      limit,
    });
    syncURL(keyword, location, industries, page);
  }, [page, limit]);

  const handleSearch = () => {
    setPage(1);
    fetchJobs({
      keyword,
      location,
      industry: industries.join(","),
      page: 1,
      limit,
    });
    syncURL(keyword, location, industries, 1);
  };

  const handlePageSizeChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  const toggleIndustry = (val: string) => {
    const next = industries.includes(val)
      ? industries.filter((i) => i !== val)
      : [...industries, val];
    setIndustries(next);
    setPage(1);
    fetchJobs({ keyword, location, industry: next.join(","), page: 1, limit });
    syncURL(keyword, location, next, 1);
  };

  const handleClearIndustries = () => {
    setIndustries([]);
    fetchJobs({ keyword, location, page: 1, limit });
    syncURL(keyword, location, [], 1);
    setPage(1);
  };

  const handleSetLocation = (loc: string) => {
    setLocation(loc);
    setPage(1);
    fetchJobs({
      keyword,
      industry: industries.join(","),
      location: loc,
      page: 1,
      limit,
    });
    syncURL(keyword, loc, industries, 1);
  };

  const clearFilters = () => {
    setKeyword("");
    setLocation("");
    setIndustries([]);
    setPage(1);
    fetchJobs({ page: 1, limit });
    setSearchParams({}, { replace: true });
  };

  const activeFilterCount = (location ? 1 : 0) + industries.length;

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="bg-gradient-to-br from-blue-600 to-blue-400 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-white text-2xl font-bold mb-1">
            Tìm việc làm phù hợp
          </h1>
          <p className="text-blue-100 text-sm mb-5">
            Khám phá hàng nghìn cơ hội tuyển dụng từ các công ty hàng đầu
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Tên công việc, công ty..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
            <div className="relative sm:w-48">
              <MapPin
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer"
              >
                <option value="">Tất cả địa điểm</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="px-7 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              Tìm kiếm
            </button>
          </div>

          {/* Active filter tags */}
          {(keyword || location || industries.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-blue-200 text-xs">Đang lọc:</span>
              {keyword && (
                <FilterTag
                  label={`"${keyword}"`}
                  onRemove={() => {
                    setKeyword("");
                    fetchJobs({
                      location,
                      industry: industries.join(","),
                      page: 1,
                      limit,
                    });
                    syncURL("", location, industries, 1);
                  }}
                />
              )}
              {location && (
                <FilterTag
                  label={location}
                  onRemove={() => {
                    setLocation("");
                    fetchJobs({
                      keyword,
                      industry: industries.join(","),
                      page: 1,
                      limit,
                    });
                    syncURL(keyword, "", industries, 1);
                  }}
                />
              )}
              {industries.map((ind) => (
                <FilterTag
                  key={ind}
                  label={ind}
                  onRemove={() => {
                    const next = industries.filter((i) => i !== ind);
                    setIndustries(next);
                    fetchJobs({
                      keyword,
                      location,
                      industry: next.join(","),
                      page: 1,
                      limit,
                    });
                    syncURL(keyword, location, next, 1);
                  }}
                />
              ))}
              <button
                onClick={clearFilters}
                className="text-blue-200 hover:text-white text-xs underline transition-colors"
              >
                Xoá tất cả
              </button>
            </div>
          )}

        </div>
      </div>

      
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-5">
        {/* Sidebar */}
        {sidebarOpen && (
          <FilterSidebar
            fieldGroups={FIELD_GROUPS}
            industries={industries}
            location={location}
            onToggleIndustry={toggleIndustry}
            onClearIndustries={handleClearIndustries}
            onSetLocation={handleSetLocation}
          />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  sidebarOpen
                    ? "bg-blue-50 border-blue-200 text-blue-600"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <SlidersHorizontal size={14} />
                Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <span className="text-sm text-gray-500">
                {loading ? (
                  "…"
                ) : (
                  <>
                    <strong className="text-gray-800">
                      {total.toLocaleString()}
                    </strong>{" "}
                    việc làm
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Job cards grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse h-44"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <BriefcaseIcon size={52} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Không tìm thấy công việc phù hợp.</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-blue-500 hover:underline"
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <AppPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={handlePageSizeChange}
            pageSizeOptions={[12, 24, 48]}
            activeLinkClassName="!bg-blue-500 !text-white !border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
