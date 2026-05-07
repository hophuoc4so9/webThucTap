import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import type { RootState } from "@/store";
import {
  Plus, FileText, Upload, CheckCircle2, X, Sparkles,
  Download, FileDown, Star, User, Mail, Phone, MapPin,
  Briefcase, GraduationCap, Award, Globe, FolderKanban, Code2,
} from "lucide-react";
import { cvApi } from "@/api/api/services/cv.api";
import type { Cv, CvParseResponse, CvSuggestionResponse } from "@/features/student/types";
import { CvCard } from "./CvCard";
import { AppPagination } from "@/components/common/AppPagination";
import { getCvFileUrl } from "@/api/api/clients/apiConfig";
import { exportCvToPdf } from "./cvPdfExport";
import {
  getCvCertifications, getCvExperiences, getCvLanguages,
  getCvProjects, getCvSkills, getCvSocialLinks, getCvPrintFullHtml,
} from "./helpers";

const PAGE_SIZE = 6;

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  high: { label: "Ưu tiên cao", className: "bg-red-50 text-red-700 border-red-200" },
  medium: { label: "Ưu tiên trung", className: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "Ưu tiên thấp", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const SECTION_LABEL: Record<string, string> = {
  summary: "Tóm tắt", skills: "Kỹ năng",
  experience: "Kinh nghiệm", projects: "Dự án", general: "Tổng quát",
};

/* ── small helpers ── */
function InfoRow({ icon: Icon, value }: { icon: React.ElementType; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm text-slate-700">
      <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />
      <span className="leading-snug">{value}</span>
    </div>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">{label}</p>
  );
}

function Pill({ label, color = "blue" }: { label: string; color?: "blue" | "amber" | "emerald" | "violet" | "gray" }) {
  const cls = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  }[color];
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs border font-medium ${cls}`}>{label}</span>
  );
}

export const CVPage = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const userId = user ? Number(user.id) : 0;
  const navigate = useNavigate();
  const location = useLocation();

  const [cvs, setCvs] = useState<Cv[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CvSuggestionResponse | null>(null);
  const [viewCv, setViewCv] = useState<Cv | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseResult, setParseResult] = useState<CvParseResponse | null>(null);

  const totalPages = Math.ceil(total / limit);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* load CVs */
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    cvApi.getByUserPaged(userId, page, limit)
      .then((res) => { setCvs(res.data ?? []); setTotal(res.total ?? 0); })
      .catch(() => showToast("Không thể tải danh sách CV", "error"))
      .finally(() => setLoading(false));
  }, [userId, page, limit]);

  /* saved state from navigation */
  useEffect(() => {
    const state = location.state as { saved?: boolean; savedType?: "create" | "update" } | null;
    if (state?.saved) {
      showToast(state.savedType === "update" ? "Đã cập nhật CV" : "Đã tạo CV thành công");
      window.history.replaceState({}, "", window.location.pathname);
      setPage(1);
    }
  }, []); // eslint-disable-line

  const handleDelete = async (id: number) => {
    if (!confirm("Xác nhận xoá CV này?")) return;
    try {
      await cvApi.remove(id);
      const res = await cvApi.getByUserPaged(userId, page, limit);
      setCvs(res.data ?? []); setTotal(res.total ?? 0);
      showToast("Đã xoá CV");
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Không thể xoá CV", "error");
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const updated = await cvApi.update(id, { isDefault: true });
      setCvs((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id ? updated.isDefault : false })));
      showToast("Đã đặt CV mặc định");
    } catch { showToast("Có lỗi xảy ra", "error"); }
  };

  const handleAnalyze = async (id: number) => {
    if (!userId) return;
    setAnalyzingId(id);
    try {
      setAnalysisResult(await cvApi.suggestImprovements(id, userId));
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Không thể phân tích CV", "error");
    } finally { setAnalyzingId(null); }
  };

  const handleView = (cv: Cv) => { setViewCv(cv); setParseResult(null); };
  const handleCloseView = () => { setViewCv(null); setParseResult(null); };

  const handleParseResume = async () => {
    if (!viewCv?.filePath || !userId) return;
    setParseLoading(true);
    try {
      const result = await cvApi.parseResume(viewCv.id, userId);
      setParseResult(result);
      setViewCv(result.cv);
      setCvs((prev) => prev.map((cv) => (cv.id === result.cvId ? result.cv : cv)));
      showToast("Đã trích xuất thông tin từ CV");
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Không thể trích xuất CV", "error");
    } finally { setParseLoading(false); }
  };

  /* ── render ── */
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white animate-in slide-in-from-top-2 fade-in duration-200 ${toast.type === "error" ? "bg-red-600" : "bg-gray-800"}`}>
          <CheckCircle2 size={14} className={toast.type === "error" ? "text-red-200" : "text-green-400"} />
          {toast.msg}
        </div>
      )}

      {/* ── Analysis modal ── */}
      {analysisResult && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setAnalysisResult(null)} />
          <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                    <Sparkles size={16} className="text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Phân tích CV bằng AI</h3>
                    <p className="text-xs text-gray-400">Điểm tổng quan: <strong className="text-gray-700">{analysisResult.score}/100</strong></p>
                  </div>
                </div>
                <button onClick={() => setAnalysisResult(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Score bar */}
              <div className="px-6 pt-4 shrink-0">
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${analysisResult.score}%`,
                      background: analysisResult.score >= 70 ? "#22c55e" : analysisResult.score >= 40 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1">
                {/* Summary */}
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800 leading-relaxed">
                  {analysisResult.summary}
                </div>

                {/* Strengths */}
                <div>
                  <SectionHead label="Điểm mạnh" />
                  <ul className="space-y-1.5">
                    {analysisResult.strengths.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 size={13} className="text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div>
                  <SectionHead label="Cần cải thiện" />
                  <div className="space-y-2">
                    {analysisResult.improvements.map((item, idx) => {
                      const cfg = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.medium;
                      return (
                        <div key={idx} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/80">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-gray-700">
                              {SECTION_LABEL[item.section] ?? item.section}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.className}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{item.issue}</p>
                          <p className="text-sm text-blue-700 mt-1">💡 {item.suggestion}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Keywords */}
                {analysisResult.keywordsToAdd.length > 0 && (
                  <div>
                    <SectionHead label="Từ khóa nên bổ sung" />
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.keywordsToAdd.map((kw) => (
                        <Pill key={kw} label={kw} color="violet" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hồ sơ của tôi</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "Đang tải..." : `${total} CV · Quản lý hồ sơ ứng tuyển`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate("/student/cv/new?tab=text")}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={14} /> Tạo theo form
          </button>
          <button
            onClick={() => navigate("/student/cv/new?tab=file")}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
          >
            <Upload size={14} /> Tải từ file
          </button>
        </div>
      </div>

      {/* ── CV grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-7 bg-gray-100 rounded-lg flex-1" />
                <div className="h-7 bg-gray-100 rounded-lg flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : cvs.length === 0 ? (
        <div className="text-center py-20 px-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-800 font-semibold text-lg mb-1">Bạn chưa có CV nào</p>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
            Tạo CV theo form hoặc tải file CV có sẵn (PDF, DOC, DOCX) để bắt đầu ứng tuyển
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate("/student/cv/new?tab=text")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-white rounded-xl shadow-sm transition-colors"
            >
              <Plus size={15} /> Tạo CV theo form
            </button>
            <button
              onClick={() => navigate("/student/cv/new?tab=file")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
            >
              <Upload size={15} /> Tải CV từ file
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cvs.map((cv) => (
              <CvCard
                key={cv.id}
                cv={cv}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                onEdit={(c) => navigate(`/student/cv/${c.id}/edit`)}
                onAnalyze={handleAnalyze}
                onView={handleView}
                analyzing={analyzingId === cv.id}
              />
            ))}
          </div>
          <AppPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(v) => { setLimit(v); setPage(1); }}
            pageSizeOptions={[6, 12, 24]}
            activeLinkClassName="!bg-blue-600 !text-white !border-blue-600"
          />
        </>
      )}

      {/* ── CV Viewer modal ── */}
      {viewCv && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={handleCloseView} />
          <div className="fixed inset-0 z-50 p-3 sm:p-6 flex items-center justify-center">
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">

              {/* Modal header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white shrink-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {viewCv.title || viewCv.fullName || "CV Preview"}
                  </h3>
                  {viewCv.isDefault && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                      <Star size={9} className="fill-amber-400 text-amber-400" /> CV mặc định
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {viewCv.filePath ? (
                    <button
                      onClick={() => { const url = getCvFileUrl(viewCv.filePath); if (url) window.open(url, "_blank"); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Download size={13} /> Mở file
                    </button>
                  ) : (
                    <button
                      onClick={() => exportCvToPdf(viewCv)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <FileDown size={13} /> Tải PDF
                    </button>
                  )}
                  {viewCv.filePath && (
                    <button
                      onClick={handleParseResume}
                      disabled={parseLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      {parseLoading ? "Đang trích xuất..." : "AI trích xuất"}
                    </button>
                  )}
                  <div className="w-px h-5 bg-gray-100 mx-1" />
                  <button onClick={handleCloseView} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Left — preview */}
                <div className="flex-1 bg-slate-50 border-r border-slate-100 overflow-hidden flex flex-col">
                  <div className="flex-1 p-4 overflow-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
                      {viewCv.filePath ? (
                        <iframe title="CV File" src={getCvFileUrl(viewCv.filePath) ?? ""} className="w-full h-full min-h-[500px]" />
                      ) : (
                        <iframe title="CV Preview" srcDoc={getCvPrintFullHtml(viewCv)} className="w-full h-full min-h-[500px]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Right — extracted info */}
                <div className="w-72 shrink-0 overflow-y-auto p-5 space-y-5">
                  {/* Parse status */}
                  {parseResult && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <p className="text-xs font-medium text-emerald-700">Đã cập nhật từ AI</p>
                    </div>
                  )}

                  {/* Contact */}
                  <div>
                    <SectionHead label="Liên hệ" />
                    <div className="space-y-1.5">
                      <InfoRow icon={User} value={viewCv.fullName} />
                      <InfoRow icon={Mail} value={viewCv.contactEmail} />
                      <InfoRow icon={Phone} value={viewCv.phone} />
                      <InfoRow icon={MapPin} value={viewCv.address} />
                    </div>
                    {!viewCv.fullName && !viewCv.contactEmail && !viewCv.phone && (
                      <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
                    )}
                  </div>

                  {/* Skills */}
                  <div>
                    <SectionHead label="Kỹ năng" />
                    {getCvSkills(viewCv).length === 0 ? (
                      <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {getCvSkills(viewCv).map((skill) => <Pill key={skill} label={skill} color="blue" />)}
                      </div>
                    )}
                  </div>

                  {/* Experience */}
                  <div>
                    <SectionHead label="Kinh nghiệm" />
                    {getCvExperiences(viewCv).length === 0 ? (
                      <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {getCvExperiences(viewCv).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                            <Briefcase size={11} className="text-slate-300 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Education */}
                  <div>
                    <SectionHead label="Học vấn" />
                    {viewCv.education ? (
                      <div className="flex items-start gap-1.5 text-xs text-slate-700">
                        <GraduationCap size={11} className="text-slate-300 mt-0.5 shrink-0" />
                        <span className="whitespace-pre-wrap leading-relaxed">{viewCv.education}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
                    )}
                  </div>

                  {/* Certifications */}
                  {getCvCertifications(viewCv).length > 0 && (
                    <div>
                      <SectionHead label="Chứng chỉ" />
                      <div className="flex flex-wrap gap-1.5">
                        {getCvCertifications(viewCv).map((item, idx) => <Pill key={idx} label={item} color="amber" />)}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {getCvLanguages(viewCv).length > 0 && (
                    <div>
                      <SectionHead label="Ngoại ngữ" />
                      <div className="flex flex-wrap gap-1.5">
                        {getCvLanguages(viewCv).map((item, idx) => <Pill key={idx} label={item} color="emerald" />)}
                      </div>
                    </div>
                  )}

                  {/* Social links */}
                  {getCvSocialLinks(viewCv).length > 0 && (
                    <div>
                      <SectionHead label="Liên kết" />
                      <ul className="space-y-1">
                        {getCvSocialLinks(viewCv).map((link, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-blue-600 break-all">
                            <Globe size={11} className="text-blue-400 mt-0.5 shrink-0" />
                            {link}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Projects */}
                  {getCvProjects(viewCv).length > 0 && (
                    <div>
                      <SectionHead label="Dự án" />
                      <ul className="space-y-2">
                        {getCvProjects(viewCv).slice(0, 4).map((project, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <FolderKanban size={11} className="text-slate-300 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{project.name || "Dự án"}</p>
                              {project.role && <p className="text-[11px] text-slate-400">{project.role}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};