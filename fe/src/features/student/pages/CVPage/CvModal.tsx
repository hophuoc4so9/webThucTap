import { useState, useRef } from "react";
import {
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cvApi } from "@/api/api/services/cv.api";
import type { Cv, CreateCvDto, UpdateCvDto } from "@/features/student/types";

export type ModalMode = "create-text" | "create-file" | "edit";

export const CvModal = ({
  initial,
  mode,
  userId,
  onClose,
  onSaved,
}: {
  initial?: Cv;
  mode: ModalMode;
  userId: number;
  onClose: () => void;
  onSaved: (cv: Cv) => void;
}) => {
  const [tab, setTab] = useState<"text" | "file">(
    mode === "create-file" ? "file" : "text",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [skills, setSkills] = useState(() => {
    try {
      return (JSON.parse(initial?.skills ?? "[]") as string[]).join(", ");
    } catch {
      return initial?.skills ?? "";
    }
  });
  const [education, setEducation] = useState(initial?.education ?? "");
  const [experience, setExperience] = useState(initial?.experience ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const ok = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!ok.includes(f.type)) {
      setError("Chỉ chấp nhận PDF, DOC, DOCX");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File tối đa 10 MB");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleSubmit = async () => {
    setError("");
    if (tab === "text" && !title.trim()) {
      setError("Vui lòng nhập tiêu đề CV");
      return;
    }
    if (tab === "file" && !file && mode !== "edit") {
      setError("Vui lòng chọn file CV");
      return;
    }
    setLoading(true);
    try {
      const skillsJson = JSON.stringify(
        skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      if (mode === "edit" && initial) {
        const dto: UpdateCvDto = {
          title,
          summary,
          skills: skillsJson,
          education,
          experience,
          isDefault,
        };
        const updated = await cvApi.update(initial.id, dto);
        if (file) await cvApi.updateFile(initial.id, file);
        onSaved(updated);
      } else if (tab === "file" && file) {
        const saved = await cvApi.uploadFile(file, {
          userId,
          title: title || file.name,
          isDefault,
        });
        onSaved(saved);
      } else {
        const dto: CreateCvDto = {
          userId,
          title,
          summary,
          skills: skillsJson,
          education,
          experience,
          isDefault,
        };
        const saved = await cvApi.create(dto);
        onSaved(saved);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50 rounded-t-2xl">
          <h2 className="font-bold text-blue-800">
            {mode === "edit" ? "Chỉnh sửa CV" : "Tạo CV mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-blue-600" />
          </button>
        </div>

        {/* Tabs */}
        {mode !== "edit" && (
          <div className="flex border-b border-gray-100">
            {(["text", "file"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-700"}`}
              >
                {t === "text" ? "✏️ CV text" : "📎 Upload file"}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          {(tab === "file" || mode === "edit") && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-blue-50/30"}`}
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              {file ? (
                <p className="text-sm font-medium text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} /> {file.name}
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    {mode === "edit" && initial?.fileOriginalName
                      ? `File hiện tại: ${initial.fileOriginalName}`
                      : "Kéo thả hoặc nhấp để chọn file"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, DOCX — tối đa 10 MB
                  </p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                hidden
                onChange={(e) =>
                  e.target.files?.[0] && handleFile(e.target.files[0])
                }
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Tiêu đề CV{" "}
              {tab === "text" && <span className="text-blue-500">*</span>}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: CV Frontend Developer 2025"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {tab === "text" && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Giới thiệu bản thân
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngắn gọn về bản thân..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Kỹ năng
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="React, TypeScript, Node.js"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ngăn cách bằng dấu phẩy
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Học vấn
                </label>
                <textarea
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  rows={2}
                  placeholder="Trường, ngành, năm tốt nghiệp..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Kinh nghiệm làm việc
                </label>
                <textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  rows={3}
                  placeholder="Công ty, vị trí, thời gian, mô tả..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>
            </>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-sm text-gray-700">Đặt làm CV mặc định</span>
          </label>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {mode === "edit" ? "Lưu thay đổi" : "Tạo CV"}
          </button>
        </div>
      </div>
    </div>
  );
};
