import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Users, RefreshCw } from "lucide-react";
import {
  projectOrderApi,
  type ProjectOrder,
  type ProjectApplication,
} from "@/api/api/services/project-order.api";

const STATUS_CONFIG: Record<
  ProjectApplication["status"],
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Chờ xét duyệt", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  reviewing: { label: "Đang xem xét", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  accepted: { label: "Đã chấp nhận", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  rejected: { label: "Từ chối", color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

const STATUS_OPTIONS: { value: ProjectApplication["status"]; label: string }[] = [
  { value: "pending", label: "Chờ xét duyệt" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "accepted", label: "Đã chấp nhận" },
  { value: "rejected", label: "Từ chối" },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

interface Toast { message: string; type: "success" | "error" }

export function ProjectApplicantsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const [project, setProject] = useState<ProjectOrder | null>(null);
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: Toast["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [proj, apps] = await Promise.all([
        projectOrderApi.findOne(projectId),
        projectOrderApi.getApplications(projectId),
      ]);
      setProject(proj);
      setApplications(apps);
    } catch {
      showToast("Không thể tải dữ liệu.", "error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (appId: number, status: string) => {
    setUpdating(appId);
    try {
      const updated = await projectOrderApi.updateApplicationStatus(appId, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: updated.status } : a))
      );
      showToast("Đã cập nhật trạng thái.");
    } catch {
      showToast("Cập nhật thất bại.", "error");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800 truncate">
              {project ? project.title : "Đang tải..."}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {applications.length} đơn ứng tuyển
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Applications list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw size={28} className="animate-spin text-gray-400" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Chưa có đơn ứng tuyển nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const cfg = STATUS_CONFIG[app.status];
              return (
                <div
                  key={app.id}
                  className="bg-white border border-gray-200 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800">{app.studentName || `User #${app.userId}`}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {app.studentEmail && (
                        <p className="text-sm text-gray-500 mt-0.5">{app.studentEmail}</p>
                      )}
                      {app.note && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                          {app.note}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Ứng tuyển: {fmtDate(app.appliedAt)}
                      </p>
                    </div>

                    {/* Status select */}
                    <div className="shrink-0">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        disabled={updating === app.id}
                        className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
