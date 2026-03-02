import { FileText, Pencil, Star, StarOff, Trash2, Paperclip } from "lucide-react";
import type { Cv } from "@/features/student/types";
import { fmtDate, FILE_COLOR, fileExt } from "./helpers";
import { SkillTag } from "./SkillTag";
import { ExpandSection } from "./ExpandSection";

export const CvCard = ({
  cv,
  onDelete,
  onSetDefault,
  onEdit,
}: {
  cv: Cv;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
  onEdit: (cv: Cv) => void;
}) => {
  const skills = (() => {
    try {
      return JSON.parse(cv.skills ?? "[]") as string[];
    } catch {
      return cv.skills ? [cv.skills] : [];
    }
  })();
  const ext = fileExt(cv.fileOriginalName);

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${cv.isDefault ? "border-blue-300 shadow-md shadow-blue-50" : "border-gray-200 hover:border-blue-200"}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">
                {cv.title || "CV chưa đặt tên"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Cập nhật {fmtDate(cv.updatedAt)}
              </p>
            </div>
          </div>
          {cv.isDefault && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full flex-shrink-0">
              <Star size={10} fill="white" /> Mặc định
            </span>
          )}
        </div>

        {cv.fileOriginalName && (
          <div
            className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${FILE_COLOR[ext] ?? "bg-gray-100 text-gray-600"}`}
          >
            <Paperclip size={11} />
            {cv.fileOriginalName}
          </div>
        )}

        {cv.summary && (
          <p className="mt-3 text-xs text-gray-500 line-clamp-2">
            {cv.summary}
          </p>
        )}

        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 5).map((s, i) => (
              <SkillTag key={i} label={s} />
            ))}
            {skills.length > 5 && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                +{skills.length - 5}
              </span>
            )}
          </div>
        )}
        {cv.education && (
          <ExpandSection title="Học vấn">{cv.education}</ExpandSection>
        )}
        {cv.experience && (
          <ExpandSection title="Kinh nghiệm">{cv.experience}</ExpandSection>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2">
        <button
          onClick={() => onEdit(cv)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Pencil size={13} /> Sửa
        </button>
        {!cv.isDefault && (
          <button
            onClick={() => onSetDefault(cv.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <StarOff size={13} /> Đặt mặc định
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onDelete(cv.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={13} /> Xoá
        </button>
      </div>
    </div>
  );
};
