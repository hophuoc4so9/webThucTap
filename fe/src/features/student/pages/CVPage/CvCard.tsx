import { useState } from "react";
import { FileText, Pencil, Star, StarOff, Trash2, Paperclip, Download, FileDown, Loader2, Printer } from "lucide-react";
import type { Cv } from "@/features/student/types";
import { fmtDate, FILE_COLOR, fileExt, getCvPrintFullHtml, getCvExperiences, getCvSkills } from "./helpers";
import { exportCvToPdf } from "./cvPdfExport";
import { SkillTag } from "./SkillTag";
import { ExpandSection } from "./ExpandSection";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined ?? "http://localhost:8080").replace(/\/$/, "");

/** URL tải file CV (filePath có thể là "uuid.pdf" hoặc "/uploads/uuid.pdf") */
const getCvFileUrl = (filePath: string | undefined) =>
  filePath ? `${API_BASE}/uploads/${filePath.replace(/^.*[/\\]/, "")}` : null;

const printTextCv = (cv: Cv) => {
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(getCvPrintFullHtml(cv));
    win.document.close();
    setTimeout(() => win.print(), 300);
  }
};

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
  const skills = getCvSkills(cv);
  const experienceTags = getCvExperiences(cv);
  const ext = fileExt(cv.fileOriginalName);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [fileDownloading, setFileDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadFile = async () => {
    const url = getCvFileUrl(cv.filePath);
    if (!url || !cv.filePath) return;
    setFileDownloading(true);
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được file");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = cv.fileOriginalName || cv.filePath.replace(/^.*[/\\]/, "") || "cv.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    } finally {
      setFileDownloading(false);
    }
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    setDownloadSuccess(false);
    try {
      await exportCvToPdf(cv);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } finally {
      setPdfLoading(false);
    }
  };

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
                {cv.fullName || cv.title || "CV chưa đặt tên"}
              </p>
              {cv.jobPosition && (
                <p className="text-xs text-blue-500 font-medium mt-0.5 truncate">{cv.jobPosition}</p>
              )}
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

        {/* Contact info */}
        {(cv.phone || cv.contactEmail || cv.address) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
            {cv.phone && <span className="text-xs text-gray-500">📞 {cv.phone}</span>}
            {cv.contactEmail && <span className="text-xs text-gray-500">✉️ {cv.contactEmail}</span>}
            {cv.address && <span className="text-xs text-gray-500">📍 {cv.address}</span>}
          </div>
        )}

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
        {experienceTags.length > 0 && (
          <ExpandSection title="Kinh nghiệm">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {experienceTags.map((item, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                  {item}
                </span>
              ))}
            </div>
          </ExpandSection>
        )}
        {cv.projectExperience && (
          <ExpandSection title="Dự án đã thực hiện">
            <p className="text-xs text-gray-600 whitespace-pre-wrap mt-1">{cv.projectExperience}</p>
          </ExpandSection>
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
        {cv.filePath ? (
          <button
            type="button"
            onClick={handleDownloadFile}
            disabled={fileDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60"
          >
            {fileDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {fileDownloading ? "Đang tải..." : "Tải file"}
          </button>
        ) : (
          <>
            {downloadSuccess && (
              <span className="text-xs text-green-600 font-medium">Đã tải CV</span>
            )}
            <button
              onClick={handleExportPdf}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60"
            >
              {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              {pdfLoading ? "Đang tạo..." : "Tải PDF"}
            </button>
            <button
              onClick={() => printTextCv(cv)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Printer size={13} /> In
            </button>
          </>
        )}
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
