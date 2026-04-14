import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapPin,
  Globe,
  Users,
  Building2,
  ChevronLeft,
  Briefcase,
  ExternalLink,
  Factory,
  Heart,
  TrendingUp,
} from "lucide-react";
import { companyService } from "@/features/company/services/companyService";
import { jobService } from "@/features/student/pages/JobsPage/services/jobService";
import type { Company } from "@/features/company/types";
import type { Job } from "@/features/student/pages/JobsPage/types";
import { formatDateDisplay } from "@/utils/date";
import { safeParse } from "./utils";
import { InfoRow, WebsiteRow } from "./components/InfoRow";
import { SocialIcon } from "./components/SocialIcon";

type Tab = "about" | "jobs";

export const CompanyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tab, setTab] = useState<Tab>("about");
  const [loading, setLoading] = useState(true);
  const [jobsLoaded, setJobsLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await companyService.getCompanyById(id);
        if (!cancelled) setCompany(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (tab === "jobs" && !jobsLoaded && company?.name) {
      jobService
        .getJobs({ keyword: company.name, page: 1, limit: 20 })
        .then((res) => setJobs(res.data))
        .catch(console.error)
        .finally(() => setJobsLoaded(true));
    }
  }, [tab, company, jobsLoaded]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4 animate-pulse">
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center text-gray-500">
        <p>Không tìm thấy thông tin công ty.</p>
        <Link
          to="/student/companies"
          className="mt-3 inline-flex items-center gap-1 text-red-500 hover:underline text-sm"
        >
          <ChevronLeft size={16} /> Quay lại
        </Link>
      </div>
    );
  }

  const socialMedia = safeParse<Record<string, string>>(
    company.socialMedia,
    {},
  );
  const aboutImages = safeParse<string[]>(company.aboutImages, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <Link
          to="/student/companies"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 mb-4 transition-colors"
        >
          <ChevronLeft size={16} /> Danh sách công ty
        </Link>

        {/* Banner + Identity */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="relative h-44 bg-gradient-to-r from-red-400 to-rose-500">
            {company.banner && (
              <img
                src={company.banner}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </div>
          <div className="px-6 pb-5">
            <div className="flex items-end gap-4 -mt-8 mb-3">
              <div className="w-20 h-20 rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <Building2 size={32} className="text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-10">
                <h1 className="text-xl font-bold text-gray-800 leading-tight">
                  {company.name}
                </h1>
                {company.industry && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {company.industry}
                  </p>
                )}
              </div>
            </div>
            {company.shortDescription && (
              <p className="text-sm text-gray-600 mt-1">
                {company.shortDescription}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Main */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {(["about", "jobs"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      tab === t
                        ? "border-red-500 text-red-500"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t === "about"
                      ? "Giới thiệu"
                      : `Tuyển dụng${jobs.length ? ` (${jobs.length})` : ""}`}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {tab === "about" && (
                  <div className="space-y-5">
                    {company.description ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: company.description.replace(/\n/g, "<br/>"),
                        }}
                      />
                    ) : (
                      <p className="text-gray-400 text-sm">
                        Chưa có thông tin giới thiệu.
                      </p>
                    )}
                    {aboutImages.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-3 text-sm">
                          Hình ảnh
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {aboutImages.slice(0, 6).map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              className="rounded-lg w-full h-28 object-cover"
                              onError={(e) =>
                                (e.currentTarget.style.display = "none")
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "jobs" && (
                  <div>
                    {!jobsLoaded ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-24 bg-gray-100 rounded-lg animate-pulse"
                          />
                        ))}
                      </div>
                    ) : jobs.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">
                        Hiện chưa có vị trí tuyển dụng.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {jobs.map((job) => (
                          <Link
                            key={job.id}
                            to={`/student/jobs/${job.id}`}
                            className="block p-4 border border-gray-200 rounded-xl hover:border-red-300 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-medium text-sm text-gray-800 group-hover:text-red-500 transition-colors">
                                  {job.title}
                                </h4>
                                <div className="flex flex-wrap gap-3 mt-1">
                                  {job.salary && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <span className="text-green-500">$</span>
                                      {job.salary}
                                    </span>
                                  )}
                                  {job.location && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <MapPin size={10} />
                                      {job.location}
                                    </span>
                                  )}
                                  {job.deadline && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <span>⏰</span>
                                      {formatDateDisplay(job.deadline)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ExternalLink
                                size={14}
                                className="text-gray-300 group-hover:text-red-400 flex-shrink-0 mt-0.5"
                              />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0 space-y-4">
            {(company.followers != null ||
              company.currentJobOpening != null) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-700 mb-3 text-sm">
                  Thống kê
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {company.followers != null && (
                    <div className="flex flex-col items-center justify-center bg-red-50 rounded-xl p-3 text-center">
                      <Heart size={16} className="text-red-400 mb-1" />
                      <span className="text-lg font-bold text-red-600">
                        {company.followers >= 1000
                          ? `${(company.followers / 1000).toFixed(1)}k`
                          : company.followers}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        Theo dõi
                      </span>
                    </div>
                  )}
                  {company.currentJobOpening != null && (
                    <div className="flex flex-col items-center justify-center bg-green-50 rounded-xl p-3 text-center">
                      <TrendingUp size={16} className="text-green-500 mb-1" />
                      <span className="text-lg font-bold text-green-600">
                        {company.currentJobOpening}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        Việc mở
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm">
                Thông tin công ty
              </h2>
              <div className="space-y-3.5">
                {company.industry && (
                  <InfoRow
                    icon={Factory}
                    label="Lĩnh vực"
                    value={company.industry}
                  />
                )}
                {company.size && (
                  <InfoRow
                    icon={Users}
                    label="Quy mô"
                    value={`${company.size} nhân viên`}
                  />
                )}
                {company.nationality && (
                  <InfoRow
                    icon={Globe}
                    label="Quốc gia"
                    value={company.nationality}
                  />
                )}
                {company.currentJobOpening != null && (
                  <InfoRow
                    icon={Briefcase}
                    label="Đang tuyển"
                    value={`${company.currentJobOpening} vị trí`}
                  />
                )}
                {(company.address || company.shortAddress) && (
                  <InfoRow
                    icon={MapPin}
                    label="Địa chỉ"
                    value={company.address ?? company.shortAddress ?? ""}
                  />
                )}
                {company.website && <WebsiteRow website={company.website} />}
              </div>
            </div>

            {Object.keys(socialMedia).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-700 mb-3 text-sm">
                  Mạng xã hội
                </h2>
                <div className="space-y-2">
                  {Object.entries(socialMedia).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-500 transition-colors group"
                    >
                      <span className="text-gray-400 group-hover:text-red-400">
                        <SocialIcon platform={platform} size={14} />
                      </span>
                      <span className="text-xs font-medium capitalize truncate">
                        {platform.replace(/_/g, " ")}
                      </span>
                      <ExternalLink
                        size={10}
                        className="ml-auto text-gray-300 group-hover:text-red-300"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-xl p-5 text-center shadow-sm">
              <Building2 size={24} className="text-white/70 mx-auto mb-2" />
              <p className="text-white text-xs font-medium mb-3 leading-snug">
                Xem tất cả cơ hội việc làm tại {company.name}
              </p>
              <button
                onClick={() => setTab("jobs")}
                className="w-full py-2 bg-white text-red-500 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors"
              >
                Xem việc làm
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
