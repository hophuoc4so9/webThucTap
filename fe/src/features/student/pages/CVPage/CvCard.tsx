import { useState } from "react";
import { FileText, Pencil, Star, StarOff, Trash2, Paperclip, Download, FileDown, Loader2, Sparkles, Eye, Globe, ShieldCheck } from "lucide-react";
import type { Cv } from "@/features/student/types";
import { getCvFileUrl } from "@/api/api/clients/apiConfig";
import { cvApi } from "@/api/api/services/cv.api";
import { fmtDate, FILE_COLOR, fileExt, getCvExperiences, getCvProjects, getCvSkills } from "./helpers";
import { exportCvToPdf } from "./cvPdfExport";
import { SkillTag } from "./SkillTag";
import { ExpandSection } from "./ExpandSection";

export const CvCard = ({
  cv,
  onDelete,
  onSetDefault,
  onEdit,
  onAnalyze,
  onView,
  analyzing,
}: {
  cv: Cv;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
  onEdit: (cv: Cv) => void;
  onAnalyze: (id: number) => void;
  onView: (cv: Cv) => void;
  analyzing?: boolean;
}) => {
  const [localCv, setCv] = useState(cv);
  const skills = getCvSkills(localCv);
  const experienceTags = getCvExperiences(localCv);
  const projects = getCvProjects(localCv);
  const ext = fileExt(localCv.fileOriginalName);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [fileDownloading, setFileDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  const handleTogglePublic = async () => {
    setIsPublicLoading(true);
    try {
      const updated = await cvApi.update(localCv.id, { isPublic: !localCv.isPublic });
      setCv({ ...localCv, isPublic: updated.isPublic });
    } catch (err) {
      console.error("Failed to toggle public", err);
    } finally {
      setIsPublicLoading(false);
    }
  };

  const handleDownloadFile = async () => {
    const url = getCvFileUrl(localCv.filePath);
    if (!url || !localCv.filePath) return;
    setFileDownloading(true);
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được file");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = localCv.fileOriginalName || localCv.filePath.replace(/^.*[/\\]/, "") || "cv.pdf";
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
      await exportCvToPdf(localCv);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${localCv.isDefault ? "border-blue-300 shadow-md shadow-blue-50" : "border-gray-200 hover:border-blue-200"}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800 truncate">
                  {localCv.fullName || localCv.title || "CV chưa đặt tên"}
                </p>
                {localCv.isTdmuVerified && (
                  <div className="flex-shrink-0 text-emerald-500" title="Đã xác thực sinh viên TDMU">
                    <ShieldCheck size={14} fill="currentColor" className="text-white" />
                  </div>
                )}
              </div>
              {localCv.jobPosition && (
                <p className="text-xs text-blue-500 font-medium mt-0.5 truncate">{localCv.jobPosition}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                Cập nhật {fmtDate(localCv.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {localCv.isDefault && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex-shrink-0 uppercase tracking-wider">
                <Star size={8} fill="white" /> Mặc định
              </span>
            )}
            <button
              onClick={handleTogglePublic}
              disabled={isPublicLoading}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${localCv.isPublic ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
            >
              <Globe size={10} />
              {localCv.isPublic ? "Công khai" : "Riêng tư"}
            </button>
          </div>
        </div>

        {/* Contact info */}
        {(localCv.phone || localCv.contactEmail || localCv.address) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
            {localCv.phone && <span className="text-xs text-gray-500">📞 {localCv.phone}</span>}
            {localCv.contactEmail && <span className="text-xs text-gray-500">✉️ {localCv.contactEmail}</span>}
            {localCv.address && <span className="text-xs text-gray-500">📍 {localCv.address}</span>}
          </div>
        )}

        {localCv.fileOriginalName && (
          <div
            className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${FILE_COLOR[ext] ?? "bg-gray-100 text-gray-600"}`}
          >
            <Paperclip size={11} />
            {localCv.fileOriginalName}
          </div>
        )}

        {localCv.summary && (
          <p className="mt-3 text-xs text-gray-500 line-clamp-2">
            {localCv.summary}
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
        {localCv.education && (
          <ExpandSection title="Học vấn">{localCv.education}</ExpandSection>
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
        {projects.length > 0 && (
          <ExpandSection title="Dự án đã thực hiện">
            <div className="space-y-2 mt-1">
              {projects.slice(0, 3).map((project, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-2.5 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-800">
                    {project.name || "Dự án"}
                    {project.role ? ` - ${project.role}` : ""}
                  </p>
                  {project.description && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{project.description}</p>
                  )}
                  {(project.startDate || project.endDate) && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      {project.startDate || "?"} - {project.endDate || "Hiện tại"}
                    </p>
                  )}
                </div>
              ))}
              {projects.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                  +{projects.length - 3} dự án khác
                </span>
              )}
            </div>
          </ExpandSection>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-2.5">
        {/* Row 1: primary actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(localCv)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Eye size={13} /> Xem
          </button>
          <button
            onClick={() => onEdit(localCv)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Pencil size={13} /> Sửa
          </button>
          <button
            onClick={() => onAnalyze(localCv.id)}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-60"
          >
            {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {analyzing ? "Đang phân tích..." : "AI góp ý"}
          </button>
          {!localCv.isDefault && (
            <button
              onClick={() => onSetDefault(localCv.id)}
              title="Đặt làm CV mặc định"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <StarOff size={13} />
              <span className="hidden sm:inline">Đặt mặc định</span>
            </button>
          )}

          <div className="flex-1" />

          {/* Download */}
          {localCv.filePath ? (
            <button
              type="button"
              onClick={handleDownloadFile}
              disabled={fileDownloading}
              title="Tải file CV"
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60"
            >
              {fileDownloading
                ? <Loader2 size={14} className="animate-spin" />
                : <Download size={14} />}
            </button>
          ) : (
            <button
              onClick={handleExportPdf}
              disabled={pdfLoading}
              title="Xuất PDF"
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60"
            >
              {pdfLoading
                ? <Loader2 size={14} className="animate-spin" />
                : <FileDown size={14} />}
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Delete */}
          <button
            onClick={() => onDelete(localCv.id)}
            title="Xuá CV"
            className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Download success hint */}
        {downloadSuccess && (
          <p className="text-[11px] text-green-600 font-medium mt-1 pl-1">✓ Đã tải CV</p>
        )}
      </div>
    </div>
  );
};
