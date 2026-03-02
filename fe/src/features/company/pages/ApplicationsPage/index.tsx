import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  Briefcase,
  User,
  Clock,
  Mail,
  FileText,
  ChevronDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Send,
  Eye,
  X,
  Download,
  GraduationCap,
  BookOpen,
  Star,
} from "lucide-react";
import { jobService } from "@/features/student/pages/JobsPage/services/jobService";
import { applicationApi } from "@/api/api/services/application.api";
import { cvApi } from "@/api/api/services/cv.api";
import type { Job } from "@/features/student/pages/JobsPage/types";
import type {
  Application,
  ApplicationStatus,
  Cv,
} from "@/features/student/types";

const API_BASE = "http://localhost:8080";

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: "Chờ xét duyệt",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  },
  reviewing: {
    label: "Đang xem xét",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  accepted: {
    label: "Đã chấp nhận",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  rejected: {
    label: "Từ chối",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
};

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "pending", label: "Chờ xét duyệt" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "accepted", label: "Đã chấp nhận" },
  { value: "rejected", label: "Từ chối" },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const parseJson = <T,>(s: string | undefined): T[] => {
  if (!s) return [];
  try {
    return JSON.parse(s) as T[];
  } catch {
    return [];
  }
};

/* ── CV Panel ─────────────────────────────────────────────── */
interface CvPanelProps {
  cvId: number;
  cachedCv?: Cv;
  onClose: () => void;
}

function CvPanel({ cvId, cachedCv, onClose }: CvPanelProps) {
  const [cv, setCv] = useState<Cv | null>(cachedCv ?? null);
  const [loading, setLoading] = useState(!cachedCv);

  useEffect(() => {
    if (cachedCv) return;
    cvApi
      .getById(cvId)
      .then(setCv)
      .catch(() => setCv(null))
      .finally(() => setLoading(false));
  }, [cvId, cachedCv]);

  const skills = parseJson<string>(cv?.skills);
  const fileUrl = cv?.filePath ? `${API_BASE}${cv.filePath}` : null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-green-500" />
            <h2 className="font-semibold text-gray-800">Chi tiết CV</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !cv ? (
            <div className="flex flex-col items-center py-16 text-center">
              <AlertCircle size={32} className="text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">Không tìm thấy CV</p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {cv.title ?? "CV không tiêu đề"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tạo: {fmtDate(cv.createdAt)}
                </p>
              </div>

              {fileUrl && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <FileText size={20} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-800 truncate">
                      {cv.fileOriginalName ?? "CV file"}
                    </p>
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
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Giới thiệu
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {cv.summary}
                  </p>
                </div>
              )}

              {skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Star size={11} /> Kỹ năng
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((sk, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cv.education && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <GraduationCap size={12} /> Học vấn
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {cv.education}
                  </p>
                </div>
              )}

              {cv.experience && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <BookOpen size={12} /> Kinh nghiệm
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {cv.experience}
                  </p>
                </div>
              )}

              {!cv.summary &&
                skills.length === 0 &&
                !cv.education &&
                !cv.experience &&
                !fileUrl && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    CV chưa có nội dung
                  </p>
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ── main component ─────────────────────────────────────────── */
export function CompanyApplicationsPage() {
  const { user } = useSelector((s: RootState) => s.auth);
  const email = user?.email ?? "";
  const LS_KEY = `company_name_${user?.id ?? "unknown"}`;
  const companyName = localStorage.getItem(LS_KEY) ?? "";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "all">(
    "all",
  );
  const [updating, setUpdating] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [cvPanel, setCvPanel] = useState<{ cvId: number; cv?: Cv } | null>(
    null,
  );
  const [cvCache, setCvCache] = useState<Record<number, Cv>>({});
  const [noteModal, setNoteModal] = useState<{
    app: Application;
    status: ApplicationStatus;
  } | null>(null);
  const [note, setNote] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await jobService.getJobs({
        page: 1,
        limit: 1000,
      });
      const compJobs: Job[] = (res.data ?? []).filter((j: Job) => {
        const c = j.company?.toLowerCase() ?? "";
        return (
          c === email.toLowerCase() ||
          (companyName && c === companyName.toLowerCase())
        );
      });
      setJobs(compJobs);
      if (compJobs.length === 0) {
        setApps([]);
        return;
      }
      const results = await Promise.allSettled(
        compJobs.map((j: Job) =>
          applicationApi.getAll({ jobId: j.id, limit: 1000 }),
        ),
      );
      const merged: Application[] = [];
      results.forEach((r) => {
        if (r.status === "fulfilled") merged.push(...(r.value.data ?? []));
      });
      merged.sort(
        (a, b) =>
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
      );
      setApps(merged);
    } catch {
      showToast("Không thể tải dữ liệu.", "error");
    } finally {
      setLoading(false);
    }
  }, [email, companyName]);

  useEffect(() => {
    load();
  }, [load]);

  const openCv = (app: Application) => {
    if (!app.cvId) return;
    const cached = cvCache[app.cvId];
    setCvPanel({ cvId: app.cvId, cv: cached });
    if (!cached) {
      cvApi
        .getById(app.cvId)
        .then((cv) => {
          setCvCache((prev) => ({ ...prev, [cv.id]: cv }));
          setCvPanel((prev) => (prev?.cvId === cv.id ? { ...prev, cv } : prev));
        })
        .catch(() => {});
    }
  };

  const handleStatusChange = (app: Application, status: ApplicationStatus) => {
    if (status === "accepted" || status === "rejected") {
      setNote("");
      setNoteModal({ app, status });
      return;
    }
    void doUpdateStatus(app.id, status, "");
  };

  const doUpdateStatus = async (
    id: number,
    status: ApplicationStatus,
    noteText: string,
  ) => {
    setUpdating(id);
    try {
      const updated = await applicationApi.updateStatus(id, {
        status,
        note: noteText || undefined,
      });
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updated } : a)),
      );
      showToast("Cập nhật trạng thái thành công!");
    } catch {
      showToast("Cập nhật thất bại!", "error");
    } finally {
      setUpdating(null);
    }
  };

  const confirmNote = async () => {
    if (!noteModal) return;
    await doUpdateStatus(noteModal.app.id, noteModal.status, note);
    setNoteModal(null);
  };

  const filtered = apps.filter((a) => {
    if (selectedJobId !== "all" && a.jobId !== selectedJobId) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });
  const countOf = (s: ApplicationStatus) =>
    apps.filter((a) => a.status === s).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Ứng viên &amp; Hồ sơ ứng tuyển
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Quản lý hồ sơ ứng viên —{" "}
              <span className="font-medium text-gray-600">{companyName || email}</span>
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              {
                label: "Tất cả",
                value: apps.length,
                color: "text-gray-700",
                bg: "bg-white",
              },
              {
                label: "Chờ xét",
                value: countOf("pending"),
                color: "text-yellow-600",
                bg: "bg-yellow-50",
              },
              {
                label: "Đang xem xét",
                value: countOf("reviewing"),
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Đã chấp nhận",
                value: countOf("accepted"),
                color: "text-green-600",
                bg: "bg-green-50",
              },
            ] as const
          ).map((s) => (
            <div
              key={s.label}
              className={`${s.bg} border border-gray-100 rounded-xl p-4 text-center`}
            >
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={selectedJobId}
            onChange={(e) =>
              setSelectedJobId(
                e.target.value === "all" ? "all" : Number(e.target.value),
              )
            }
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            <option value="all">Tất cả tin tuyển dụng ({jobs.length})</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({apps.filter((a) => a.jobId === j.id).length})
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {(
              ["all", "pending", "reviewing", "accepted", "rejected"] as const
            ).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                  filterStatus === s
                    ? "bg-green-500 text-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s === "all"
                  ? `Tất cả (${apps.length})`
                  : `${STATUS_CONFIG[s].label} (${countOf(s)})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Send size={36} className="text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">
              Không có hồ sơ ứng tuyển nào
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => {
              const cfg = STATUS_CONFIG[app.status];
              const isUpdating = updating === app.id;
              return (
                <div
                  key={app.id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                          <User size={14} className="text-gray-400" />
                          Ứng viên #{app.userId}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                          <Briefcase size={12} />
                          {app.jobTitle ?? `Job #${app.jobId}`}
                        </span>
                      </div>

                      {app.coverLetter && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 line-clamp-3">
                          <Mail
                            size={12}
                            className="inline mr-1 text-gray-400"
                          />
                          {app.coverLetter}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {app.cvId ? (
                          <button
                            onClick={() => openCv(app)}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-full transition-colors font-medium"
                          >
                            <Eye size={11} />
                            {app.cv?.fileOriginalName ?? "Xem CV"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Không đính kèm CV
                          </span>
                        )}
                        {app.note && (
                          <span className="text-xs text-gray-500 italic bg-yellow-50 border border-yellow-100 rounded-full px-2.5 py-1">
                            💬 {app.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        {fmtDate(app.appliedAt)}
                      </span>
                      <div className="relative">
                        <select
                          value={app.status}
                          disabled={isUpdating}
                          onChange={(e) =>
                            handleStatusChange(
                              app,
                              e.target.value as ApplicationStatus,
                            )
                          }
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white pr-6 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-300 cursor-pointer appearance-none"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {isUpdating ? (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="w-3 h-3 border border-green-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <ChevronDown
                            size={10}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cvPanel && (
        <CvPanel
          cvId={cvPanel.cvId}
          cachedCv={cvPanel.cv}
          onClose={() => setCvPanel(null)}
        />
      )}

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              {noteModal.status === "accepted" ? (
                <CheckCircle2 size={22} className="text-green-500" />
              ) : (
                <XCircle size={22} className="text-red-500" />
              )}
              <h2 className="text-base font-semibold text-gray-800">
                {noteModal.status === "accepted"
                  ? "Chấp nhận ứng viên"
                  : "Từ chối ứng viên"}
              </h2>
            </div>
            <p className="text-sm text-gray-500">
              Ứng viên #{noteModal.app.userId}
              {noteModal.app.jobTitle && (
                <>
                  {" "}
                  &nbsp;·&nbsp;{" "}
                  <span className="text-green-600">
                    {noteModal.app.jobTitle}
                  </span>
                </>
              )}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ghi chú cho ứng viên{" "}
                <span className="text-gray-400">(không bắt buộc)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  noteModal.status === "accepted"
                    ? "VD: Cảm ơn bạn, chúng tôi sẽ liên hệ sớm..."
                    : "VD: Hồ sơ chưa phù hợp..."
                }
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setNoteModal(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={confirmNote}
                className={`flex-1 py-2 rounded-xl text-sm font-medium text-white transition-colors ${noteModal.status === "accepted" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
