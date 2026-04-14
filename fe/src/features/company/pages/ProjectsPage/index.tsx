import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "@/store";
import {
  Plus,
  RefreshCw,
  FolderOpen,
  Users,
  Calendar,
  Coins,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  projectOrderApi,
  type ProjectOrder,
} from "@/api/api/services/project-order.api";
import { AppPagination } from "@/components/common/AppPagination";
import { formatDateDisplay } from "@/utils/date";

const DEFAULT_PAGE_SIZE = 12;

const STATUS_CONFIG: Record<
  ProjectOrder["status"],
  { label: string; color: string; bg: string }
> = {
  open: { label: "Đang mở", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  in_progress: { label: "Đang thực hiện", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  closed: { label: "Đã đóng", color: "text-gray-600", bg: "bg-gray-100 border-gray-200" },
  cancelled: { label: "Đã huỷ", color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

const parseTags = (s?: string): string[] => {
  if (!s) return [];
  try {
    return JSON.parse(s) as string[];
  } catch {
    return [];
  }
};

interface Toast {
  message: string;
  type: "success" | "error";
}

export function CompanyProjectsPage() {
  const navigate = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);

  const [projects, setProjects] = useState<ProjectOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectOrder["status"] | "">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const showToast = (message: string, type: Toast["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await projectOrderApi.findAll({
        companyId: +user.id,
        status: statusFilter || undefined,
        page,
        limit,
      });
      setProjects(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      showToast("Không thể tải danh sách dự án.", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter, page, limit]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handlePageSizeChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectOrderApi.remove(deleteTarget.id);
      showToast("Đã xoá dự án.");
      setDeleteTarget(null);
      fetchProjects();
    } catch {
      showToast("Không thể xoá dự án.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Đặt hàng dự án</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Quản lý các dự án đặt hàng cho sinh viên thực tập
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProjects}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => navigate("/company/projects/new")}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={15} /> Tạo dự án mới
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Lọc:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter((e.target.value || "") as ProjectOrder["status"] | "");
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Tất cả</option>
            {(["open", "in_progress", "closed", "cancelled"] as ProjectOrder["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["open", "in_progress", "closed", "cancelled"] as ProjectOrder["status"][]).map((s) => {
            const count = projects.filter((p) => p.status === s).length;
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(statusFilter === s ? "" : s);
                  setPage(1);
                }}
                className={`rounded-xl border px-4 py-3 text-left transition-colors hover:opacity-90 ${cfg.bg} ${statusFilter === s ? "ring-2 ring-indigo-400" : ""}`}
              >
                <p className={`text-xl font-bold ${cfg.color}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw size={28} className="animate-spin text-gray-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FolderOpen size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Chưa có dự án nào</p>
            <p className="text-sm mt-1">Tạo dự án để bắt đầu nhận đơn ứng tuyển từ sinh viên</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const cfg = STATUS_CONFIG[project.status];
              const techTags = parseTags(project.techStack);
              const appCount = project.applications?.length ?? 0;
              return (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 truncate">{project.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        {project.budget && (
                          <span className="flex items-center gap-1">
                            <Coins size={12} /> {project.budget}
                          </span>
                        )}
                        {project.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {formatDateDisplay(project.deadline)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={12} /> Tối đa {project.maxStudents} sinh viên
                        </span>
                        <span className="flex items-center gap-1 text-indigo-600 font-medium">
                          <Users size={12} /> {appCount} đơn ứng tuyển
                        </span>
                      </div>
                      {techTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {techTags.map((t) => (
                            <span
                              key={t}
                              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => navigate(`/company/projects/${project.id}/applicants`)}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Xem đơn ứng tuyển"
                      >
                        <Users size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/company/projects/${project.id}/edit`)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(project)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xoá"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AppPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={handlePageSizeChange}
          pageSizeOptions={[12, 24, 48]}
          activeLinkClassName="!bg-green-600 !text-white !border-green-600"
        />
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="text-red-500" size={22} />
              <h3 className="font-semibold text-gray-800">Xoá dự án?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Bạn có chắc muốn xoá dự án <strong>{deleteTarget.title}</strong>? Toàn bộ đơn ứng tuyển sẽ bị xoá theo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Huỷ
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50"
              >
                {deleting ? "Đang xoá..." : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
