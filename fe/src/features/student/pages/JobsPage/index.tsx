import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, MapPin, SlidersHorizontal, Sparkles } from "lucide-react";
import { jobService } from "./services/jobService";
import type { Job, JobSortBy } from "./types";
import { FilterTag } from "./components/FilterTag";
import { FilterSidebar, LOCATIONS } from "./components/FilterSidebar";
import { JobCard } from "./components/JobCard";
import donviData from "@/data/donviTDMU.json";
import { AppPagination } from "@/components/common/AppPagination";
import { useAuth } from "@/hooks/useAuth";

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

function BriefcaseIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

export const JobsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const toNumberParam = (value: string | null, fallback: number) => {
    if (value === null || value === undefined || value.trim() === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const toOptionalNumberParam = (value: string | null) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  // State Filters
  const [keyword, setKeyword] = useState(searchParams.get("name") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [source, setSource] = useState(searchParams.get("src") ?? "");
  const [sortBy, setSortBy] = useState<JobSortBy>(
    (searchParams.get("sort") as JobSortBy) || "ai_relevance"
  );
  const [salaryMin, setSalaryMin] = useState<number | undefined>(() =>
    toOptionalNumberParam(searchParams.get("salaryMin"))
  );
  const [salaryMax, setSalaryMax] = useState<number | undefined>(() =>
    toOptionalNumberParam(searchParams.get("salaryMax"))
  );
  const [industries, setIndustries] = useState<string[]>(() => {
    const t = searchParams.get("type");
    return t ? t.split(",").map((s) => s.trim()).filter(Boolean) : [];
  });
  
  // Pagination State
  const [page, setPage] = useState(() => Math.max(1, toNumberParam(searchParams.get("page"), 1)));
  const [limit, setLimit] = useState(() => Math.max(1, toNumberParam(searchParams.get("limit"), 20)));

  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Recommendations State
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationText, setRecommendationText] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const parseSalaryNumber = (job: Job) => {
    const directMin = job.salaryMin ? Number(job.salaryMin) : NaN;
    const directMax = job.salaryMax ? Number(job.salaryMax) : NaN;
    if (Number.isFinite(directMin) && Number.isFinite(directMax)) {
      return (directMin + directMax) / 2;
    }
    if (Number.isFinite(directMin)) return directMin;
    if (Number.isFinite(directMax)) return directMax;
    return -1;
  };

  const sortJobs = useCallback((items: Job[], sort: JobSortBy) => {
    const next = [...items];
    switch (sort) {
      case "score_desc":
      case "ai_relevance":
        next.sort((a, b) => (b.combinedScore ?? b.similarityScore ?? 0) - (a.combinedScore ?? a.similarityScore ?? 0));
        break;
      case "popular":
        // Dựa vào field popularityScore từ backend InteractionTrackingService
        next.sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
        break;
      case "salary_desc":
        next.sort((a, b) => parseSalaryNumber(b) - parseSalaryNumber(a));
        break;
      case "salary_asc":
        next.sort((a, b) => parseSalaryNumber(a) - parseSalaryNumber(b));
        break;
      case "latest_indexed":
        next.sort((a, b) => new Date(b.indexedAt || 0).getTime() - new Date(a.indexedAt || 0).getTime());
        break;
      default:
        break;
    }
    return next;
  }, []);

  const syncURL = useCallback((
    kw: string, loc: string, inds: string[], src: string, 
    sMin: number | undefined, sMax: number | undefined, sort: JobSortBy, pg: number
  ) => {
    const p: Record<string, string> = {};
    if (kw) p.name = kw;
    if (loc) p.location = loc;
    if (inds.length) p.type = inds.join(",");
    if (src) p.src = src;
    if (sMin != null) p.salaryMin = String(sMin);
    if (sMax != null) p.salaryMax = String(sMax);
    if (sort !== "ai_relevance") p.sort = sort;
    if (pg > 1) p.page = String(pg);
    if (limit !== 20) p.limit = String(limit);
    setSearchParams(p, { replace: true });
  }, [setSearchParams, limit]);

  const fetchJobs = useCallback(async (q: {
    keyword: string;
    location: string;
    industries: string[];
    source: string;
    salaryMin?: number;
    salaryMax?: number;
    page: number;
    limit: number;
    sortBy: JobSortBy;
  }) => {
    setLoading(true);
    try {
      // Bắn thẳng keyword và industries vào query để AI embedding xử lý ngữ nghĩa
      const semanticQuery = q.keyword.trim() || q.industries.join(" ") || "việc làm phù hợp";

      const res = await jobService.searchAdvanced({
        query: semanticQuery,
        location: q.location || undefined,
        industry: q.industries.length === 1 ? q.industries[0] : undefined,
        src: q.source || undefined,
        salaryMin: q.salaryMin,
        salaryMax: q.salaryMax,
        page: q.page,
        limit: q.limit,
      });

      let nextJobs = res.data;
      
      // Lọc local nếu chọn nhiều ngành nghề (do backend đang nhận 1 industry string)
      if (q.industries.length > 1) {
        nextJobs = nextJobs.filter((job) =>
          q.industries.some((ind) => (job.industry || "").toLowerCase().includes(ind.toLowerCase()))
        );
      }

      nextJobs = sortJobs(nextJobs, q.sortBy);
      setJobs(nextJobs);
      setTotal(q.industries.length > 1 ? nextJobs.length : res.total);
    } catch (err) {
      console.error("Lỗi khi tìm kiếm AI:", err);
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [sortJobs]);

  const runSearch = useCallback((nextPage: number, currentSort: JobSortBy) => {
    fetchJobs({ keyword, location, industries, source, salaryMin, salaryMax, page: nextPage, limit, sortBy: currentSort });
    syncURL(keyword, location, industries, source, salaryMin, salaryMax, currentSort, nextPage);
  }, [fetchJobs, industries, keyword, limit, location, salaryMax, salaryMin, source, syncURL]);

  useEffect(() => {
    runSearch(page, sortBy);
  }, [page, limit, sortBy, runSearch]);

  // Logic lấy recommendations theo API mới
  useEffect(() => {
    let canceled = false;

    const fetchRecommendations = async () => {
      setRecommendationLoading(true);
      try {
        let res;
        
        // Cập nhật API: Nếu có user, lấy dựa trên lịch sử tương tác cá nhân (Interaction Tracking)
        if (user?.id) {
          res = await jobService.getPersonalizedRecommendations({
            userId: Number(user.id),
            topK: 6,
          });
        } 
        // Fallback: Lấy dựa theo công việc gần giống kết quả tìm kiếm nhất
        else if (jobs.length > 0) {
          const anchorJob = jobs[0];
          res = await jobService.getRecommendations(anchorJob.id, { topK: 6 });
        } else {
          setRecommendedJobs([]);
          setRecommendationText("");
          return;
        }

        if (canceled) return;
        
        // Lọc bỏ các job đã có sẵn trong trang kết quả hiện tại
        const existing = new Set(jobs.map((job) => job.id));
        const filtered = res.data.filter((job: Job) => !existing.has(job.id)).slice(0, 4);
        
        setRecommendedJobs(filtered);
        setRecommendationText(res.explanation || "Dựa trên sở thích và tìm kiếm của bạn");
      } catch (err) {
        if (!canceled) {
          setRecommendedJobs([]);
          setRecommendationText("");
        }
      } finally {
        if (!canceled) setRecommendationLoading(false);
      }
    };

    fetchRecommendations();

    return () => { canceled = true; };
  }, [jobs, user?.id]);

  // Gọi hàm này khi click vào Card để track sự kiện View/Click về backend
  const handleJobInteraction = useCallback(async (jobId: number, type: 'VIEW' | 'CLICK' | 'APPLY') => {
    if (user?.id) {
      try {
        await jobService.trackInteraction({
          userId: Number(user.id),
          jobId,
          type
        });
      } catch (e) {
        console.error("Lỗi tracking interaction", e);
      }
    }
  }, [user?.id]);

  // ... (Giữ nguyên các hàm handlers filter: handleSearch, handlePageSizeChange, handleSortChange, toggleIndustry, handleClearIndustries, handleSetLocation, v.v...)
  const handleSearch = () => { setPage(1); runSearch(1, sortBy); };
  const handlePageSizeChange = (value: number) => { setLimit(value); setPage(1); };
  const handleSortChange = (value: JobSortBy) => { setSortBy(value); setPage(1); runSearch(1, value); };
  const toggleIndustry = (val: string) => { const next = industries.includes(val) ? industries.filter((i) => i !== val) : [...industries, val]; setIndustries(next); setPage(1); fetchJobs({ keyword, location, industries: next, source, salaryMin, salaryMax, page: 1, limit, sortBy }); syncURL(keyword, location, next, source, salaryMin, salaryMax, sortBy, 1); };
  const handleClearIndustries = () => { setIndustries([]); fetchJobs({ keyword, location, industries: [], source, salaryMin, salaryMax, page: 1, limit, sortBy }); syncURL(keyword, location, [], source, salaryMin, salaryMax, sortBy, 1); setPage(1); };
  const handleSetLocation = (loc: string) => { setLocation(loc); setPage(1); fetchJobs({ keyword, industries, location: loc, source, salaryMin, salaryMax, page: 1, limit, sortBy }); syncURL(keyword, loc, industries, source, salaryMin, salaryMax, sortBy, 1); };
  const handleSetSource = (src: string) => { setSource(src); setPage(1); fetchJobs({ keyword, location, industries, source: src, salaryMin, salaryMax, page: 1, limit, sortBy }); syncURL(keyword, location, industries, src, salaryMin, salaryMax, sortBy, 1); };
  const handleSetSalaryMin = (value?: number) => { setSalaryMin(value); setPage(1); fetchJobs({ keyword, location, industries, source, salaryMin: value, salaryMax, page: 1, limit, sortBy }); syncURL(keyword, location, industries, source, value, salaryMax, sortBy, 1); };
  const handleSetSalaryMax = (value?: number) => { setSalaryMax(value); setPage(1); fetchJobs({ keyword, location, industries, source, salaryMin, salaryMax: value, page: 1, limit, sortBy }); syncURL(keyword, location, industries, source, salaryMin, value, sortBy, 1); };
  const clearFilters = () => { setKeyword(""); setLocation(""); setSource(""); setSalaryMin(undefined); setSalaryMax(undefined); setSortBy("ai_relevance"); setIndustries([]); setPage(1); fetchJobs({ keyword: "", location: "", industries: [], source: "", salaryMin: undefined, salaryMax: undefined, page: 1, limit, sortBy: "ai_relevance" }); setSearchParams({}, { replace: true }); };

  const activeFilterCount = (location ? 1 : 0) + (source ? 1 : 0) + (salaryMin != null ? 1 : 0) + (salaryMax != null ? 1 : 0) + industries.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Search Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-400 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-white text-2xl font-bold mb-1">
            Tìm việc làm phù hợp
          </h1>
          <p className="text-blue-100 text-sm mb-5">
            Tìm kiếm bằng mô hình nhúng AI và nhận gợi ý công việc cá nhân hoá
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer"
              >
                <option value="">Tất cả địa điểm</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
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
          {(keyword || location || source || salaryMin != null || salaryMax != null || industries.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-blue-200 text-xs">Đang lọc:</span>
              {/* ... Giữ nguyên các FilterTag component ở đây */}
              <button onClick={clearFilters} className="text-blue-200 hover:text-white text-xs underline transition-colors">
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
            source={source}
            salaryMin={salaryMin}
            salaryMax={salaryMax}
            onToggleIndustry={toggleIndustry}
            onClearIndustries={handleClearIndustries}
            onSetLocation={handleSetLocation}
            onSetSource={handleSetSource}
            onSetSalaryMin={handleSetSalaryMin}
            onSetSalaryMax={handleSetSalaryMax}
          />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  sidebarOpen ? "bg-blue-50 border-blue-200 text-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <SlidersHorizontal size={14} /> Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <span className="text-sm text-gray-500">
                {loading ? "…" : <><strong className="text-gray-800">{total.toLocaleString()}</strong> việc làm</>}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-blue-500" />
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as JobSortBy)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="ai_relevance">AI Relevance (Đề xuất)</option>
                <option value="score_desc">Độ tương thích cao nhất</option>
                <option value="popular">Phổ biến nhất (Trending)</option>
                <option value="salary_desc">Lương: Cao đến thấp</option>
                <option value="salary_asc">Lương: Thấp đến cao</option>
                <option value="latest_indexed">Mới cập nhật</option>
              </select>
            </div>
          </div>

          {/* Cụm Suggestions Cá Nhân Hoá */}
          {(recommendationLoading || recommendedJobs.length > 0) && (
            <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                <h2 className="text-sm font-semibold text-blue-800">
                  Gợi ý công việc cho bạn (AI Model)
                </h2>
              </div>
              {recommendationText && (
                <p className="mb-3 text-xs text-blue-700">{recommendationText}</p>
              )}
              {recommendationLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-xl border border-blue-100 bg-white/80" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendedJobs.map((job) => (
                    <div onClick={() => handleJobInteraction(job.id, 'CLICK')} key={`rec-${job.id}`}>
                      <JobCard job={job} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Job cards grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse h-44" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <BriefcaseIcon size={52} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Không tìm thấy công việc phù hợp.</p>
              <button onClick={clearFilters} className="mt-3 text-sm text-blue-500 hover:underline">
                Xoá bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <div onClick={() => handleJobInteraction(job.id, 'CLICK')} key={job.id}>
                  <JobCard job={job} />
                </div>
              ))}
            </div>
          )}

          <AppPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={handlePageSizeChange}
            pageSizeOptions={[20, 40, 60]}
            activeLinkClassName="!bg-blue-500 !text-white !border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default JobsPage;