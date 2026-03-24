import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import type { RootState } from "@/store";
import { Plus, FileText, Upload, CheckCircle2 } from "lucide-react";
import { cvApi } from "@/api/api/services/cv.api";
import type { Cv } from "@/features/student/types";
import { CvCard } from "./CvCard";

export const CVPage = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const userId = user ? Number(user.id) : 0;
  const navigate = useNavigate();
  const location = useLocation();
  const [cvs, setCvs] = useState<Cv[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    if (!userId) return;
    cvApi
      .getByUser(userId)
      .then((data) => setCvs(data))
      .catch(() => showToast("Không thể tải danh sách CV"))
      .finally(() => setLoading(false));
  }, [userId]);

  // Sau khi tạo/sửa CV từ form → cập nhật danh sách và thông báo
  useEffect(() => {
    const state = location.state as { saved?: boolean; savedType?: "create" | "update" } | null;
    if (state?.saved) {
      showToast(state.savedType === "update" ? "Đã cập nhật thông tin CV" : "Đã tạo CV thành công");
      window.history.replaceState({}, "", window.location.pathname);
      cvApi.getByUser(userId).then((data) => setCvs(data)).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Xác nhận xoá CV này?")) return;
    try {
      await cvApi.remove(id);
      setCvs((prev) => prev.filter((c) => c.id !== id));
      showToast("Đã xoá CV");
    } catch {
      showToast("Không thể xoá CV");
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm">
          <CheckCircle2 size={15} className="text-green-400" /> {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hồ sơ của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {cvs.length} CV · Quản lý hồ sơ ứng tuyển
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

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white rounded-xl border p-5"
            >
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cvs.map((cv) => (
            <CvCard
              key={cv.id}
              cv={cv}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onEdit={(c) => navigate(`/student/cv/${c.id}/edit`)}
            />
          ))}
        </div>
      )}

    </div>
  );
};
