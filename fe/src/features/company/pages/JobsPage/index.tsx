import {
  Building2,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useCompanyJobs } from "./hooks/useCompanyJobs";
import { StatsRow } from "./components/StatsRow";
import { JobsTable } from "./components/JobsTable";
import { JobModal } from "./components/JobModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { JobDetailDrawer } from "./components/JobDetailDrawer";
import { Toast } from "./components/Toast";
import { PAGE_SIZE } from "./constants";

export function JobsPage() {
  const h = useCompanyJobs();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Tin tuyển dụng</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Quản lý tin tuyển dụng của công ty bạn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={h.refresh}
              disabled={h.loading || !h.companyName}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw
                size={16}
                className={h.loading ? "animate-spin" : ""}
              />
            </button>
            {h.companyName && (
              <button
                onClick={h.openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus size={15} /> Đăng tin mới
              </button>
            )}
          </div>
        </div>

       
        {/* Stats */}
        {h.companyName && (
          <StatsRow
            total={h.total}
            openCount={h.openCount}
            expiredCount={h.expiredCount}
          />
        )}

        {/* Table */}
        {h.companyName && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <JobsTable
              jobs={h.pagedJobs}
              page={h.page}
              loading={h.loading}
              companyName={h.companyName}
              onPreview={h.setPreviewJob}
              onEdit={h.openEdit}
              onDelete={h.setDeleteTarget}
              onCreateFirst={h.openCreate}
            />

            {/* Pagination */}
            {h.total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                <span>
                  {(h.page - 1) * PAGE_SIZE + 1}–
                  {Math.min(h.page * PAGE_SIZE, h.total)} / {h.total} tin
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => h.setPage((p) => Math.max(1, p - 1))}
                    disabled={h.page === 1}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: h.totalPages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - h.page) <= 2)
                    .map((p) => (
                      <button
                        key={p}
                        onClick={() => h.setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                          ${p === h.page ? "bg-red-500 text-white" : "hover:bg-gray-200 text-gray-600"}`}
                      >
                        {p}
                      </button>
                    ))}
                  <button
                    onClick={() =>
                      h.setPage((p) => Math.min(h.totalPages, p + 1))
                    }
                    disabled={h.page === h.totalPages}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals & Overlays */}
      {h.showModal && (
        <JobModal
          key={h.editJob?.id ?? "new"}
          open={h.showModal}
          editJob={h.editJob}
          saving={h.saving}
          onClose={h.closeModal}
          onSave={h.handleSave}
        />
      )}

      <ConfirmModal
        open={!!h.deleteTarget}
        job={h.deleteTarget}
        deleting={h.deleting}
        onClose={() => h.setDeleteTarget(null)}
        onConfirm={h.handleDelete}
      />

      <JobDetailDrawer
        job={h.previewJob}
        onClose={() => h.setPreviewJob(null)}
      />

      {h.toast && <Toast message={h.toast.message} type={h.toast.type} />}
    </div>
  );
}

export default JobsPage;
