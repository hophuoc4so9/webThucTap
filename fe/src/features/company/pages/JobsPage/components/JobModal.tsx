import { useState } from "react";
import {
  X,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  Save,
} from "lucide-react";
import type { Job } from "@/features/student/pages/JobsPage/types";
import type { JobFormData } from "../types";
import { EMPTY_FORM } from "../types";
import { JOB_TYPES, INDUSTRIES } from "../constants";
import { toDateInputValue, toEndOfDayIso } from "@/utils/date";

interface JobModalProps {
  open: boolean;
  editJob: Job | null;
  saving: boolean;
  onClose: () => void;
  onSave: (d: JobFormData) => void;
}

export function JobModal({
  open,
  editJob,
  saving,
  onClose,
  onSave,
}: JobModalProps) {
  const initialForm: JobFormData = editJob
    ? {
        title: editJob.title ?? "",
        location: editJob.location ?? "",
        salary: editJob.salary ?? "",
        deadline: toDateInputValue(editJob.deadline),
        industry: editJob.industry ?? "",
        jobType: editJob.jobType ?? "Toàn thời gian",
        experience: editJob.experience ?? "",
        degree: editJob.degree ?? "",
        vacancies: editJob.vacancies != null ? String(editJob.vacancies) : "",
        description: editJob.description ?? "",
        requirement: editJob.requirement ?? "",
        benefit: editJob.benefit ?? "",
        url: editJob.url ?? "",
      }
    : EMPTY_FORM;

  const [form, setForm] = useState<JobFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<JobFormData>>({});

  const set =
    (k: keyof JobFormData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const errs: Partial<JobFormData> = {};
    if (!form.title.trim()) errs.title = "Vui lòng nhập tiêu đề";
    if (!form.deadline.trim()) errs.deadline = "Vui lòng nhập hạn nộp";
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center py-6 px-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Briefcase size={16} className="text-red-500" />
            </div>
            <h2 className="font-semibold text-gray-800">
              {editJob ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng mới"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) {
              onSave({
                ...form,
                deadline: toEndOfDayIso(form.deadline),
              });
            }
          }}
          className="p-6 space-y-5"
        >
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set("title")}
              placeholder="Vd: Lập trình viên React Senior"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300
                ${errors.title ? "border-red-400 bg-red-50" : "border-gray-200"}`}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Location + Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Địa điểm
              </label>
              <div className="relative">
                <MapPin
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={form.location}
                  onChange={set("location")}
                  placeholder="Hà Nội, TP.HCM..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mức lương
              </label>
              <div className="relative">
                <DollarSign
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={form.salary}
                  onChange={set("salary")}
                  placeholder="10 – 15 triệu / tháng"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            </div>
          </div>

          {/* Deadline + Vacancies */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hạn nộp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={form.deadline}
                  onChange={set("deadline")}
                  className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300
                    ${errors.deadline ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                />
              </div>
              {errors.deadline && (
                <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Số lượng tuyển
              </label>
              <div className="relative">
                <Users
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="number"
                  value={form.vacancies}
                  onChange={set("vacancies")}
                  placeholder="5"
                  min={1}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            </div>
          </div>

          {/* Industry + JobType */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ngành nghề
              </label>
              <select
                value={form.industry}
                onChange={set("industry")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
              >
                <option value="">Chọn ngành...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Loại công việc
              </label>
              <select
                value={form.jobType}
                onChange={set("jobType")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mô tả công việc
            </label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={4}
              placeholder="Mô tả chi tiết vị trí, trách nhiệm công việc..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>

          {/* Requirement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Yêu cầu ứng viên
            </label>
            <textarea
              value={form.requirement}
              onChange={set("requirement")}
              rows={3}
              placeholder="Kỹ năng, kinh nghiệm, phẩm chất cần có..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>

          {/* Benefit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Quyền lợi
            </label>
            <textarea
              value={form.benefit}
              onChange={set("benefit")}
              rows={3}
              placeholder="Chế độ lương thưởng, bảo hiểm, du lịch..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Link ứng tuyển (tuỳ chọn)
            </label>
            <input
              type="url"
              value={form.url}
              onChange={set("url")}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium disabled:opacity-70"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {editJob ? "Đang lưu..." : "Đang đăng..."}
                </>
              ) : (
                <>
                  <Save size={14} />
                  {editJob ? "Lưu thay đổi" : "Đăng tin"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
