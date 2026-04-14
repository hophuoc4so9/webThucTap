import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import type { RootState } from "@/store";
import { Plus, FileText, Upload, CheckCircle2, X } from "lucide-react";
import { cvApi } from "@/api/api/services/cv.api";
import type { Cv, CvSuggestionResponse } from "@/features/student/types";
import { CvCard } from "./CvCard";
import { AppPagination } from "@/components/common/AppPagination";

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
    </div>
  );
};
