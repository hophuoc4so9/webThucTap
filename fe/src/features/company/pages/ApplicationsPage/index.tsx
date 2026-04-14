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
} from "lucide-react";
import { jobService } from "@/features/student/pages/JobsPage/services/jobService";
import { applicationApi } from "@/api/api/services/application.api";
import { cvApi } from "@/api/api/services/cv.api";
import type { Job } from "@/features/student/pages/JobsPage/types";
import type { Application, ApplicationStatus, Cv } from "@/features/student/types";
import { getCvPrintBodyHtml, VIEW_CV_STYLE } from "@/features/student/pages/CVPage/helpers";
import { getCvFileUrl } from "@/api/api/clients/apiConfig";
import { AppPagination } from "@/components/common/AppPagination";

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
  app: Application;
  currentStatus: ApplicationStatus;
  isUpdating: boolean;
  onChangeStatus: (status: ApplicationStatus) => void;
  onClose: () => void;
}

function CvPanel({
  cvId,
  cachedCv,
  app,
  currentStatus,
  isUpdating,
  onChangeStatus,
  onClose,
}: CvPanelProps) {
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
  const fileUrl = getCvFileUrl(cv?.filePath);

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
            <div>
              <h2 className="font-semibold text-gray-800">Chi tiết CV</h2>
              <p className="text-[11px] text-gray-500">
                Ứng viên #{app.userId} · {app.jobTitle ?? `Job #${app.jobId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end gap-1">
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_CONFIG[currentStatus].bg} ${STATUS_CONFIG[currentStatus].color}`}
              >
                {STATUS_CONFIG[currentStatus].label}
              </span>
              <div className="relative">
                <select
                  value={currentStatus}
                  disabled={isUpdating}
                  onChange={(e) =>
                    onChangeStatus(e.target.value as ApplicationStatus)
                  }
                  className="text-[11px] border border-gray-200 rounded-md px-2 pr-5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-green-400 cursor-pointer appearance-none"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {isUpdating ? (
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border border-green-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ChevronDown
                    size={10}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
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
              {/* Header CV */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {cv.fullName || cv.title || "CV không tiêu đề"}
                  </h3>
                  {cv.jobPosition && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {cv.jobPosition}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    Tạo: {fmtDate(cv.createdAt)}
                  </p>
                </div>
                <div className="text-right text-[11px] text-gray-500 space-y-1">
                  {cv.phone && <p>{cv.phone}</p>}
                  {cv.contactEmail && <p>{cv.contactEmail}</p>}
                  {cv.address && <p>{cv.address}</p>}
                  {cv.linkedIn && (
                    <p className="truncate max-w-[160px]">
                      {cv.linkedIn}
                    </p>
                  )}
                </div>
              </div>

              {fileUrl && (
                <div className="space-y-3">
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
                  {cv.fileMimeType?.includes("pdf") && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden h-[480px] bg-gray-50">
                      <iframe
                        src={fileUrl}
                        title={cv.fileOriginalName ?? "CV PDF"}
                        className="w-full h-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Nội dung CV dạng form (nếu có) – render lại theo layout PDF giống bên sinh viên */}
              {(cv.summary || cv.skills || cv.education || cv.experience || cv.projects) && (
                <div className="border border-gray-200 rounded-2xl bg-gray-100/70 p-3">
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <style>{VIEW_CV_STYLE}</style>
                    <div
                      className="cv-view-document"
                      // sử dụng cùng HTML body với view PDF bên sinh viên
                      dangerouslySetInnerHTML={{ __html: getCvPrintBodyHtml(cv as Cv) }}
                    />
                  </div>
                </div>
              )}

              {!cv.summary &&
                skills.length === 0 &&
                !cv.education &&
                !cv.experience &&
                !cv.projects &&
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [selectedJobId, setSelectedJobId] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "all">(
    "all",
  );
  const [updating, setUpdating] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [cvPanel, setCvPanel] = useState<{ cvId: number; cv?: Cv; app: Application } | null>(null);
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
      setPage(1);
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
    setCvPanel({ cvId: app.cvId, cv: cached, app });
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
  const paged = filtered.slice((page - 1) * limit, page * limit);
  const pagedTotalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const countOf = (s: ApplicationStatus) =>
    apps.filter((a) => a.status === s).length;

  const handlePageSizeChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Ứng viên &amp; Hồ sơ ứng tuyển
            </h1>
            {/* <p className="text-sm text-gray-400 mt-0.5">
              Quản lý hồ sơ ứng viên —{" "}
              <span className="font-medium text-gray-600">{companyName || email}</span>
            </p> */}
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
            onChange={(e) => {
              setSelectedJobId(
                e.target.value === "all" ? "all" : Number(e.target.value),
              );
              setPage(1);
            }}
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
            {(["all", "pending", "reviewing", "accepted", "rejected"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => {
                    setFilterStatus(s);
                    setPage(1);
                  }}
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
              ),
            )}
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
            {paged.map((app) => {
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
                          <Mail size={12} className="inline mr-1 text-gray-400" />
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

        {filtered.length > 0 && (
          <AppPagination
            page={page}
            totalPages={pagedTotalPages}
            total={filtered.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={handlePageSizeChange}
            pageSizeOptions={[8, 12, 24]}
            activeLinkClassName="!bg-green-500 !text-white !border-green-500"
          />
        )}
      </div>

      {cvPanel && (
        <CvPanel
          cvId={cvPanel.cvId}
          cachedCv={cvPanel.cv}
          app={cvPanel.app}
          currentStatus={cvPanel.app.status}
          isUpdating={updating === cvPanel.app.id}
          onChangeStatus={(status) => handleStatusChange(cvPanel.app, status)}
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
