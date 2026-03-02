import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Eye,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { PAGE_SIZE } from "../constants";
import type { Job } from "@/features/student/pages/JobsPage/types";

interface JobsTableProps {
  jobs: Job[];
  page: number;
  loading: boolean;
  onPreview: (job: Job) => void;
  onDelete: (job: Job) => void;
}

export function JobsTable({
  jobs,
  page,
  loading,
  onPreview,
  onDelete,
}: JobsTableProps) {
  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-400">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-16 text-center text-gray-400">
        <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Không tìm thấy tin tuyển dụng phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {[
              "#",
              "Tiêu đề",
              "Công ty",
              "Địa điểm",
              "Ngành",
              "Lương",
              "Hạn nộp",
              "Trạng thái",
              "",
            ].map((h) => (
              <th
                key={h}
                className={`px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide ${h === "" ? "text-right" : "text-left"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {jobs.map((job, idx) => (
            <tr
              key={job.id}
              className="hover:bg-gray-50 transition-colors group"
            >
              <td className="px-4 py-3 text-xs text-gray-400">
                {(page - 1) * PAGE_SIZE + idx + 1}
              </td>
              <td className="px-4 py-3 max-w-[220px]">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Briefcase size={13} className="text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 leading-snug line-clamp-2 text-sm">
                      {job.title}
                    </p>
                    {job.jobType && (
                      <span className="text-[10px] text-gray-400">
                        {job.jobType}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 min-w-[120px]">
                  <Building2
                    size={12}
                    className="text-gray-400 flex-shrink-0"
                  />
                  <span className="line-clamp-1 text-xs text-gray-600">
                    {job.company ?? "—"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 min-w-[100px]">
                {job.location ? (
                  <div className="flex items-center gap-1">
                    <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">{job.location}</span>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 min-w-[110px]">
                {job.industry ? (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-medium">
                    {job.industry}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 min-w-[100px]">
                {job.salary ? (
                  <div className="flex items-center gap-1">
                    <DollarSign
                      size={11}
                      className="text-green-500 flex-shrink-0"
                    />
                    <span className="line-clamp-1">{job.salary}</span>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 min-w-[90px]">
                {job.deadline ? (
                  <div className="flex items-center gap-1">
                    <Calendar
                      size={11}
                      className="text-gray-400 flex-shrink-0"
                    />
                    <span>{job.deadline}</span>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge deadline={job.deadline} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onPreview(job)}
                    title="Xem chi tiết"
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(job)}
                    title="Xoá"
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
