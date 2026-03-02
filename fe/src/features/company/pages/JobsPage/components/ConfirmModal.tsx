import type { Job } from "@/features/student/pages/JobsPage/types";

interface ConfirmModalProps {
  open: boolean;
  job: Job | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  open,
  job,
  deleting,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  if (!open || !job) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <h3 className="font-semibold text-gray-800 text-base mb-2">
          Xoá tin tuyển dụng
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Bạn có chắc muốn xoá{" "}
          <span className="font-medium text-gray-700">"{job.title}"</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-70"
          >
            {deleting && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Xoá
          </button>
        </div>
      </div>
    </div>
  );
}
