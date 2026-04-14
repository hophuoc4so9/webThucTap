import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Eye,
  Building2,
  FileText,
  X,
  Download,
  Star,
  GraduationCap,
  BookOpen,
  AlertCircle,
  Sparkles,
  Pencil,
} from "lucide-react";
import { applicationApi } from "@/api/api/services/application.api";
import { cvApi } from "@/api/api/services/cv.api";
import type { Application, ApplicationFitResponse, ApplicationStatus, Cv } from "@/features/student/types";
import { getCvFileUrl } from "@/api/api/clients/apiConfig";
import { AppPagination } from "@/components/common/AppPagination";

const parseJson = <T,>(s: string | undefined): T[] => {
  if (!s) return [];
  try { return JSON.parse(s) as T[]; } catch { return []; }
};

const fmtDateShort = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

/* ── CV Modal ─────────────────────────────────────── */
function CvModal({ cv, onClose }: { cv: Cv; onClose: () => void }) {
  const skills = parseJson<string>(cv.skills);
  const fileUrl = getCvFileUrl(cv.filePath);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-red-500" />
              <h2 className="font-semibold text-gray-800">Chi tiết CV</h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-gray-800">{cv.title ?? "CV không tiêu đề"}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Tạo: {fmtDateShort(cv.createdAt)}</p>
            </div>

            {fileUrl && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <FileText size={20} className="text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-800 truncate">{cv.fileOriginalName ?? "CV file"}</p>
                  <p className="text-xs text-blue-500">{cv.fileMimeType}</p>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={cv.fileOriginalName}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shrink-0"
                >
                  <Download size={12} /> Tải xuống
                </a>
              </div>
            )}

            {cv.summary && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Giới thiệu</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{cv.summary}</p>
              </div>
            )}

            {skills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Star size={11} /> Kỹ năng
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((sk, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full">{sk}</span>
                  ))}
                </div>
              </div>
            )}

            {cv.education && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <GraduationCap size={12} /> Học vấn
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{cv.education}</p>
              </div>
            )}

            {cv.experience && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <BookOpen size={12} /> Kinh nghiệm
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{cv.experience}</p>
              </div>
            )}

            {!cv.summary && skills.length === 0 && !cv.education && !cv.experience && !fileUrl && (
              <div className="flex flex-col items-center py-10 text-center">
                <AlertCircle size={32} className="text-gray-200 mb-2" />
                <p className="text-gray-400 text-sm">CV chưa có nội dung</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FitModal({
  result,
  onClose,
}: {
  result: ApplicationFitResponse;
  onClose: () => void;
}) {
  const recMap: Record<ApplicationFitResponse["recommendation"], string> = {
    "use-current-cv": "Dùng CV hiện tại",
    "revise-current-cv": "Nên sửa CV hiện tại",
    "create-new-cv": "Nên tạo CV mới cho job này",
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Đánh giá độ phù hợp CV</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-700">Điểm phù hợp</p>
              <p className="text-2xl font-bold text-blue-800">{result.fitScore}/100</p>
              <p className="text-sm text-blue-700 mt-1">{recMap[result.recommendation]}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Giải thích</p>
              <p className="text-sm text-gray-700">{result.explanation}</p>
            </div>

            {result.missingSkills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kỹ năng còn thiếu</p>
                <div className="flex flex-wrap gap-2">
                  {result.missingSkills.map((item) => (
                    <span key={item} className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs border border-red-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.actionPlan.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kế hoạch cải thiện</p>
                <ul className="space-y-1.5">
                  {result.actionPlan.map((item, idx) => (
                    <li key={`${idx}-${item}`} className="text-sm text-gray-700">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EditCvModal({
  application,
  userCvs,
  selectedCvId,
  saving,
  onSelectCv,
  onSave,
  onSaveAndCheck,
  onClose,
}: {
  application: Application;
  userCvs: Cv[];
  selectedCvId: number | "";
  saving: boolean;
  onSelectCv: (id: number | "") => void;
  onSave: () => void;
  onSaveAndCheck: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">Đổi CV đã nộp</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                {application.jobTitle || `Việc làm #${application.jobId}`}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 text-sm text-violet-800">
              Đổi CV hiện tại rồi kiểm tra lại độ phù hợp ngay nếu cần.
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Chọn CV mới
              </label>
              {userCvs.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                  Bạn chưa có CV nào. Vui lòng tạo CV trước.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                    <input
                      type="radio"
                      name="edit-cv"
                      value=""
                      checked={selectedCvId === ""}
                      onChange={() => onSelectCv("")}
                      className="accent-violet-500"
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
                          ? "border-violet-400 bg-violet-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit-cv"
                        value={cv.id}
                        checked={selectedCvId === cv.id}
                        onChange={() => onSelectCv(cv.id)}
                        className="accent-violet-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {cv.title || cv.fullName || `CV #${cv.id}`}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {cv.fileOriginalName || cv.jobPosition || "CV dạng form"}
                        </p>
                      </div>
                      {cv.isDefault && (
                        <span className="ml-auto flex-shrink-0 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded">
                          Mặc định
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t px-6 py-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Huỷ
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu CV mới"}
            </button>
            <button
              onClick={onSaveAndCheck}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Đang kiểm tra..." : "Lưu và kiểm tra lại"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── helpers ── */
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "Chờ xét duyệt",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  reviewing: {
    label: "Đang xét duyệt",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Eye,
  },
  accepted: {
    label: "Đã chấp nhận",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Từ chối",
    color: "bg-red-50 text-red-600 border-red-200",
    icon: XCircle,
  },
};

type FilterStatus = ApplicationStatus | "all";

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "reviewing", label: "Đang xét" },
  { key: "accepted", label: "Chấp nhận" },
  { key: "rejected", label: "Từ chối" },
];

/* ── Application Card ── */
const AppCard = ({
  app,
  onWithdraw,
  onViewCv,
  onFitCheck,
  onEditCv,
  fitChecking,
}: {
  app: Application;
  onWithdraw: (id: number) => void;
  onViewCv: (app: Application) => void;
  onFitCheck: (id: number) => void;
  onEditCv: (app: Application) => void;
  fitChecking: boolean;
}) => {
  const sc = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending;
  const Icon = sc.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all p-5">
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-gray-400" />
          </div>
          <div className="min-w-0">
            <Link
              to={`/student/jobs/${app.jobId}`}
              className="font-semibold text-gray-800 hover:text-red-500 transition-colors truncate block"
            >
              {app.jobTitle || `Việc làm #${app.jobId}`}
            </Link>
            {app.companyName && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {app.companyName}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${sc.color}`}
        >
          <Icon size={11} /> {sc.label}
        </span>
      </div>

      {/* Cover letter */}
      {app.coverLetter && (
        <p className="mt-3 text-xs text-gray-500 line-clamp-2 italic">
          "{app.coverLetter}"
        </p>
      )}

      {/* Recruiter note */}
      {app.note && (
        <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 font-semibold mb-0.5">
            Nhận xét từ nhà tuyển dụng:
          </p>
          <p className="text-xs text-gray-700">{app.note}</p>
        </div>
      )}

      {/* CV actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(app.cv || app.cvId) && (
          <button
            onClick={() => onViewCv(app)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg text-xs font-medium transition-colors"
          >
            <Eye size={12} /> Xem CV {app.cv?.title ? `– ${app.cv.title}` : app.cvId ? `#${app.cvId}` : ""}
          </button>
        )}
        {(app.cv || app.cvId) && (
          <button
            onClick={() => onFitCheck(app.id)}
            disabled={fitChecking}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
          >
            {fitChecking ? <span className="w-3.5 h-3.5 border-2 border-violet-700 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={12} />}
            {fitChecking ? "Đang phân tích..." : "So khớp CV-job"}
          </button>
        )}
        <button
          onClick={() => onEditCv(app)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 rounded-lg text-xs font-medium transition-colors"
        >
          <Pencil size={12} /> {app.cv || app.cvId ? "Đổi CV" : "Gắn CV"}
        </button>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Ứng tuyển ngày {fmtDate(app.appliedAt)}
        </p>
        {app.status === "pending" && (
          <button
            onClick={() => onWithdraw(app.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={12} /> Rút đơn
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Page ── */
export const ApplicationsPage = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const userId = user ? Number(user.id) : 0;

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [toast, setToast] = useState("");
  const [cvModal, setCvModal] = useState<Cv | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [userCvs, setUserCvs] = useState<Cv[]>([]);
  const [fitCheckingId, setFitCheckingId] = useState<number | null>(null);
  const [fitResult, setFitResult] = useState<ApplicationFitResponse | null>(null);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [selectedEditCvId, setSelectedEditCvId] = useState<number | "">("");
  const [savingEditCv, setSavingEditCv] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    if (!userId) return;
    Promise.all([applicationApi.getAll({ userId }), cvApi.getByUser(userId)])
      .then(([appsRes, cvs]) => {
        setApps(appsRes.data);
        setUserCvs(cvs);
      })
      .catch(() => showToast("Không thể tải danh sách ứng tuyển"))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleWithdraw = async (id: number) => {
    if (!confirm("Xác nhận rút đơn ứng tuyển này?")) return;
    try {
      await applicationApi.remove(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
      showToast("Đã rút đơn ứng tuyển");
    } catch {
      showToast("Không thể rút đơn, vui lòng thử lại");
    }
  };

  const handleViewCv = async (app: Application) => {
    if (app.cv) { setCvModal(app.cv); return; }
    if (!app.cvId) return;
    setCvLoading(true);
    try {
      const cv = await cvApi.getById(app.cvId);
      setCvModal(cv);
    } catch {
      showToast("Không thể tải CV");
    } finally {
      setCvLoading(false);
    }
  };

  const handleFitCheck = async (id: number) => {
    if (!userId) return;
    setFitCheckingId(id);
    try {
      const result = await applicationApi.fitCheck(id, userId);
      setFitResult(result);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể phân tích độ phù hợp lúc này";
      showToast(message);
    } finally {
      setFitCheckingId(null);
    }
  };

  const openEditCvModal = (app: Application) => {
    setEditApp(app);
    setSelectedEditCvId(app.cvId ?? "");
  };

  const saveApplicationCv = async (checkAfterSave: boolean) => {
    if (!editApp || !userId) return;
    setSavingEditCv(true);
    try {
      const nextCvId = selectedEditCvId === "" ? null : selectedEditCvId;
      const updated = await applicationApi.updateCv(editApp.id, {
        cvId: nextCvId,
        userId,
      });
      setApps((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? { ...item, cvId: updated.cvId, cv: updated.cv }
            : item,
        ),
      );
      setEditApp(null);
      showToast("Đã cập nhật CV của đơn ứng tuyển");

      if (checkAfterSave && updated.cvId) {
        const result = await applicationApi.fitCheck(updated.id, userId);
        setFitResult(result);
      }
    } catch {
      showToast("Không thể cập nhật CV của đơn ứng tuyển");
    } finally {
      setSavingEditCv(false);
    }
  };

  /* client-side filter */
  const filtered = apps.filter((a) => {
    const matchStatus = filter === "all" || a.status === filter;
    const kw = search.toLowerCase();
    const matchSearch =
      !kw ||
      (a.jobTitle ?? "").toLowerCase().includes(kw) ||
      (a.companyName ?? "").toLowerCase().includes(kw);
    return matchStatus && matchSearch;
  });

  const paged = filtered.slice((page - 1) * limit, page * limit);
  const pagedTotalPages = Math.max(1, Math.ceil(filtered.length / limit));

  /* counts per status */
  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const handlePageSizeChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* CV Modal */}
      {cvModal && <CvModal cv={cvModal} onClose={() => setCvModal(null)} />}
      {fitResult && <FitModal result={fitResult} onClose={() => setFitResult(null)} />}
      {editApp && (
        <EditCvModal
          application={editApp}
          userCvs={userCvs}
          selectedCvId={selectedEditCvId}
          saving={savingEditCv}
          onSelectCv={setSelectedEditCvId}
          onSave={() => saveApplicationCv(false)}
          onSaveAndCheck={() => saveApplicationCv(true)}
          onClose={() => setEditApp(null)}
        />
      )}

      {/* CV loading overlay */}
      {cvLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm">
          <CheckCircle2 size={15} className="text-green-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Đơn ứng tuyển</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {apps.length} đơn · Theo dõi trạng thái các đơn ứng tuyển của bạn
        </p>
      </div>

      {/* Stats row */}
      {!loading && apps.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {(
            Object.entries(STATUS_CONFIG) as [
              ApplicationStatus,
              (typeof STATUS_CONFIG)[ApplicationStatus],
            ][]
          ).map(([key, sc]) => {
            const Icon = sc.icon;
            return (
              <button
                key={key}
                  onClick={() => {
                    setFilter(filter === key ? "all" : key);
                    setPage(1);
                  }}
                className={`rounded-xl p-3 text-left border transition-all ${filter === key ? "ring-2 ring-offset-1 ring-red-400" : ""} ${sc.color}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={14} />
                  <span className="text-xs font-semibold">{sc.label}</span>
                </div>
                <p className="text-2xl font-bold">{counts[key] ?? 0}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Search + filter tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên công việc, công ty..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setFilter(t.key);
                setPage(1);
              }}
              className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${filter === t.key ? "bg-red-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {t.label}
              {t.key !== "all" && counts[t.key] ? ` (${counts[t.key]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white rounded-xl border p-5"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="w-24 h-6 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {apps.length === 0
              ? "Bạn chưa ứng tuyển công việc nào"
              : "Không tìm thấy kết quả phù hợp"}
          </p>
          {apps.length === 0 && (
            <Link
              to="/student/jobs"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Search size={14} /> Tìm việc ngay
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onWithdraw={handleWithdraw}
              onViewCv={handleViewCv}
              onFitCheck={handleFitCheck}
              onEditCv={openEditCvModal}
              fitChecking={fitCheckingId === app.id}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <AppPagination
          page={page}
          totalPages={pagedTotalPages}
          total={filtered.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={handlePageSizeChange}
          pageSizeOptions={[6, 12, 24]}
          activeLinkClassName="!bg-red-500 !text-white !border-red-500"
        />
      )}
    </div>
  );
};
