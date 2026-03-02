import { Link } from "react-router-dom";
import { Building2, DollarSign, MapPin, Clock } from "lucide-react";
import type { Job } from "../types";

export function JobCard({ job }: { job: Job }) {
  const tags = (() => {
    try {
      return JSON.parse(job.tagsRequirement || "[]") as string[];
    } catch {
      return [];
    }
  })();

  return (
    <Link
      to={`/student/jobs/${job.id}`}
      className="block bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0 border border-blue-100">
          <Building2 size={20} className="text-blue-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors">
            {job.title}
          </h3>
          <p className="text-gray-400 text-xs mt-0.5 truncate">
            {job.company || "—"}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        {job.salary && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <DollarSign size={12} className="flex-shrink-0" />
            <span className="truncate">{job.salary}</span>
          </div>
        )}
        {job.location && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
        )}
        {job.deadline && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={12} className="flex-shrink-0" />
            <span>Hết hạn {job.deadline}</span>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
          {tags.slice(0, 3).map((t, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-medium"
            >
              {t}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[11px]">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
