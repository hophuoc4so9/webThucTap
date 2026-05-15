import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  FolderOpen,
  RefreshCw,
  Search,
  Building2,
  Coins,
  Calendar,
  Users,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import {
  projectOrderApi,
  type ProjectOrder,
  type ProjectApplication,
} from "@/api/api/services/project-order.api";
import { AppPagination } from "@/components/common/AppPagination";
import { formatDateDisplay } from "@/utils/date";

const DEFAULT_PAGE_SIZE = 12;

const parseTags = (s?: string): string[] => {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

const APP_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xét duyệt",
  reviewing: "Đang xem xét",
  accepted: "Đã chấp nhận",
  rejected: "Bị từ chối",
};

export function StudentProjectsPage() {
  const navigate = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const [projects, setProjects] = useState<ProjectOrder[]>([]);
  const [myApplications, setMyApplications] = useState<ProjectApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [res, apps] = await Promise.all([
        projectOrderApi.findAll({ status: "open", page, limit }),
        user?.id ? projectOrderApi.getStudentApplications(+user.id) : Promise.resolve([]),
      ]);
      setProjects(res.data ?? []);
      setTotal(res.total ?? 0);
      setMyApplications(apps ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, limit]);

  useEffect(() => { fetch(); }, [fetch]);

  const handlePageSizeChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.companyName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dự án từ doanh nghiệp</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Các dự án đang tuyển sinh viên thực hiện
          </p>
        </div>

        {/* My applications */}
        {myApplications.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-indigo-800 flex items-center gap-2 mb-2">
              <FileCheck size={16} /> Đơn ứng tuyển dự án của tôi ({myApplications.length})
            </h2>
            <div className="space-y-1.5">
              {myApplications.slice(0, 5).map((app) => (
                <button
                  key={app.id}
                  onClick={() => app.project && navigate(`/student/projects/${app.projectId}`)}
                  className="w-full flex items-center justify-between gap-2 text-left py-2 px-3 rounded-lg hover:bg-indigo-100/80 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {app.project?.title ?? `Dự án #${app.projectId}`}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full ${
                      app.status === "accepted" ? "bg-green-100 text-green-700" :
                      app.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {APP_STATUS_LABEL[app.status] ?? app.status}
                    </span>
                    <ChevronRight size={14} />
                  </span>
                </button>
              ))}
              {myApplications.length > 5 && (
                <p className="text-xs text-indigo-600 mt-1">Và {myApplications.length - 5} đơn khác</p>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên dự án hoặc công ty..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw size={28} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FolderOpen size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Chưa có dự án nào đang mở</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((project) => {
              const techTags = parseTags(project.techStack);
              return (
                <button
                  key={project.id}
                  onClick={() => navigate(`/student/projects/${project.id}`)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800">{project.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                        <Building2 size={13} />
                        <span>{project.companyName}</span>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        {project.budget && (
                          <span className="flex items-center gap-1">
                            <Coins size={11} /> {project.budget}
                          </span>
                        )}
                        {project.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {formatDateDisplay(project.deadline)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {project.maxStudents} sinh viên
                        </span>
                      </div>
                      {techTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {techTags.slice(0, 6).map((t) => (
                            <span key={t} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                          {techTags.length > 6 && (
                            <span className="text-xs text-gray-400">+{techTags.length - 6}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-gray-400">
                      {fmtDate(project.createdAt)}
                    </div>
                  </div>
                </button>
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
          activeLinkClassName="!bg-indigo-500 !text-white !border-indigo-500"
        />
      </div>
    </div>
  );
}
