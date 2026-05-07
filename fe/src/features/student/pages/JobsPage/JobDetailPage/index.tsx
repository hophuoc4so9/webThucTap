import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  Sparkles,
  ExternalLink,
  Eye,
  Users2,
  CalendarDays,
  Briefcase,
  Building2,
  Tag,
  FileText,
  Award,
} from "lucide-react";
import { jobService } from "../services/jobService";
import { companyService } from "@/features/company/services/companyService";
import { cvApi } from "@/api/api/services/cv.api";
import { applicationApi } from "@/api/api/services/application.api";
import type { Job } from "../types";
import type { Company } from "@/features/company/types";
import type { ApplicationFitResponse, Cv } from "@/features/student/types";
import { formatDateDisplay, getRemainingDays } from "@/utils/date";
import { ApplyModal } from "./components/ApplyModal";
import { JobCard } from "../components/JobCard";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

/** Try JSON.parse; if it fails treat as comma-separated plain text */
function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // not JSON → split by comma or newline
    return raw
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Turn description / requirement text into bullet items */
function textToLines(text: string): string[] {
  return text
    .split(/[;–]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Format salary from min/max numbers or raw string */
function formatSalary(job: Job): string | null {
  if (job.salaryMin && job.salaryMax) {
    const fmt = (n: string) =>
      (Number(n) / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " triệu";
    return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`;
  }
  if (job.salary) return job.salary;
  return null;
}

/** Deadline badge color & text */
function deadlineInfo(deadline: string | null | undefined) {
  if (!deadline) return null;
  const days = getRemainingDays(deadline);
  if (days === null) return { label: formatDateDisplay(deadline), color: "gray" as const };
  if (days <= 0) return { label: "Hết hạn", color: "red" as const };
  if (days <= 7) return { label: `Còn ${days} ngày`, color: "amber" as const };
  return { label: `Còn ${days} ngày`, color: "green" as const };
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

const colorMap = {
  blue: { dot: "#3b82f6", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  amber: { dot: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  green: { dot: "#22c55e", bg: "bg-green-50", text: "text-green-700", border: "border-green-100" },
  red: { dot: "#ef4444", bg: "bg-red-50", text: "text-red-700", border: "border-red-100" },
  gray: { dot: "#9ca3af", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-100" },
};

function SectionCard({
  title,
  icon: Icon,
  accent = "blue",
  children,
}: {
  title: string;
  icon: React.ElementType;
  accent?: keyof typeof colorMap;
  children: React.ReactNode;
}) {
  const c = colorMap[accent];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${c.border} ${c.bg}`}>
        <Icon size={15} className={c.text} />
        <h3 className={`text-xs font-semibold uppercase tracking-widest ${c.text}`}>{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function BulletList({ lines, color = "blue" }: { lines: string[]; color?: keyof typeof colorMap }) {
  const c = colorMap[color];
  return (
    <ul className="space-y-2.5">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-gray-600 leading-relaxed">
          <span
            className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full"
            style={{ background: c.dot }}
          />
          {line}
        </li>
      ))}
    </ul>
  );
}

function TagPill({ label, accent = "blue" }: { label: string; accent?: keyof typeof colorMap }) {
  const c = colorMap[accent];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {label}
    </span>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
        <Icon size={14} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <div className="text-sm font-semibold text-gray-800 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function CompanyInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /[A-ZÀ-Ỵ]/i.test(w[0]))
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base font-bold shrink-0 select-none">
      {initials || name[0]?.toUpperCase()}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */

export const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const user = useSelector((s: RootState) => s.auth.user);
  const isStudent = user?.role === "STUDENT";
  const userId = user ? Number(user.id) : 0;

  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const [applied, setApplied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [userCvs, setUserCvs] = useState<Cv[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<number | "">("");
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);
  const [fitPreview, setFitPreview] = useState<ApplicationFitResponse | null>(null);
  const [fitAnalyzing, setFitAnalyzing] = useState(false);
  const [fitError, setFitError] = useState("");

  const [relatedJobs, setRelatedJobs] = useState<Job[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  /* Fetch job + company */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await jobService.getJobById(id);
        if (cancelled) return;
        setJob(data);
        if (data.companyRef) {
          setCompany(data.companyRef);
        } else if (data.company) {
          const found = await companyService.getCompanyByName(data.company);
          if (!cancelled) setCompany(found);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id || !isStudent || !userId) return;
    let cancelled = false;
    (async () => {
      const [check, cvList] = await Promise.allSettled([
        applicationApi.checkApplied(userId, Number(id)),
        cvApi.getByUser(userId),
      ]);
      if (!cancelled) {
        if (check.status === "fulfilled") setApplied(check.value.applied);
        if (cvList.status === "fulfilled") setUserCvs(cvList.value);
      }
    })();
    return () => { cancelled = true; };
  }, [id, userId]); // eslint-disable-line

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setRelatedLoading(true);
    jobService
      .getRecommendations(Number(id), { topK: 6 })
      .then((res) => { if (!cancelled) setRelatedJobs(res.data.slice(0, 6)); })
      .catch(() => { if (!cancelled) setRelatedJobs([]); })
      .finally(() => { if (!cancelled) setRelatedLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!applyOpen || !job?.id || !userId || selectedCvId === "") {
      setFitPreview(null); setFitError(""); setFitAnalyzing(false);
      return;
    }
    let cancelled = false;
    setFitAnalyzing(true); setFitError("");
    jobService
      .fitCheck(job.id, { cvId: selectedCvId, userId })
      .then((r) => { if (!cancelled) setFitPreview(r); })
      .catch((e) => {
        if (!cancelled) {
          setFitPreview(null);
          setFitError(
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Không thể so khớp CV với công việc lúc này"
          );
        }
      })
      .finally(() => { if (!cancelled) setFitAnalyzing(false); });
    return () => { cancelled = true; };
  }, [applyOpen, job?.id, selectedCvId, userId]);

  const handleApply = async () => {
    if (!job || !userId) return;
    setApplyError(""); setApplying(true);
    try {
      await applicationApi.create({
        userId, jobId: job.id, jobTitle: job.title, companyName: job.company,
        cvId: selectedCvId !== "" ? selectedCvId : undefined,
        coverLetter: coverLetter || undefined,
      });
      setApplied(true); setApplySuccess(true); setApplyOpen(false);
    } catch (e: unknown) {
      setApplyError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Có lỗi xảy ra, vui lòng thử lại"
      );
    } finally {
      setApplying(false);
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-100 rounded-lg w-32" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
          </div>
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!job) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
          <Briefcase size={28} className="text-gray-300" />
        </div>
        <p className="text-gray-500 mb-4">Không tìm thấy thông tin công việc.</p>
        <Link to="/student/jobs" className="inline-flex items-center gap-1 text-blue-500 hover:underline text-sm">
          <ChevronLeft size={16} /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  /* ── Derived data ── */
  const requirementTags = parseTags(job.tagsRequirement);
  const benefitTags = parseTags(job.tagsBenefit);
  const descriptionLines = job.description ? textToLines(job.description) : [];
  const requirementLines = job.requirement ? textToLines(job.requirement) : [];
  const benefitLines = job.benefit ? textToLines(job.benefit) : [];
  const formattedSalary = formatSalary(job);
  const deadline = deadlineInfo(job.deadline);
  const resolvedCompany = job.companyRef ?? company;

  const deadlineColorMap = {
    red: "bg-red-50 text-red-600 border border-red-100",
    amber: "bg-amber-50 text-amber-700 border border-amber-100",
    green: "bg-green-50 text-green-700 border border-green-100",
    gray: "bg-gray-100 text-gray-500 border border-gray-100",
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Back link */}
        <Link
          to="/student/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 mb-5 transition-colors group"
        >
          <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Danh sách việc làm
        </Link>

        <div className="flex flex-col lg:flex-row gap-5">

          {/* ════════════════════ MAIN COLUMN ════════════════════ */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Hero card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-sky-400" />

              <div className="p-5">
                {/* Company logo + title */}
                <div className="flex gap-4 items-start mb-4">
                  <CompanyInitials name={job.company ?? "?"} />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-gray-900 leading-snug mb-1">{job.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 size={13} className="shrink-0 text-gray-400" />
                        {job.company}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className="shrink-0 text-gray-400" />
                          {job.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {formattedSalary && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                      <DollarSign size={12} className="text-blue-500" />
                      <span className="text-xs font-semibold text-blue-700">{formattedSalary}</span>
                    </div>
                  )}
                  {job.jobType && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                      <Briefcase size={12} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">{job.jobType}</span>
                    </div>
                  )}
                  {deadline && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${deadlineColorMap[deadline.color]}`}>
                      <CalendarDays size={12} />
                      {job.deadline && (
                        <span className="font-normal opacity-80">{formatDateDisplay(job.deadline)}</span>
                      )}
                      <span className="opacity-60">·</span>
                      <span>{deadline.label}</span>
                    </div>
                  )}
                  {job.vacancies && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                      <Users2 size={12} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">{job.vacancies} vị trí</span>
                    </div>
                  )}
                </div>

                {/* Stats footer */}
                <div className="flex items-center gap-4 pt-3.5 border-t border-gray-50 text-[11px] text-gray-400">
                  {job.viewsCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Eye size={11} /> {job.viewsCount.toLocaleString()} lượt xem
                    </span>
                  )}
                  {job.applyCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Users2 size={11} /> {job.applyCount.toLocaleString()} ứng tuyển
                    </span>
                  )}
                  {job.postedAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> Đăng {formatDateDisplay(job.postedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Yêu cầu nhanh (tags từ tagsRequirement) ── */}
            {requirementTags.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={13} className="text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Yêu cầu nhanh</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requirementTags.map((tag, i) => (
                    <TagPill key={i} label={tag} accent="amber" />
                  ))}
                </div>
              </div>
            )}

            {/* ── Mô tả công việc ── */}
            {descriptionLines.length > 0 && (
              <SectionCard title="Mô tả công việc" icon={FileText} accent="blue">
                <BulletList lines={descriptionLines} color="blue" />
              </SectionCard>
            )}

            {/* ── Yêu cầu ứng viên ── */}
            {(requirementLines.length > 0 || requirementTags.length > 0) && (
              <SectionCard title="Yêu cầu ứng viên" icon={Award} accent="amber">
                {requirementLines.length > 0 && (
                  <BulletList lines={requirementLines} color="amber" />
                )}
              </SectionCard>
            )}

            {/* ── Quyền lợi ── */}
            {(benefitLines.length > 0 || benefitTags.length > 0) && (
              <SectionCard title="Quyền lợi" icon={CheckCircle2} accent="green">
                {benefitLines.length > 0 && (
                  <BulletList lines={benefitLines} color="green" />
                )}
                {benefitTags.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${benefitLines.length > 0 ? "mt-4 pt-4 border-t border-gray-50" : ""}`}>
                    {benefitTags.map((b, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100"
                      >
                        <CheckCircle2 size={10} className="text-green-500 shrink-0" />
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {/* ── Công việc liên quan ── */}
            {(relatedLoading || relatedJobs.length > 0) && (
              <div className="pt-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Sparkles size={13} className="text-blue-500" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-800">Công việc liên quan</h2>
                  <span className="text-xs text-gray-400">— gợi ý bởi AI</span>
                </div>
                {relatedLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-white" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {relatedJobs.map((relJob) => (
                      <JobCard key={relJob.id} job={relJob} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ════════════════════ SIDEBAR ════════════════════ */}
          <aside className="lg:w-64 xl:w-72 shrink-0 space-y-4">

            {/* ── Apply card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-6">
              <p className="text-xs text-gray-400 mb-4 text-center">
                {deadline
                  ? <>Hạn nộp: <strong className={deadline.color === "red" ? "text-red-500" : "text-gray-700"}>{formatDateDisplay(job.deadline!)}</strong></>
                  : "Hạn nộp chưa xác định"
                }
              </p>

              {isStudent ? (
                applied || applySuccess ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm font-semibold border border-green-100 cursor-default"
                  >
                    <CheckCircle2 size={15} /> Đã ứng tuyển
                  </button>
                ) : (
                  <button
                    onClick={() => setApplyOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
                  >
                    Ứng tuyển ngay
                  </button>
                )
              ) : (
                <p className="text-xs text-center text-gray-400">Đăng nhập với tư cách sinh viên để ứng tuyển</p>
              )}

              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-2.5 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ExternalLink size={13} /> Xem nguồn gốc
                </a>
              )}

              {/* Divider + quick meta */}
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                {formattedSalary && (
                  <MetaRow icon={DollarSign} label="Mức lương" value={formattedSalary} />
                )}
                {job.location && (
                  <MetaRow icon={MapPin} label="Địa điểm" value={job.location} />
                )}
                {job.jobType && (
                  <MetaRow icon={Briefcase} label="Loại hình" value={job.jobType} />
                )}
                {job.vacancies && (
                  <MetaRow icon={Users2} label="Số lượng" value={`${job.vacancies} người`} />
                )}
                {job.degree && (
                  <MetaRow icon={Award} label="Bằng cấp" value={job.degree} />
                )}
                {job.experience && (
                  <MetaRow icon={Clock} label="Kinh nghiệm" value={job.experience} />
                )}
              </div>
            </div>

            {/* ── Company card ── */}
            {resolvedCompany ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <CompanyInitials name={resolvedCompany.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug truncate">{resolvedCompany.name}</p>
                    {resolvedCompany.industry && (
                      <p className="text-xs text-gray-400 truncate">{resolvedCompany.industry}</p>
                    )}
                  </div>
                </div>
                {resolvedCompany.description && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">{resolvedCompany.description}</p>
                )}
              </div>
            ) : job.company ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <CompanyInitials name={job.company} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug">{job.company}</p>
                    <p className="text-xs text-gray-400">Nhà tuyển dụng</p>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {/* ── Apply modal ── */}
      {applyOpen && (
        <ApplyModal
          jobTitle={job.title}
          userCvs={userCvs}
          selectedCvId={selectedCvId}
          coverLetter={coverLetter}
          applying={applying}
          applyError={applyError}
          fitPreview={fitPreview}
          fitAnalyzing={fitAnalyzing}
          fitError={fitError}
          onSelectCv={setSelectedCvId}
          onCoverLetterChange={setCoverLetter}
          onApply={handleApply}
          onClose={() => setApplyOpen(false)}
        />
      )}

      {/* ── Success toast ── */}
      {applySuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm animate-in slide-in-from-top-2 fade-in duration-300">
          <CheckCircle2 size={15} /> Ứng tuyển thành công!
        </div>
      )}
    </div>
  );
};

export default JobDetailPage;