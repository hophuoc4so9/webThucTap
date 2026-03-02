import {
  MapPin,
  Building2,
  Send,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Job } from "../../types";

interface JobHeaderProps {
  job: Job;
  isStudent: boolean;
  applied: boolean;
  applySuccess: boolean;
  onOpenApply: () => void;
}

export function JobHeader({
  job,
  isStudent,
  applied,
  applySuccess,
  onOpenApply,
}: JobHeaderProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Building2 size={28} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-800 leading-tight mb-1">
            {job.title}
          </h1>
          <p className="text-gray-500 text-sm mb-2">{job.company}</p>
          {job.location && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={12} />
              <span>{job.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {/* Apply button */}
        {isStudent ? (
          applied || applySuccess ? (
            <span className="flex items-center gap-2 px-6 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-sm font-medium">
              <CheckCircle2 size={14} /> Đã ứng tuyển
            </span>
          ) : (
            <button
              onClick={onOpenApply}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Send size={14} /> Ứng tuyển ngay
            </button>
          )
        ) : job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Ứng tuyển ngay <ExternalLink size={14} />
          </a>
        ) : (
          <button
            disabled
            className="px-6 py-2.5 bg-gray-200 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Ứng tuyển ngay
          </button>
        )}

        {job.companyRef && (
          <Link
            to={`/student/companies/${job.companyRef.id}`}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors"
          >
            <Building2 size={14} /> Xem công ty
          </Link>
        )}
      </div>
    </div>
  );
}
