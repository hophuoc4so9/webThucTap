import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import type { RootState } from "@/store";
import { Plus, FileText, Upload, CheckCircle2, X, Sparkles, Download, FileDown } from "lucide-react";
import { cvApi } from "@/api/api/services/cv.api";
import type { Cv, CvParseResponse, CvSuggestionResponse } from "@/features/student/types";
import { CvCard } from "./CvCard";
import { AppPagination } from "@/components/common/AppPagination";
import { getCvFileUrl } from "@/api/api/clients/apiConfig";
import { exportCvToPdf } from "./cvPdfExport";
import {
  getCvCertifications,
  getCvExperiences,
  getCvLanguages,
  getCvProjects,
  getCvSkills,
  getCvSocialLinks,
  getCvPrintFullHtml,
} from "./helpers";

const PAGE_SIZE = 6;

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
  const [toast, setToast] = useState("");
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CvSuggestionResponse | null>(null);
  const [viewCv, setViewCv] = useState<Cv | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseResult, setParseResult] = useState<CvParseResponse | null>(null);

  const totalPages = Math.ceil(total / limit);
  const priorityLabel: Record<string, string> = {
    high: "Mức cao",
    medium: "Mức trung bình",
    low: "Mức thấp",
  };

  const priorityClass: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const sectionLabel: Record<string, string> = {
    summary: "Tóm tắt",
    skills: "Kỹ năng",
    experience: "Kinh nghiệm",
    projects: "Dự án",
    general: "Tổng quát",
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    cvApi
      .getByUserPaged(userId, page, limit)
      .then((res) => {
        setCvs(res.data ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => showToast("Không thể tải danh sách CV"))
      .finally(() => setLoading(false));
  }, [userId, page, limit]);

  const handlePageSizeChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  useEffect(() => {
    const state = location.state as { saved?: boolean; savedType?: "create" | "update" } | null;
    if (state?.saved) {
      showToast(state.savedType === "update" ? "Đã cập nhật thông tin CV" : "Đã tạo CV thành công");
      window.history.replaceState({}, "", window.location.pathname);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Xác nhận xoá CV này?")) return;
    try {
      await cvApi.remove(id);
      const res = await cvApi.getByUserPaged(userId, page, limit);
      setCvs(res.data ?? []);
      setTotal(res.total ?? 0);
      showToast("Đã xoá CV");
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể xoá CV";
      showToast(msg);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const updated = await cvApi.update(id, { isDefault: true });
      setCvs((prev) =>
        prev.map((c) => ({
          ...c,
          isDefault: c.id === id ? updated.isDefault : false,
        })),
      );
      showToast("Đã đặt CV mặc định");
    } catch {
      showToast("Có lỗi xảy ra");
    }
  };

  const handleAnalyze = async (id: number) => {
    if (!userId) return;
    setAnalyzingId(id);
    try {
      const result = await cvApi.suggestImprovements(id, userId);
      setAnalysisResult(result);
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể phân tích CV lúc này";
      showToast(msg);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleView = (cv: Cv) => {
    setViewCv(cv);
    setParseResult(null);
  };

  const handleCloseView = () => {
    setViewCv(null);
    setParseResult(null);
  };

  const handleParseResume = async () => {
    if (!viewCv || !viewCv.filePath || !userId) return;
    setParseLoading(true);
    try {
      const result = await cvApi.parseResume(viewCv.id, userId);
      setParseResult(result);
      setViewCv(result.cv);
      setCvs((prev) => prev.map((cv) => (cv.id === result.cvId ? result.cv : cv)));
      showToast("Đã trích xuất thông tin từ CV");
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể trích xuất CV lúc này";
      showToast(msg);
    } finally {
      setParseLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm">
          <CheckCircle2 size={15} className="text-green-400" /> {toast}
        </div>
      )}

      {analysisResult && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setAnalysisResult(null)}
          />
          <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Phân tích CV</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Điểm tổng quan: {analysisResult.score}/100</p>
                </div>
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                  {analysisResult.summary}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Điểm mạnh</p>
                  <ul className="space-y-2">
                    {analysisResult.strengths.map((item, idx) => (
                      <li key={`${item}-${idx}`} className="text-sm text-gray-700">• {item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cần cải thiện</p>
                  <div className="space-y-2">
                    {analysisResult.improvements.map((item, idx) => (
                      <div key={`${item.section}-${idx}`} className="p-3 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-xs font-semibold text-gray-700">{sectionLabel[item.section] ?? item.section}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityClass[item.priority] ?? priorityClass.medium}`}>
                            {priorityLabel[item.priority] ?? item.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{item.issue}</p>
                        <p className="text-sm text-blue-700 mt-1">Gợi ý: {item.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {analysisResult.keywordsToAdd.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Từ khóa nên bổ sung</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.keywordsToAdd.map((kw) => (
                        <span key={kw} className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs border border-violet-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hồ sơ của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} CV · Quản lý hồ sơ ứng tuyển
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/student/cv/new?tab=text")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} /> Tạo CV theo form
          </button>
          <button
            onClick={() => navigate("/student/cv/new?tab=file")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
          >
            <Upload size={16} /> Tải CV từ file
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl border p-5">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : cvs.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 rounded-2xl bg-gray-200/80 flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-gray-500" />
          </div>
          <p className="text-gray-800 font-semibold text-lg">Bạn chưa có CV nào</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Tạo CV theo form hoặc tải file CV có sẵn (PDF, DOC, DOCX) để bắt đầu ứng tuyển
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button
              onClick={() => navigate("/student/cv/new?tab=text")}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-white rounded-xl shadow-sm"
            >
              <Plus size={16} /> Tạo CV theo form
            </button>
            <button
              onClick={() => navigate("/student/cv/new?tab=file")}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
            >
              <Upload size={16} /> Tải CV từ file
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
                onEdit={(c) => navigate(`/student/cv/${c.id}/edit`) }
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
            onLimitChange={handlePageSizeChange}
            pageSizeOptions={[6, 12, 24]}
            activeLinkClassName="!bg-blue-600 !text-white !border-blue-600"
          />
        </>
      )}

      {viewCv && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-800/60 backdrop-blur-sm"
            onClick={handleCloseView}
          />
          <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">CV Viewer</p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {viewCv.title || viewCv.fullName || "CV"}
                  </h3>
                </div>
                <button
                  onClick={handleCloseView}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-0">
                <div className="border-r border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-white">
                    {viewCv.filePath ? (
                      <button
                        type="button"
                        onClick={() => {
                          const url = getCvFileUrl(viewCv.filePath);
                          if (url) window.open(url, "_blank");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Download size={14} /> Mở file
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => exportCvToPdf(viewCv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <FileDown size={14} /> Tải PDF
                      </button>
                    )}
                    {viewCv.filePath && (
                      <button
                        type="button"
                        onClick={handleParseResume}
                        disabled={parseLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-60"
                      >
                        <Sparkles size={14} />
                        {parseLoading ? "Đang trích xuất..." : "AI trích xuất"}
                      </button>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                      {viewCv.filePath ? (
                        <iframe
                          title="CV File"
                          src={getCvFileUrl(viewCv.filePath) ?? ""}
                          className="w-full h-[70vh]"
                        />
                      ) : (
                        <iframe
                          title="CV Preview"
                          srcDoc={getCvPrintFullHtml(viewCv)}
                          className="w-full h-[70vh]"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Thông tin trích xuất</p>
                    <p className="text-sm text-slate-700 mt-1">
                      {parseResult ? "Đã cập nhật từ AI" : "Hiển thị dữ liệu hiện có"}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Liên hệ</p>
                      <div className="mt-2 space-y-1 text-sm text-slate-700">
                        {viewCv.fullName && <p>👤 {viewCv.fullName}</p>}
                        {viewCv.contactEmail && <p>✉️ {viewCv.contactEmail}</p>}
                        {viewCv.phone && <p>📞 {viewCv.phone}</p>}
                        {viewCv.address && <p>📍 {viewCv.address}</p>}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kỹ năng</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getCvSkills(viewCv).length === 0 && (
                          <span className="text-xs text-slate-400">Chưa có dữ liệu</span>
                        )}
                        {getCvSkills(viewCv).map((skill) => (
                          <span key={skill} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kinh nghiệm</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {getCvExperiences(viewCv).length === 0 && (
                          <li className="text-xs text-slate-400">Chưa có dữ liệu</li>
                        )}
                        {getCvExperiences(viewCv).map((item, idx) => (
                          <li key={`${item}-${idx}`} className="leading-relaxed">• {item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Học vấn</p>
                      <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                        {viewCv.education ? viewCv.education : "Chưa có dữ liệu"}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chứng chỉ</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getCvCertifications(viewCv).length === 0 && (
                          <span className="text-xs text-slate-400">Chưa có dữ liệu</span>
                        )}
                        {getCvCertifications(viewCv).map((item, idx) => (
                          <span key={`${item}-${idx}`} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs border border-amber-200">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ngoại ngữ</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getCvLanguages(viewCv).length === 0 && (
                          <span className="text-xs text-slate-400">Chưa có dữ liệu</span>
                        )}
                        {getCvLanguages(viewCv).map((item, idx) => (
                          <span key={`${item}-${idx}`} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Liên kết mạng xã hội</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {getCvSocialLinks(viewCv).length === 0 && (
                          <li className="text-xs text-slate-400">Chưa có dữ liệu</li>
                        )}
                        {getCvSocialLinks(viewCv).map((link, idx) => (
                          <li key={`${link}-${idx}`} className="break-all">• {link}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dự án</p>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {getCvProjects(viewCv).length === 0 && (
                          <li className="text-xs text-slate-400">Chưa có dữ liệu</li>
                        )}
                        {getCvProjects(viewCv).slice(0, 4).map((project, idx) => (
                          <li key={`${project.name}-${idx}`}>
                            <p className="font-semibold">{project.name || "Dự án"}</p>
                            {project.role && <p className="text-xs text-slate-500">{project.role}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
