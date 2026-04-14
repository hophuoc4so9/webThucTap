import React from "react";
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Globe,
  ExternalLink,
  CheckCircle2,
  X,
} from "lucide-react";
import type { Job } from "@/features/student/pages/JobsPage/types";
import { StatusBadge } from "./StatusBadge";
import { formatDateDisplay } from "@/utils/date";

/* ── Helpers ────────────────────────────────────────────── */
import { safeParse } from "../utils";

const SECTION_STYLE = {
  red: {
    border: "border-red-200",
    bar: "bg-red-500",
    title: "text-red-700",
    bg: "bg-red-50",
  },
  orange: {
    border: "border-orange-200",
    bar: "bg-orange-400",
    title: "text-orange-700",
    bg: "bg-orange-50",
  },
  green: {
    border: "border-green-200",
    bar: "bg-green-500",
    title: "text-green-700",
    bg: "bg-green-50",
  },
} as const;

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: keyof typeof SECTION_STYLE;
  children: React.ReactNode;
}) {
  const s = SECTION_STYLE[color];
  return (
    <div className={`rounded-xl border ${s.border} overflow-hidden`}>
      <div
        className={`flex items-center gap-2 px-4 py-2.5 ${s.bg} border-b ${s.border}`}
      >
        <span className={`w-1 h-4 rounded-full ${s.bar} flex-shrink-0`} />
        <h3 className={`font-semibold text-sm ${s.title}`}>{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function BulletText({
  text,
  color = "default",
}: {
  text: string;
  color?: "default" | "green";
}) {
  const lines = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const dot = color === "green" ? "bg-green-500" : "bg-red-400";
  const txt = color === "green" ? "text-green-900" : "text-gray-700";
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 text-xs ${txt} leading-relaxed`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0 mt-[5px]`}
          />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Drawer ─────────────────────────────────────────────── */
interface JobDetailDrawerProps {
  job: Job | null;
  onClose: () => void;
}

export function JobDetailDrawer({ job, onClose }: JobDetailDrawerProps) {
  if (!job) return null;

  const tags = safeParse<string[]>(job.tagsRequirement, []);
  const benefits = safeParse<string[]>(job.tagsBenefit, []);

  const metaItems = [
    { icon: DollarSign, label: "Mức lương", value: job.salary },
    { icon: Clock, label: "Hạn nộp", value: job.deadline ? formatDateDisplay(job.deadline) : undefined },
    { icon: Briefcase, label: "Loại công việc", value: job.jobType },
    {
      icon: Users,
      label: "Số lượng",
      value: job.vacancies ? `${job.vacancies} người` : null,
    },
  ].filter((m) => m.value);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Briefcase size={14} className="text-red-500" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">
              Chi tiết tin tuyển dụng
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-gray-800 leading-snug">
                {job.title}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
              {job.location && (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <MapPin size={11} />
                  {job.location}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge deadline={job.deadline} />
                {job.industry && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-medium">
                    {job.industry}
                  </span>
                )}
              </div>
            </div>
          </div>

          {metaItems.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
              {metaItems.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon
                    size={13}
                    className="text-red-400 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="text-xs font-medium text-gray-700">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {job.description && (
            <Section title="Mô tả công việc" color="red">
              <BulletText text={job.description} />
            </Section>
          )}

          {(job.requirement || tags.length > 0) && (
            <Section title="Yêu cầu ứng viên" color="orange">
              {job.requirement && <BulletText text={job.requirement} />}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {(job.benefit || benefits.length > 0) && (
            <Section title="Quyền lợi" color="green">
              {job.benefit && <BulletText text={job.benefit} color="green" />}
              {benefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {benefits.map((b, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium"
                    >
                      <CheckCircle2 size={10} />
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>

        {job.url && (
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Globe size={14} /> Xem trên trang gốc <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </>
  );
}
