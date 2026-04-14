import {
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import type { Job } from "@/features/student/pages/JobsPage/types";
import { StatusBadge } from "./StatusBadge";
import { PAGE_SIZE } from "../constants";
import { formatDateDisplay } from "@/utils/date";

interface JobsTableProps {
  jobs: Job[];
  page: number;
  loading: boolean;
  companyName: string;
  onPreview: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
  onCreateFirst: () => void;
}

export function JobsTable({
  jobs,
  page,
  loading,
  companyName,
  onPreview,
  onEdit,
  onDelete,
  onCreateFirst,
}: JobsTableProps) {
  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-400">Đang tải...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-16 text-center">
        <Briefcase size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 text-sm mb-4">
          Chưa có tin tuyển dụng nào cho <strong>{companyName}</strong>.
        </p>
        <button
          onClick={onCreateFirst}
          className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors inline-flex items-center gap-2"
        >
          <Plus size={14} /> Đăng tin đầu tiên
        </button>
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
              "Vị trí tuyển dụng",
              "Địa điểm",
              "Lương",
              "Hạn nộp",
              "Trạng thái",
              "",
            ].map((h) => (
              <th
                key={h}
                className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide
                ${h === "" ? "text-right" : "text-left"}`}
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
              <td className="px-4 py-3.5 text-xs text-gray-400">
                {(page - 1) * PAGE_SIZE + idx + 1}
              </td>
              <td className="px-4 py-3.5 max-w-[220px]">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Briefcase size={14} className="text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 line-clamp-1 text-sm">
                      {job.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {job.jobType ?? "Toàn thời gian"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 text-xs text-gray-500">
                {job.location ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">{job.location}</span>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3.5 text-xs text-gray-600">
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
              <td className="px-4 py-3.5 text-xs text-gray-500">
                {job.deadline ? (
                  <div className="flex items-center gap-1">
                    <Calendar
                      size={11}
                      className="text-gray-400 flex-shrink-0"
                    />
                    {formatDateDisplay(job.deadline)}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge deadline={job.deadline} />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onPreview(job)}
                    title="Xem"
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => onEdit(job)}
                    title="Sửa"
                    className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
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
