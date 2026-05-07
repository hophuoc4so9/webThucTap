import { Link } from "react-router-dom";
import { MapPin, DollarSign, Clock, Sparkles, TrendingUp } from "lucide-react";
import type { Job } from "../types";
import { formatDateDisplay, getRemainingDays } from "@/utils/date";

/* ── Helpers ── */

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* plain text — split by comma */
  }
  return raw
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatSalary(job: Job): string | null {
  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);
  if (min > 0 && max > 0 && min !== max) {
    const fmt = (n: number) =>
      (n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " tr";
    return `${fmt(min)} – ${fmt(max)}`;
  }
  if (min > 0) return (min / 1_000_000).toFixed(0) + " triệu";
  if (max > 0) return (max / 1_000_000).toFixed(0) + " triệu";
  if (job.salary && job.salary !== "0" && job.salary !== "") return job.salary;
  return null;
}

function getDeadlineInfo(deadline: string | null | undefined) {
  if (!deadline) return null;
  const days = getRemainingDays(deadline);
  if (days === null) return { label: `Hết hạn ${formatDateDisplay(deadline)}`, urgent: false, expired: false };
  if (days <= 0) return { label: "Đã hết hạn", urgent: false, expired: true };
  if (days <= 5) return { label: `Còn ${days} ngày`, urgent: true, expired: false };
  return { label: `Còn ${days} ngày`, urgent: false, expired: false };
}

/** Generate initials avatar color from company name */
function getAvatarColor(name: string): { bg: string; text: string } {
  const palette = [
    { bg: "#EFF6FF", text: "#1D4ED8" },
    { bg: "#F0FDF4", text: "#15803D" },
    { bg: "#FFF7ED", text: "#C2410C" },
    { bg: "#FDF4FF", text: "#7E22CE" },
    { bg: "#ECFDF5", text: "#047857" },
    { bg: "#FEF2F2", text: "#B91C1C" },
    { bg: "#F0F9FF", text: "#0369A1" },
    { bg: "#FAFAF9", text: "#44403C" },
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % palette.length;
  return palette[idx];
}

function CompanyAvatar({ name }: { name: string }) {
  const initials = name
    .replace(/CÔNG TY|CỔ PHẦN|TNHH|CO\.,? LTD|JSC/gi, "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const { bg, text } = getAvatarColor(name);

  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 select-none border"
      style={{ backgroundColor: bg, color: text, borderColor: `${text}22` }}
    >
      {initials || name[0]?.toUpperCase() || "?"}
    </div>
  );
}

/* ── Main component ── */

export function JobCard({ job }: { job: Job }) {
  const tags = parseTags(job.tagsRequirement);
  const salary = formatSalary(job);
  const deadline = getDeadlineInfo(job.deadline);

  /* AI score — show only when meaningful */
  const hasScore =
    job.combinedScore != null && job.combinedScore > 0;
  const scorePercent = hasScore
    ? Math.round((job.combinedScore ?? 0) * 100)
    : null;

  /* Trending badge */
  const isTrending = job.reason === "trending";

  return (
    <Link
      to={`/student/jobs/${job.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.12)] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* ── Header row ── */}
      <div className="flex items-start gap-3 mb-3">
        <CompanyAvatar name={job.company ?? "?"} />

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
            {job.title}
          </h3>
          <p className="text-[12px] text-gray-400 mt-0.5 truncate font-medium">
            {job.company ?? "—"}
          </p>
        </div>

        {/* Badge: AI score or trending */}
        {scorePercent !== null ? (
          <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100">
            <Sparkles size={9} className="text-blue-400" />
            <span className="text-[10px] font-semibold text-blue-600">{scorePercent}%</span>
          </div>
        ) : isTrending ? (
          <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100">
            <TrendingUp size={9} className="text-amber-500" />
            <span className="text-[10px] font-semibold text-amber-600">Hot</span>
          </div>
        ) : null}
      </div>

      {/* ── Meta pills ── */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {salary && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 border border-green-100 text-[11px] font-semibold text-green-700">
            <DollarSign size={10} className="shrink-0" />
            {salary}
          </span>
        )}
        {job.location && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-500">
            <MapPin size={10} className="shrink-0" />
            <span className="truncate max-w-[120px]">{job.location}</span>
          </span>
        )}
        {deadline && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${deadline.expired
                ? "bg-red-50 border-red-100 text-red-500"
                : deadline.urgent
                  ? "bg-orange-50 border-orange-100 text-orange-600"
                  : "bg-gray-50 border-gray-100 text-gray-400"
              }`}
          >
            <Clock size={10} className="shrink-0" />
            {deadline.label}
          </span>
        )}
      </div>

      {/* ── Requirement tags ── */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2.5 border-t border-gray-50 mt-auto">
          {tags.slice(0, 3).map((t, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-medium"
            >
              {t}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full text-[10px]">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}