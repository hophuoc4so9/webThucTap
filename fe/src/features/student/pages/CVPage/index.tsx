import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Plus, FileText, Upload, CheckCircle2 } from "lucide-react";
import { cvApi } from "@/api/api/services/cv.api";
import type { Cv } from "@/features/student/types";
import { CvCard } from "./CvCard";
import { CvModal, type ModalMode } from "./CvModal";

export const CVPage = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const userId = user ? Number(user.id) : 0;
  const [cvs, setCvs] = useState<Cv[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: ModalMode;
    cv?: Cv;
  }>({ open: false, mode: "create-text" });
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

  const handleSaved = (cv: Cv) => {
    setModal({ open: false, mode: "create-text" });
    setCvs((prev) => {
      const idx = prev.findIndex((c) => c.id === cv.id);
      const base =
        idx >= 0 ? prev.map((c, i) => (i === idx ? cv : c)) : [cv, ...prev];
      return cv.isDefault
        ? base.map((c) => (c.id === cv.id ? c : { ...c, isDefault: false }))
        : base;
    });
    showToast(modal.mode === "edit" ? "Đã cập nhật CV" : "Đã tạo CV mới");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hồ sơ của tôi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {cvs.length} CV · Quản lý hồ sơ ứng tuyển
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal({ open: true, mode: "create-text" })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <Plus size={15} /> CV text
          </button>
          <button
            onClick={() => setModal({ open: true, mode: "create-file" })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
          >
            <Upload size={15} /> Upload CV
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
        <div className="text-center py-20">
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Bạn chưa có CV nào</p>
          <p className="text-sm text-gray-400 mt-1">
            Tạo CV text hoặc upload file để bắt đầu ứng tuyển
          </p>
          <div className="flex justify-center gap-3 mt-5">
            <button
              onClick={() => setModal({ open: true, mode: "create-text" })}
              className="px-5 py-2 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
            >
              ✏️ Tạo CV text
            </button>
            <button
              onClick={() => setModal({ open: true, mode: "create-file" })}
              className="px-5 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
            >
              📎 Upload CV
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
              onEdit={(c) => setModal({ open: true, mode: "edit", cv: c })}
            />
          ))}
        </div>
      )}

      {modal.open && (
        <CvModal
          mode={modal.mode}
          initial={modal.cv}
          userId={userId}
          onClose={() => setModal({ open: false, mode: "create-text" })}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
