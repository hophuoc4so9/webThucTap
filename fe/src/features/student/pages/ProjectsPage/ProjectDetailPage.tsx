import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  ChevronLeft,
  Building2,
  Coins,
  Calendar,
  Users,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  projectOrderApi,
  type ProjectOrder,
  type ProjectApplication,
} from "@/api/api/services/project-order.api";
import { formatDateDisplay } from "@/utils/date";

const parseTags = (s?: string): string[] => {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
};

interface Toast { message: string; type: "success" | "error" }

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { user } = useSelector((s: RootState) => s.auth);

  const [project, setProject] = useState<ProjectOrder | null>(null);
  const [myApplication, setMyApplication] = useState<ProjectApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: Toast["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setLoading(true);
    projectOrderApi.findOne(projectId)
      .then(async (p) => {
        setProject(p);
        // Check if already applied
        if (user?.id) {
          const apps = await projectOrderApi.getStudentApplications(+user.id);
          const mine = apps.find((a) => a.projectId === projectId);
          if (mine) setMyApplication(mine);
        }
      })
      .catch(() => showToast("Không thể tải thông tin dự án.", "error"))
      .finally(() => setLoading(false));
  }, [projectId, user?.id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { showToast("Vui lòng đăng nhập.", "error"); return; }
    setApplying(true);
    try {
      const app = await projectOrderApi.apply(projectId, {
        userId: +user.id,
        studentName: user.email ?? "",
        studentEmail: user.email ?? "",
        note: note.trim() || undefined,
      });
      setMyApplication(app);
      showToast("Ứng tuyển thành công!");
    } catch {
      showToast("Ứng tuyển thất bại. Vui lòng thử lại.", "error");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) return null;

  const techTags = parseTags(project.techStack);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft size={16} /> Quay lại
        </button>

        {/* Main card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{project.title}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
              <Building2 size={13} />
              <span>{project.companyName}</span>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {project.budget && (
              <span className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1 rounded-full">
                <Coins size={13} /> {project.budget}
              </span>
            )}
            {project.deadline && (
              <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full">
                <Calendar size={13} /> Hạn: {formatDateDisplay(project.deadline)}
              </span>
            )}
            <span className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full">
              <Users size={13} /> {project.maxStudents} sinh viên
            </span>
          </div>

          {/* Tech stack */}
          {techTags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Công nghệ</p>
              <div className="flex flex-wrap gap-1.5">
                {techTags.map((t) => (
                  <span key={t} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Mô tả dự án</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Requirements */}
          {project.requirements && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Yêu cầu</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.requirements}</p>
            </div>
          )}
        </div>

        {/* Apply section */}
        {myApplication ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
            <CheckCircle2 size={22} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Đã ứng tuyển</p>
              <p className="text-sm text-green-600 mt-0.5">
                Trạng thái:{" "}
                {{
                  pending: "Chờ xét duyệt",
                  reviewing: "Đang xem xét",
                  accepted: "Đã chấp nhận",
                  rejected: "Bị từ chối",
                }[myApplication.status]}
              </p>
            </div>
          </div>
        ) : project.status === "open" ? (
          <form onSubmit={handleApply} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Ứng tuyển dự án</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Thư giới thiệu / Ghi chú (tùy chọn)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Giới thiệu bản thân, kinh nghiệm liên quan, lý do muốn tham gia dự án..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={applying}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {applying ? "Đang gửi..." : "Gửi đơn ứng tuyển"}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            Dự án không còn nhận đơn ứng tuyển.
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
