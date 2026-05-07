import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Trash2,
  ShieldCheck,
  X,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Building,
  Calendar,
  ChevronDown,
  RefreshCw,
  FileText,
  UserCheck,
  ListFilter,
  CheckCircle
} from "lucide-react";
import { useUserManagement } from "../../hooks/useUserManagement";
import { AppPagination } from "@/components/common/AppPagination";
import { cvApi } from "@/api/api/services/cv.api";
import { applicationApi } from "@/api/api/services/application.api";
import type { Application, Cv } from "@/features/student/types";
import { getCvPrintBodyHtml, VIEW_CV_STYLE } from "@/features/student/pages/CVPage/helpers";
import { getCvFileUrl } from "@/api/api/clients/apiConfig";

const ROLE_LABELS: Record<string, string> = {
  student: "Sinh viên",
  company: "Công ty",
  admin: "Quản trị viên",
};

const ROLE_BADGE: Record<string, string> = {
  student: "bg-blue-50 text-blue-700 border border-blue-100",
  company: "bg-green-50 text-green-700 border border-green-100",
  admin: "bg-purple-50 text-purple-700 border border-purple-100",
};

const RECRUITER_BADGE: Record<string, string> = {
  none: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const APP_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  pending: {
    label: "Chờ xét duyệt",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: Clock,
  },
  reviewing: {
    label: "Đang xem xét",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Eye,
  },
  accepted: {
    label: "Đã chấp nhận",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Từ chối",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: XCircle,
  },
};

const APP_STATUS_OPTIONS = [
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

/* ── CV PANEL MODAL COMPONENT ──────────────────────────────── */
interface CvPanelProps {
  cvId: number;
  cachedCv?: Cv;
  app: Application;
  currentStatus: string;
  isUpdating: boolean;
  onChangeStatus: (status: string) => void;
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

  const fileUrl = getCvFileUrl(cv?.filePath);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Hồ sơ ứng tuyển &amp; CV</h2>
              <p className="text-[11px] text-gray-500">
                Sinh viên #{app.userId} · {app.jobTitle ?? `Tin tuyển dụng #${app.jobId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${APP_STATUS_CONFIG[currentStatus]?.bg} ${APP_STATUS_CONFIG[currentStatus]?.border} ${APP_STATUS_CONFIG[currentStatus]?.color}`}
              >
                {APP_STATUS_CONFIG[currentStatus]?.label ?? currentStatus}
              </span>
              <div className="relative">
                <select
                  value={currentStatus}
                  disabled={isUpdating}
                  onChange={(e) => onChangeStatus(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded-md px-2 pr-5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none font-medium text-gray-700"
                >
                  {APP_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !cv ? (
            <div className="flex flex-col items-center py-16 text-center">
              <AlertCircle size={36} className="text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">Không tìm thấy CV đi kèm</p>
            </div>
          ) : (
            <>
              {/* Cover Letter Section if any */}
              {app.coverLetter && (
                <div className="bg-blue-50/50 border border-blue-100/70 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1.5">Thư giới thiệu / Cover Letter:</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{app.coverLetter}</p>
                </div>
              )}

              {/* Header CV */}
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {cv.fullName || cv.title || "CV chưa đặt tên"}
                  </h3>
                  {cv.jobPosition && (
                    <p className="text-sm text-blue-600 font-medium mt-0.5">
                      {cv.jobPosition}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2">
                    Cập nhật cuối: {fmtDate(cv.updatedAt)}
                  </p>
                </div>
                <div className="text-right text-[11px] text-gray-500 space-y-1">
                  {cv.phone && <p className="font-medium text-gray-700">📞 {cv.phone}</p>}
                  {cv.contactEmail && <p>📧 {cv.contactEmail}</p>}
                  {cv.address && <p>📍 {cv.address}</p>}
                  {cv.linkedIn && (
                    <p className="truncate max-w-[180px] text-blue-600 hover:underline">
                      <a href={cv.linkedIn} target="_blank" rel="noreferrer">🔗 LinkedIn</a>
                    </p>
                  )}
                </div>
              </div>

              {fileUrl && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <FileText size={22} className="text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">
                        {cv.fileOriginalName ?? "Tài liệu CV đính kèm"}
                      </p>
                      <p className="text-[10px] text-gray-400">{cv.fileMimeType}</p>
                    </div>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shrink-0"
                    >
                      <Download size={13} /> Tải CV
                    </a>
                  </div>
                  {cv.fileMimeType?.includes("pdf") && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden h-[450px] bg-gray-50 shadow-inner">
                      <iframe
                        src={fileUrl}
                        title={cv.fileOriginalName ?? "CV PDF"}
                        className="w-full h-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Form Content rendering if exists */}
              {(cv.summary || cv.skills || cv.education || cv.experience || cv.projects) && (
                <div className="border border-gray-200 rounded-xl bg-gray-100 p-2 shadow-inner">
                  <div className="bg-white rounded-lg overflow-hidden">
                    <style>{VIEW_CV_STYLE}</style>
                    <div
                      className="cv-view-document"
                      dangerouslySetInnerHTML={{ __html: getCvPrintBodyHtml(cv as Cv) }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ── STUDENT DETAILS DRAWER COMPONENT ──────────────────────── */
interface StudentDrawerProps {
  student: any;
  studentApps: Application[];
  onClose: () => void;
  onOpenCv: (app: Application) => void;
  onStatusChange: (app: Application, status: string) => void;
}

function StudentDrawer({
  student,
  studentApps,
  onClose,
  onOpenCv,
  onStatusChange,
}: StudentDrawerProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Thông tin sinh viên</h2>
              <p className="text-xs text-gray-500">Mã tài khoản: #{student.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Student Profile Card */}
          <div className="bg-gradient-to-br from-gray-55 to-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Tài khoản sinh viên</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Địa chỉ Email</span>
                <span className="font-semibold text-gray-900 break-all">{student.email}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Vai trò</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 mt-1">
                  Sinh viên
                </span>
              </div>
            </div>
          </div>

          {/* Applications list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Lịch sử ứng tuyển ({studentApps.length})</h3>
            </div>

            {studentApps.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <Briefcase size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sinh viên chưa ứng tuyển vị trí nào</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {studentApps.map((app) => {
                  const cfg = APP_STATUS_CONFIG[app.status] || {
                    label: app.status,
                    color: "text-gray-600",
                    bg: "bg-gray-50",
                    border: "border-gray-200",
                    icon: AlertCircle,
                  };
                  const StatusIcon = cfg.icon;

                  return (
                    <div
                      key={app.id}
                      className="bg-white border border-gray-100 hover:border-gray-200 rounded-xl p-4.5 shadow-sm space-y-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">{app.jobTitle ?? "Không có tiêu đề"}</h4>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                            <Building size={11} className="text-gray-400" />
                            {app.companyName ?? "Công ty ẩn danh"}
                          </span>
                        </div>
                        <span
                          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}
                        >
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </div>

                      {app.coverLetter && (
                        <p className="text-xs text-gray-600 bg-gray-50/75 rounded-lg p-3 line-clamp-2 italic border border-gray-100">
                          " {app.coverLetter} "
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-50">
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Calendar size={10} />
                          {fmtDate(app.appliedAt)}
                        </span>

                        <div className="flex items-center gap-2">
                          {app.cvId && (
                            <button
                              onClick={() => onOpenCv(app)}
                              className="text-[10px] px-2.5 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg font-medium transition-colors flex items-center gap-1"
                            >
                              <Eye size={10} /> Xem CV
                            </button>
                          )}
                          <div className="relative">
                            <select
                              value={app.status}
                              onChange={(e) => onStatusChange(app, e.target.value)}
                              className="text-[10px] font-medium border border-gray-200 rounded-lg px-2 pr-5 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer appearance-none text-gray-700"
                            >
                              {APP_STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {app.note && (
                        <p className="text-[11px] text-amber-800 bg-amber-50/50 border border-amber-100 rounded-lg px-3 py-1.5">
                          💡 <strong>Phản hồi:</strong> {app.note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── MAIN COMPONENT ────────────────────────────────────────── */
const StudentsManagement = () => {
  const vm = useUserManagement("student");
  const roleOptions = ["company", "admin"] as const;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"students" | "applications">("students");

  // Filtering / Search states for Student tab
  const [internshipFilter, setInternshipFilter] = useState<"all" | "accepted" | "pending" | "none">("all");

  // Filtering / Search states for Applications tab
  const [appStatusFilter, setAppStatusFilter] = useState<string>("all");
  const [appSearch, setAppSearch] = useState<string>("");

  // Drawer / Modals states
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [cvPanel, setCvPanel] = useState<{ cvId: number; cv?: Cv; app: Application } | null>(null);
  const [cvCache, setCvCache] = useState<Record<number, Cv>>({});
  const [noteModal, setNoteModal] = useState<{ app: Application; status: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [updatingAppId, setUpdatingAppId] = useState<number | null>(null);

  // Group applications by userId
  const appsByUserId = useMemo(() => {
    const map: Record<number, Application[]> = {};
    vm.allApplications.forEach((app) => {
      if (!map[app.userId]) {
        map[app.userId] = [];
      }
      map[app.userId].push(app);
    });
    return map;
  }, [vm.allApplications]);

  // Get applications of a student
  const getStudentApps = useCallback(
    (userId: number) => {
      return appsByUserId[userId] || [];
    },
    [appsByUserId]
  );

  // Compute stats system-wide
  const stats = useMemo(() => {
    const acceptedStudentIds = new Set<number>();
    const pendingStudentIds = new Set<number>();

    vm.allApplications.forEach((app) => {
      if (app.status === "accepted") {
        acceptedStudentIds.add(app.userId);
      }
    });

    vm.allApplications.forEach((app) => {
      if (
        (app.status === "pending" || app.status === "reviewing") &&
        !acceptedStudentIds.has(app.userId)
      ) {
        pendingStudentIds.add(app.userId);
      }
    });

    const acceptedCount = acceptedStudentIds.size;
    const pendingCount = pendingStudentIds.size;
    const noInternshipCount = Math.max(0, vm.total - acceptedCount - pendingCount);

    return {
      total: vm.total,
      accepted: acceptedCount,
      pending: pendingCount,
      none: noInternshipCount,
      acceptedPercent: Math.round((acceptedCount / (vm.total || 1)) * 100),
      pendingPercent: Math.round((pendingCount / (vm.total || 1)) * 100),
      nonePercent: Math.round((noInternshipCount / (vm.total || 1)) * 100),
    };
  }, [vm.allApplications, vm.total]);

  // Determine a student's internship status
  const getStudentInternshipStatus = useCallback(
    (userId: number) => {
      const studentApps = appsByUserId[userId] || [];
      if (studentApps.some((a) => a.status === "accepted")) return "accepted";
      if (studentApps.some((a) => a.status === "pending" || a.status === "reviewing")) return "pending";
      if (studentApps.some((a) => a.status === "rejected")) return "rejected";
      return "none";
    },
    [appsByUserId],
  );

  // Find a student's accepted or active application
  const getStudentInternshipDetail = useCallback(
    (userId: number) => {
      const studentApps = appsByUserId[userId] || [];
      const accepted = studentApps.find((a) => a.status === "accepted");
      if (accepted) return accepted;
      return studentApps.find((a) => a.status === "pending" || a.status === "reviewing") || null;
    },
    [appsByUserId],
  );

  // Filter students client-side if a status filter is active
  const filteredStudents = useMemo(() => {
    return vm.users.filter((u) => {
      if (internshipFilter === "all") return true;
      const status = getStudentInternshipStatus(u.id);
      return status === internshipFilter;
    });
  }, [vm.users, getStudentInternshipStatus, internshipFilter]);

  // Filter applications list
  const filteredApplications = useMemo(() => {
    return vm.allApplications.filter((app) => {
      // Status filter
      if (appStatusFilter !== "all" && app.status !== appStatusFilter) return false;
      // Search filter
      if (appSearch.trim()) {
        const query = appSearch.toLowerCase();
        const comp = app.companyName?.toLowerCase() ?? "";
        const job = app.jobTitle?.toLowerCase() ?? "";
        const id = String(app.userId);
        return comp.includes(query) || job.includes(query) || id.includes(query);
      }
      return true;
    });
  }, [vm.allApplications, appStatusFilter, appSearch]);

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
        .catch(() => { });
    }
  };

  const handleStatusChangeClick = (app: Application, status: string) => {
    if (status === "accepted" || status === "rejected") {
      setNoteText("");
      setNoteModal({ app, status });
      return;
    }
    void doUpdateApplicationStatus(app.id, status, "");
  };

  const doUpdateApplicationStatus = async (appId: number, status: string, note: string) => {
    setUpdatingAppId(appId);
    try {
      await vm.handleUpdateApplicationStatus(appId, status, note);
    } finally {
      setUpdatingAppId(null);
    }
  };

  const confirmStatusUpdateNote = async () => {
    if (!noteModal) return;
    await doUpdateApplicationStatus(noteModal.app.id, noteModal.status, noteText);
    setNoteModal(null);
  };

  return (
    <div className="p-6 space-y-7 min-h-screen bg-slate-50/50 text-gray-850">
      {/* Toast Notification */}
      {vm.toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold transition-all duration-300 transform animate-bounce ${vm.toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
        >
          {vm.toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {vm.toast.msg}
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <GraduationCap size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Quản lý Sinh viên &amp; Thực tập
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1 pl-1">
            Hệ thống giám sát, thống kê tiến độ và phê duyệt các hồ sơ thực tập của sinh viên.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={vm.refresh}
            disabled={vm.loading || vm.appsLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 hover:border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all font-medium text-gray-700 disabled:opacity-55 shrink-0 bg-white"
          >
            <RefreshCw size={14} className={vm.loading || vm.appsLoading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-md shadow-blue-100 hover:shadow-lg hover:shadow-blue-150 transition-all transform hover:-translate-y-0.5 duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider block">Tổng sinh viên</span>
              <span className="text-3xl font-extrabold tracking-tight">{stats.total}</span>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <GraduationCap size={22} className="text-white" />
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: "100%" }} />
            </div>
            <span className="text-[11px] text-blue-100 block font-medium">Tài khoản sinh viên đăng ký</span>
          </div>
        </div>

        {/* Card 2: Got Internship */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Đã có nơi thực tập</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{stats.accepted}</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-md">+{stats.acceptedPercent}%</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.acceptedPercent}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 block font-medium">Đã được các doanh nghiệp chấp nhận</span>
          </div>
        </div>

        {/* Card 3: Actively Applying */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Đang chờ xét duyệt</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{stats.pending}</span>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">+{stats.pendingPercent}%</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={22} />
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${stats.pendingPercent}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 block font-medium">Hồ sơ chờ doanh nghiệp phê duyệt</span>
          </div>
        </div>

        {/* Card 4: No Internship Yet */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Chưa có nơi thực tập</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{stats.none}</span>
                <span className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md">{stats.nonePercent}%</span>
              </div>
            </div>
            <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
              <XCircle size={22} />
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.nonePercent}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 block font-medium">Chưa nộp đơn hoặc chưa được nhận</span>
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-gray-250">
        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 ${activeTab === "students"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
        >
          <UserCheck size={16} />
          Tài khoản Sinh viên ({vm.total})
        </button>
        <button
          onClick={() => setActiveTab("applications")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 ${activeTab === "applications"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
        >
          <ListFilter size={16} />
          Danh sách Ứng tuyển ({vm.allApplications.length})
        </button>
      </div>

      {/* MAIN VIEW CONTENTS */}
      {activeTab === "students" ? (
        /* TAB 1: STUDENT ACCOUNTS & STATUS */
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row gap-3.5 lg:items-center justify-between">
            <div className="flex flex-wrap gap-2.5">
              {/* Internship Filter Buttons */}
              <button
                onClick={() => setInternshipFilter("all")}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all border ${internshipFilter === "all"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Tất cả sinh viên
              </button>
              <button
                onClick={() => setInternshipFilter("accepted")}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all border ${internshipFilter === "accepted"
                    ? "bg-green-600 border-green-600 text-white shadow-md shadow-green-100"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Đã nhận thực tập ({stats.accepted})
              </button>
              <button
                onClick={() => setInternshipFilter("pending")}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all border ${internshipFilter === "pending"
                    ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Đang ứng tuyển ({stats.pending})
              </button>
              <button
                onClick={() => setInternshipFilter("none")}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all border ${internshipFilter === "none"
                    ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-100"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Chưa có nơi thực tập ({stats.none})
              </button>
            </div>

            {/* Email Search input */}
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={vm.emailInput}
                  onChange={(e) => vm.setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && vm.applySearch()}
                  placeholder="Tìm sinh viên theo email..."
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-900 w-full sm:w-64 shadow-sm"
                />
              </div>
              <button
                onClick={vm.applySearch}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-sm shrink-0 flex items-center justify-center"
                title="Tìm kiếm"
              >
                <Search className="w-4 h-4" />
              </button>
              {vm.email && (
                <button
                  onClick={vm.clearSearch}
                  className="px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 bg-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">
                      Mã SV
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Sinh viên / Email
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-44">
                      Vị trí thực tập hiện tại
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                      Vai trò
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-40 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vm.loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          Đang tải danh sách sinh viên...
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                        <Briefcase size={32} className="mx-auto mb-2 text-gray-300" />
                        Không tìm thấy dữ liệu sinh viên phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((u) => {
                      const internStatus = getStudentInternshipStatus(u.id);
                      const activeApp = getStudentInternshipDetail(u.id);

                      return (
                        <tr key={u.id} className="hover:bg-indigo-50/35 transition-colors group">
                          <td className="px-6 py-4 text-xs text-gray-500 font-semibold">
                            #{u.id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                {u.name || "Chưa cập nhật tên"}
                              </span>
                              <span className="text-xs text-gray-400 mt-0.5">{u.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {internStatus === "accepted" && activeApp ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-100">
                                  <CheckCircle2 size={10} /> Đã nhận thực tập
                                </span>
                                <p className="text-xs font-bold text-gray-800 truncate max-w-[170px]">{activeApp.companyName}</p>
                                <p className="text-[10px] text-gray-500 truncate max-w-[170px]">{activeApp.jobTitle}</p>
                              </div>
                            ) : internStatus === "pending" && activeApp ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                  <Clock size={10} /> Đang ứng tuyển
                                </span>
                                <p className="text-xs font-semibold text-gray-700 truncate max-w-[170px]">{activeApp.companyName}</p>
                              </div>
                            ) : internStatus === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                                <XCircle size={10} /> Bị từ chối
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                Chưa đăng ký
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE[u.role] ?? "bg-gray-100"}`}>
                              {ROLE_LABELS[u.role] ?? u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                title="Xem chi tiết thực tập"
                                onClick={() => setSelectedStudent(u)}
                                className="p-2 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                title="Thay đổi vai trò"
                                onClick={() => vm.setRoleTarget(u)}
                                className="p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button
                                title="Xóa tài khoản"
                                onClick={() => vm.setDeleteTarget(u)}
                                className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {vm.totalPages > 1 && (
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <AppPagination
                  page={vm.page}
                  totalPages={vm.totalPages}
                  total={vm.total}
                  limit={vm.PAGE_SIZE}
                  onPageChange={vm.goPage}
                  activeLinkClassName="!bg-indigo-600 !text-white !border-indigo-600"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: ALL INTERNSHIP APPLICATIONS HUB */
        <div className="space-y-4">
          {/* Filtering Applications Controls */}
          <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
            {/* Status filters */}
            <div className="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm max-w-max">
              <button
                onClick={() => setAppStatusFilter("all")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${appStatusFilter === "all" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                Tất cả ({vm.allApplications.length})
              </button>
              {APP_STATUS_OPTIONS.map((opt) => {
                const count = vm.allApplications.filter((a) => a.status === opt.value).length;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAppStatusFilter(opt.value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${appStatusFilter === opt.value
                        ? "bg-indigo-600 text-white"
                        : "text-gray-500 hover:text-gray-900"
                      }`}
                  >
                    {opt.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="Tìm công ty, vị trí, mã sinh viên..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-900 w-full sm:w-72 shadow-sm"
              />
            </div>
          </div>

          {/* List of Applications */}
          {vm.appsLoading ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
              <p className="text-gray-400 text-sm">Đang tải toàn bộ hồ sơ ứng tuyển...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <Briefcase size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Không có hồ sơ ứng tuyển nào khớp với bộ lọc</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApplications.map((app) => {
                const cfg = APP_STATUS_CONFIG[app.status] || {
                  label: app.status,
                  color: "text-gray-600",
                  bg: "bg-gray-50",
                  border: "border-gray-200",
                  icon: AlertCircle,
                };
                const StatusIcon = cfg.icon;
                const isUpdating = updatingAppId === app.id;

                return (
                  <div
                    key={app.id}
                    className="bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">HỒ SƠ # {app.id}</span>
                          <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">{app.jobTitle ?? "Không có tiêu đề"}</h4>
                          <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-1">
                            <Building size={12} />
                            {app.companyName ?? "Doanh nghiệp"}
                          </span>
                        </div>
                        <span
                          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}
                        >
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                        <p>👤 <strong>Sinh viên ID:</strong> #{app.userId}</p>
                        <p>📅 <strong>Ngày nộp:</strong> {fmtDate(app.appliedAt)}</p>
                        {app.coverLetter && (
                          <p className="line-clamp-2 italic text-gray-500 border-t border-slate-100 pt-1.5 mt-1.5">
                            " {app.coverLetter} "
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-50">
                      <div>
                        {app.cvId ? (
                          <button
                            onClick={() => openCv(app)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg font-semibold transition-colors"
                          >
                            <Eye size={12} /> CV Ứng tuyển
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Không có CV</span>
                        )}
                      </div>

                      <div className="relative">
                        <select
                          value={app.status}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChangeClick(app, e.target.value)}
                          className="text-xs font-semibold border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-55 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer appearance-none text-gray-700"
                        >
                          {APP_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        {isUpdating && (
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {app.note && (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl px-3.5 py-2 text-xs text-amber-800">
                        💬 <strong>Phản hồi admin:</strong> {app.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STUDENT DETAILS DRAWER PANEL */}
      {selectedStudent && (
        <StudentDrawer
          student={selectedStudent}
          studentApps={getStudentApps(selectedStudent.id)}
          onClose={() => setSelectedStudent(null)}
          onOpenCv={openCv}
          onStatusChange={handleStatusChangeClick}
        />
      )}

      {/* DETAILED CV PANEL MODAL */}
      {cvPanel && (
        <CvPanel
          cvId={cvPanel.cvId}
          cachedCv={cvPanel.cv}
          app={cvPanel.app}
          currentStatus={cvPanel.app.status}
          isUpdating={updatingAppId === cvPanel.app.id}
          onChangeStatus={(status) => handleStatusChangeClick(cvPanel.app, status)}
          onClose={() => setCvPanel(null)}
        />
      )}

      {/* RECRUITER / ADMIN STATUS UPDATE NOTE MODAL */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4.5 border border-gray-100">
            <div className="flex items-center gap-3">
              {noteModal.status === "accepted" ? (
                <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                  <CheckCircle2 size={20} />
                </div>
              ) : (
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <XCircle size={20} />
                </div>
              )}
              <h2 className="text-base font-bold text-gray-900">
                {noteModal.status === "accepted" ? "Chấp nhận đơn thực tập" : "Từ chối đơn thực tập"}
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              Đơn tuyển sinh viên #{noteModal.app.userId} vào vị trí{" "}
              <span className="font-bold text-indigo-600">{noteModal.app.jobTitle}</span> của{" "}
              <span className="font-semibold text-gray-800">{noteModal.app.companyName}</span>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Nhập ghi chú phản hồi <span className="text-gray-400 font-normal">(tùy chọn)</span>:
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder={
                  noteModal.status === "accepted"
                    ? "VD: Chúc mừng bạn đã được chấp nhận thực tập tại TMA. Vui lòng kiểm tra email..."
                    : "VD: Cảm ơn bạn đã quan tâm. Rất tiếc hồ sơ chưa phù hợp..."
                }
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-inner bg-slate-50/20 text-gray-900"
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setNoteModal(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={confirmStatusUpdateNote}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${noteModal.status === "accepted" ? "bg-green-600 hover:bg-green-700 shadow-md shadow-green-100" : "bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-100"
                  }`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORIGINAL MODALS RETAINED */}
      {/* 1. Account Delete Confirmation */}
      {vm.deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Xác nhận xóa tài khoản
            </h3>
            <p className="text-xs text-gray-500">
              Bạn có chắc chắn muốn xóa tài khoản của sinh viên{" "}
              <span className="font-bold text-gray-800">{vm.deleteTarget.email}</span>? Hành động này sẽ xóa vĩnh viễn tài khoản và không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => vm.setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm hover:bg-gray-50 transition-colors text-gray-700 font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={vm.handleDelete}
                disabled={vm.deleting}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs sm:text-sm hover:bg-rose-700 disabled:opacity-60 transition-colors font-semibold shadow-md shadow-rose-100"
              >
                {vm.deleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Role Change Modal */}
      {vm.roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Đổi vai trò tài khoản
            </h3>
            <p className="text-xs text-gray-500">
              Sinh viên: <span className="font-bold text-gray-800">{vm.roleTarget.email}</span>
            </p>
            <p className="text-xs font-semibold text-gray-600">Chọn vai trò mới:</p>
            <div className="flex flex-col gap-2">
              {roleOptions.map((r) => (
                <button
                  key={r}
                  disabled={vm.roleSaving}
                  onClick={() => vm.handleUpdateRole(r)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors text-left text-gray-800 font-semibold flex items-center justify-between"
                >
                  {ROLE_LABELS[r]}
                  <ChevronDown size={12} className="-rotate-90 text-gray-400" />
                </button>
              ))}
            </div>
            <button
              onClick={() => vm.setRoleTarget(null)}
              className="w-full text-center py-2 text-xs sm:text-sm text-gray-400 hover:text-gray-600 transition-colors font-semibold pt-1"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { StudentsManagement };
