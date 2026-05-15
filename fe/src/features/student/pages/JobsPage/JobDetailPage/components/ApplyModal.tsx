import { Link } from "react-router-dom";
import { X, AlertCircle, FileText, Send, Sparkles, Loader2 } from "lucide-react";
import type { ApplicationFitResponse, Cv } from "@/features/student/types";

interface ApplyModalProps {
  jobTitle: string;
  userCvs: Cv[];
  selectedCvId: number | "";
  coverLetter: string;
  applying: boolean;
  applyError: string;
  fitPreview?: ApplicationFitResponse | null;
  fitAnalyzing?: boolean;
  fitError?: string;
  onSelectCv: (id: number | "") => void;
  onCoverLetterChange: (text: string) => void;
  onApply: () => void;
  onClose: () => void;
}

export function ApplyModal({
  jobTitle,
  userCvs,
  selectedCvId,
  coverLetter,
  applying,
  applyError,
  fitPreview,
  fitAnalyzing,
  fitError,
  onSelectCv,
  onCoverLetterChange,
  onApply,
  onClose,
}: ApplyModalProps) {
  const recMap: Record<ApplicationFitResponse["recommendation"], string> = {
    "use-current-cv": "Dùng CV hiện tại",
    "revise-current-cv": "Nên sửa CV hiện tại",
    "create-new-cv": "Nên tạo CV mới cho job này",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800">Ứng tuyển</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
              {jobTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {applyError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              <AlertCircle size={15} className="flex-shrink-0" /> {applyError}
            </div>
          )}

          {/* CV selection */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Chọn CV ứng tuyển
            </label>
            {userCvs.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                Bạn chưa có CV nào.{" "}
                <Link
                  to="/student/cv"
                  className="font-semibold underline"
                  onClick={onClose}
                >
                  Tạo CV ngay
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                  <input
                    type="radio"
                    name="cv"
                    value=""
                    checked={selectedCvId === ""}
                    onChange={() => onSelectCv("")}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    Không đính kèm CV
                  </span>
                </label>
                {userCvs.map((cv) => (
                  <label
                    key={cv.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCvId === cv.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cv"
                      value={cv.id}
                      checked={selectedCvId === cv.id}
                      onChange={() => onSelectCv(cv.id)}
                      className="accent-blue-500"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText
                        size={14}
                        className="text-blue-400 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {cv.title || "CV chưa đặt tên"}
                        </p>
                        {cv.fileOriginalName && (
                          <p className="text-xs text-gray-400 truncate">
                            {cv.fileOriginalName}
                          </p>
                        )}
                      </div>
                      {cv.isDefault && (
                        <span className="ml-auto flex-shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded">
                          Mặc định
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedCvId !== "" && (
            <div className="p-3 rounded-xl border border-violet-100 bg-violet-50/80">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-violet-600" />
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  So khớp CV với công việc
                </p>
              </div>
              {fitAnalyzing ? (
                <div className="flex items-center gap-2 text-sm text-violet-700">
                  <Loader2 size={14} className="animate-spin" /> Đang phân tích độ phù hợp...
                </div>
              ) : fitError ? (
                <p className="text-sm text-red-600">{fitError}</p>
              ) : fitPreview ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-violet-700">Điểm phù hợp</p>
                      <p className="text-2xl font-bold text-violet-800">{fitPreview.fitScore}/100</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white border border-violet-200 text-xs font-semibold text-violet-700">
                      {recMap[fitPreview.recommendation]}
                    </span>
                  </div>
                  <p className="text-sm text-violet-800">{fitPreview.explanation}</p>
                  {fitPreview.missingSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-violet-700 mb-2">Thiếu kỹ năng / từ khóa</p>
                      <div className="flex flex-wrap gap-2">
                        {fitPreview.missingSkills.slice(0, 6).map((item) => (
                          <span key={item} className="px-2.5 py-1 rounded-full bg-white border border-violet-200 text-[11px] text-violet-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-violet-700">
                  Chọn một CV để hệ thống so khớp tự động trước khi gửi đơn.
                </p>
              )}
            </div>
          )}

          {/* Cover letter */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Thư giới thiệu{" "}
              <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => onCoverLetterChange(e.target.value)}
              rows={4}
              placeholder="Giới thiệu bản thân và lý do bạn muốn ứng tuyển vị trí này..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={onApply}
            disabled={applying}
            className="px-5 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {applying && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <Send size={13} /> Gửi đơn
          </button>
        </div>
      </div>
    </div>
  );
}
