import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Building2,
  GraduationCap,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Company } from "@/features/company/types";
import type { Job } from "../JobsPage/types";
import { JobCard } from "../JobsPage/components/JobCard";
import { homeApi, type TopMajor } from "./homeApi";

type FeaturedCompany = Company & { jobCount?: number };

export const HomeHighlightsSection = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<FeaturedCompany[]>([]);
  const [majors, setMajors] = useState<TopMajor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const [featuredJobs, featuredCompanies, topMajors] = await Promise.all([
          homeApi.getFeaturedJobs(6),
          homeApi.getFeaturedCompanies(8),
          homeApi.getTopMajors(8),
        ]);

        if (canceled) return;
        setJobs(featuredJobs.data ?? []);
        setCompanies(featuredCompanies.data ?? []);
        setMajors(topMajors ?? []);
      } catch {
        if (!canceled) {
          setJobs([]);
          setCompanies([]);
          setMajors([]);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    fetchHomeData();

    return () => {
      canceled = true;
    };
  }, []);

  const handleMajorClick = (major: string) => {
    const params = new URLSearchParams({ industry: major });
    navigate(`/student/jobs?${params.toString()}`);
  };

  return (
    <section className="bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
              <Sparkles size={18} />
              Dữ liệu nổi bật
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Cơ hội đang được quan tâm
            </h2>
          </div>
          <Link
            to="/student/jobs"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Xem tất cả việc làm
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Top ngành nghề nổi bật
            </h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : majors.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {majors.map((major) => (
                <button
                  key={major.name}
                  onClick={() => handleMajorClick(major.name)}
                  className="group flex min-h-20 items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                      {major.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {major.jobCount} việc đang tuyển
                    </span>
                  </span>
                  <TrendingUp
                    size={18}
                    className="ml-3 shrink-0 text-blue-400"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="py-5 text-center text-sm text-slate-400">
              Chưa có dữ liệu ngành nghề nổi bật
            </p>
          )}
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={20} className="text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Việc nổi bật
              </h3>
            </div>
            <Link
              to="/student/jobs"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Xem thêm
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={{ ...job, reason: "trending" }} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white py-8 text-center text-sm text-slate-400">
              Chưa có việc nổi bật
            </p>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Nhà tuyển dụng tiêu biểu
              </h3>
            </div>
            <Link
              to="/student/companies"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Xem thêm
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          ) : companies.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {companies.map((company) => (
                <Link
                  key={company.id}
                  to={`/student/companies/${company.id}`}
                  className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-blue-50">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <Building2 size={22} className="text-blue-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-blue-700">
                        {company.name}
                      </h4>
                      {company.industry && (
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {company.industry}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin size={13} className="shrink-0" />
                      <span className="truncate">
                        {company.shortAddress || company.address || "Việt Nam"}
                      </span>
                    </span>
                    <span className="ml-2 shrink-0 font-semibold text-blue-600">
                      {company.jobCount ?? company.currentJobOpening ?? 0} việc
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white py-8 text-center text-sm text-slate-400">
              Chưa có nhà tuyển dụng tiêu biểu
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
