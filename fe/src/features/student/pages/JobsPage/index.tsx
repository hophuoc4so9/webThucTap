import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  BriefcaseBusiness,
  ChevronDown,
  X,
} from "lucide-react";
import { jobService } from "./services/jobService";
import type { Job, JobSortBy } from "./types";
import { FilterSidebar, LOCATIONS } from "./components/FilterSidebar";
import { JobCard } from "./components/JobCard";
import donviData from "@/data/donviTDMU.json";
import { AppPagination } from "@/components/common/AppPagination";
import { useAuth } from "@/hooks/useAuth";

interface NganhHoc { ten: string; id_news: string; }
interface NhomNganh { nhom: string; nganh_hoc: NganhHoc[]; }
interface DonviData { ten_truong: string; he_dao_tao: string; du_lieu_nganh: NhomNganh[]; }

const FIELD_GROUPS = (donviData as unknown as DonviData).du_lieu_nganh;

const SORT_OPTIONS: { value: JobSortBy; label: string }[] = [
  { value: "ai_relevance", label: "Phù hợp nhất (AI)" },
  { value: "score_desc", label: "Độ tương thích cao" },
  { value: "popular", label: "Phổ biến" },
  { value: "salary_desc", label: "Lương cao nhất" },
  { value: "salary_asc", label: "Lương thấp nhất" },
  { value: "latest_indexed", label: "Mới nhất" },
];

/* ─────────────────────────── helpers ─────────────────────────── */

function parseSalaryNumber(job: Job): number {
  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);
  if (min > 0 && max > 0) return (min + max) / 2;
  if (min > 0) return min;
  if (max > 0) return max;
  return -1;
}

/* ─────────────────────────── sub-components ─────────────────────────── */

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm border border-white/30">
      {label}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="hover:text-red-200 transition-colors"
      >
        <X size={11} />
      </button>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-1.5 mb-3">
        <div className="h-6 bg-gray-100 rounded-lg w-20" />
        <div className="h-6 bg-gray-100 rounded-lg w-24" />
      </div>
      <div className="pt-2.5 border-t border-gray-50 flex gap-1">
        <div className="h-4 bg-gray-100 rounded-full w-16" />
        <div className="h-4 bg-gray-100 rounded-full w-12" />
      </div>
    </div>
  );
}

/* ─────────────────────────── main page ─────────────────────────── */

export const JobsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const toNum = (v: string | null, fb: number) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n > 0 ? n : fb;
  };
  const toOptNum = (v: string | null) => {
    const n = Number(v);
    return v && Number.isFinite(n) ? n : undefined;
  };

  /* filter state */
  const [keyword, setKeyword] = useState(searchParams.get("name") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [source, setSource] = useState(searchParams.get("src") ?? "");
  const [sortBy, setSortBy] = useState<JobSortBy>((searchParams.get("sort") as JobSortBy) || "ai_relevance");
  const [salaryMin, setSalaryMin] = useState<number | undefined>(() => toOptNum(searchParams.get("salaryMin")));
  const [salaryMax, setSalaryMax] = useState<number | undefined>(() => toOptNum(searchParams.get("salaryMax")));
  const [industries, setIndustries] = useState<string[]>(() => {
    const t = searchParams.get("type");
    return t ? t.split(",").map((s) => s.trim()).filter(Boolean) : [];
  });

  /* pagination */
  const [page, setPage] = useState(() => Math.max(1, toNum(searchParams.get("page"), 1)));
  const [limit, setLimit] = useState(() => Math.max(1, toNum(searchParams.get("limit"), 20)));

  /* data */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* recommendations */
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationText, setRecommendationText] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* ── sort ── */
  const sortJobs = useCallback((items: Job[], sort: JobSortBy) => {
    const next = [...items];
    switch (sort) {
      case "score_desc":
      case "ai_relevance":
        next.sort((a, b) => (b.combinedScore ?? b.similarityScore ?? 0) - (a.combinedScore ?? a.similarityScore ?? 0));
        break;
      case "popular":
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
    }
    return next;
  }, []);

  /* ── URL sync ── */
  const syncURL = useCallback((
    kw: string, loc: string, inds: string[], src: string,
    sMin: number | undefined, sMax: number | undefined, sort: JobSortBy, pg: number,
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

  /* ── fetch jobs ── */
  const fetchJobs = useCallback(async (q: {
    keyword: string; location: string; industries: string[];
    source: string; salaryMin?: number; salaryMax?: number;
    page: number; limit: number; sortBy: JobSortBy;
  }) => {
    setLoading(true);
    try {
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
      if (q.industries.length > 1) {
        nextJobs = nextJobs.filter((job) =>
          q.industries.some((ind) => (job.industry || "").toLowerCase().includes(ind.toLowerCase()))
        );
      }
      nextJobs = sortJobs(nextJobs, q.sortBy);
      setJobs(nextJobs);
      setTotal(q.industries.length > 1 ? nextJobs.length : res.total);
    } catch {
      setJobs([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [sortJobs]);

  const runSearch = useCallback((nextPage: number, currentSort: JobSortBy) => {
    fetchJobs({ keyword, location, industries, source, salaryMin, salaryMax, page: nextPage, limit, sortBy: currentSort });
    syncURL(keyword, location, industries, source, salaryMin, salaryMax, currentSort, nextPage);
  }, [fetchJobs, industries, keyword, limit, location, salaryMax, salaryMin, source, syncURL]);

  useEffect(() => { runSearch(page, sortBy); }, [page, limit, sortBy]); // eslint-disable-line

  /* ── recommendations ── */
  useEffect(() => {
    let canceled = false;
    (async () => {
      setRecommendationLoading(true);
      try {
        let res;
        if (user?.id) {
          res = await jobService.getPersonalizedRecommendations({ userId: Number(user.id), topK: 6 });
        } else if (jobs.length > 0) {
          res = await jobService.getRecommendations(jobs[0].id, { topK: 6 });
        } else {
          setRecommendedJobs([]); setRecommendationText(""); return;
        }
        if (canceled) return;
        const existing = new Set(jobs.map((j) => j.id));
        setRecommendedJobs(res.data.filter((j: Job) => !existing.has(j.id)).slice(0, 4));
        setRecommendationText(res.explanation || "Dựa trên sở thích và tìm kiếm của bạn");
      } catch {
        if (!canceled) { setRecommendedJobs([]); setRecommendationText(""); }
      } finally {
        if (!canceled) setRecommendationLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [jobs, user?.id]); // eslint-disable-line

  /* ── interaction tracking ── */
  const trackClick = useCallback(async (jobId: number) => {
    if (!user?.id) return;
    try { await jobService.trackInteraction({ userId: Number(user.id), jobId, type: "CLICK" }); } catch { }
  }, [user?.id]);

  /* ── filter handlers ── */
  const handleSearch = () => { setPage(1); runSearch(1, sortBy); };
  const handleSortChange = (v: JobSortBy) => { setSortBy(v); setPage(1); runSearch(1, v); };
  const handlePageSizeChange = (v: number) => { setLimit(v); setPage(1); };
  const toggleIndustry = (val: string) => {
    const next = industries.includes(val) ? industries.filter((i) => i !== val) : [...industries, val];
    setIndustries(next); setPage(1);
    fetchJobs({ keyword, location, industries: next, source, salaryMin, salaryMax, page: 1, limit, sortBy });
    syncURL(keyword, location, next, source, salaryMin, salaryMax, sortBy, 1);
  };
  const handleClearIndustries = () => {
    setIndustries([]); setPage(1);
    fetchJobs({ keyword, location, industries: [], source, salaryMin, salaryMax, page: 1, limit, sortBy });
    syncURL(keyword, location, [], source, salaryMin, salaryMax, sortBy, 1);
  };
  const handleSetLocation = (loc: string) => {
    setLocation(loc); setPage(1);
    fetchJobs({ keyword, industries, location: loc, source, salaryMin, salaryMax, page: 1, limit, sortBy });
    syncURL(keyword, loc, industries, source, salaryMin, salaryMax, sortBy, 1);
  };
  const handleSetSource = (src: string) => {
    setSource(src); setPage(1);
    fetchJobs({ keyword, location, industries, source: src, salaryMin, salaryMax, page: 1, limit, sortBy });
    syncURL(keyword, location, industries, src, salaryMin, salaryMax, sortBy, 1);
  };
  const handleSetSalaryMin = (v?: number) => {
    setSalaryMin(v); setPage(1);
    fetchJobs({ keyword, location, industries, source, salaryMin: v, salaryMax, page: 1, limit, sortBy });
    syncURL(keyword, location, industries, source, v, salaryMax, sortBy, 1);
  };
  const handleSetSalaryMax = (v?: number) => {
    setSalaryMax(v); setPage(1);
    fetchJobs({ keyword, location, industries, source, salaryMin, salaryMax: v, page: 1, limit, sortBy });
    syncURL(keyword, location, industries, source, salaryMin, v, sortBy, 1);
  };
  const clearFilters = () => {
    setKeyword(""); setLocation(""); setSource(""); setSalaryMin(undefined); setSalaryMax(undefined);
    setSortBy("ai_relevance"); setIndustries([]); setPage(1);
    fetchJobs({ keyword: "", location: "", industries: [], source: "", salaryMin: undefined, salaryMax: undefined, page: 1, limit, sortBy: "ai_relevance" });
    setSearchParams({}, { replace: true });
  };

  const activeFilterCount =
    (location ? 1 : 0) + (source ? 1 : 0) +
    (salaryMin != null ? 1 : 0) + (salaryMax != null ? 1 : 0) + industries.length;

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sắp xếp";

  /* ── render ── */
  return (
    <div className="min-h-screen bg-gray-50/70">

      {/* ════ Search Banner ════ */}
      <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-4 pt-8 pb-6 overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative max-w-4xl mx-auto">
          <div className="mb-5">
            <h1 className="text-white text-xl font-bold tracking-tight mb-1">
              Tìm việc làm phù hợp với bạn
            </h1>
            <p className="text-blue-200 text-sm">
              Powered by AI Semantic Search · {total > 0 && <span className="text-white font-semibold">{total.toLocaleString()} việc làm</span>}
            </p>
          </div>

          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-xl shadow-blue-900/20">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input
                type="text"
                placeholder="Tên công việc, kỹ năng, công ty..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 transition-all"
              />
            </div>
            <div className="relative sm:w-44 shrink-0">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={14} />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer transition-all"
              >
                <option value="">Tất cả địa điểm</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all shrink-0 shadow-sm"
            >
              Tìm kiếm
            </button>
          </div>

          {/* Active filter chips */}
          {(keyword || location || source || salaryMin != null || salaryMax != null || industries.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-blue-300 text-xs">Bộ lọc:</span>
              {keyword && <FilterChip label={keyword} onRemove={() => setKeyword("")} />}
              {location && <FilterChip label={location} onRemove={() => handleSetLocation("")} />}
              {source && <FilterChip label={source} onRemove={() => handleSetSource("")} />}
              {salaryMin != null && <FilterChip label={`≥ ${(salaryMin / 1e6).toFixed(0)}tr`} onRemove={() => handleSetSalaryMin(undefined)} />}
              {salaryMax != null && <FilterChip label={`≤ ${(salaryMax / 1e6).toFixed(0)}tr`} onRemove={() => handleSetSalaryMax(undefined)} />}
              {industries.map((ind) => <FilterChip key={ind} label={ind} onRemove={() => toggleIndustry(ind)} />)}
              <button onClick={clearFilters} className="text-blue-300 hover:text-white text-xs underline underline-offset-2 transition-colors">
                Xoá tất cả
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════ Body ════ */}
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-5 flex gap-5">

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

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Toggle sidebar */}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${sidebarOpen
                    ? "bg-blue-50 border-blue-200 text-blue-600"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
              >
                <SlidersHorizontal size={13} />
                Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <span className="text-sm text-gray-400">
                {loading ? (
                  <span className="inline-block w-16 h-3 rounded bg-gray-200 animate-pulse" />
                ) : (
                  <><strong className="text-gray-700">{total.toLocaleString()}</strong> việc làm</>
                )}
              </span>
            </div>

            {/* Sort */}
            <div className="relative flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-400 shrink-0" />
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as JobSortBy)}
                  className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* ── AI Recommendations ── */}
          {(recommendationLoading || recommendedJobs.length > 0) && (
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-sky-50/60 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Sparkles size={12} className="text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-blue-800">Gợi ý dành riêng cho bạn</span>
              </div>
              {recommendationText && !recommendationLoading && (
                <p className="text-xs text-blue-600/80 mb-3 ml-8">{recommendationText}</p>
              )}
              {recommendationLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {[1, 2].map((i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {recommendedJobs.map((job) => (
                    <div key={`rec-${job.id}`} onClick={() => trackClick(job.id)}>
                      <JobCard job={job} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Job grid ── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <BriefcaseBusiness size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium mb-1">Không tìm thấy công việc phù hợp</p>
              <p className="text-gray-400 text-sm mb-4">Thử thay đổi từ khoá hoặc bộ lọc</p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium transition-colors"
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobs.map((job) => (
                <div key={job.id} onClick={() => trackClick(job.id)}>
                  <JobCard job={job} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && jobs.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsPage;