import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Globe,
  ExternalLink,
  X,
} from "lucide-react";
import type { Job } from "@/features/student/pages/JobsPage/types";
import { StatusBadge } from "./StatusBadge";
import { formatDateDisplay } from "@/utils/date";

interface JobDetailDrawerProps {
  job: Job | null;
  onClose: () => void;
}

export function JobDetailDrawer({ job, onClose }: JobDetailDrawerProps) {
  if (!job) return null;

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

  const formatText = (text: string): string[] => {
    if (!text) return [];

    return text
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")

      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  };

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
              <div className="mt-2">
                <StatusBadge deadline={job.deadline} />
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
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Mô tả công việc
              </h3>
              <ul className="space-y-1.5">
                {formatText(job.description).map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-[5px]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.requirement && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Yêu cầu ứng viên
              </h3>
              <ul className="space-y-1.5">
                {formatText(job.requirement).map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-[5px]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.benefit && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Quyền lợi
              </h3>
              <ul className="space-y-1.5">
                {formatText(job.benefit).map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-green-800"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-[5px]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
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
