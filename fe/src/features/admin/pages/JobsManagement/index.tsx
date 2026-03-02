import { RefreshCw } from "lucide-react";
import { useJobsManagement } from "./hooks/useJobsManagement";
import { StatsRow } from "./components/StatsRow";
import { SearchBar } from "./components/SearchBar";
import { JobsTable } from "./components/JobsTable";
import { Pagination } from "./components/Pagination";
import { JobDetailDrawer } from "./components/JobDetailDrawer";
import { ConfirmModal } from "./components/ConfirmModal";
import { Toast } from "./components/Toast";

export const JobsManagement = () => {
  const {
    jobs,
    total,
    page,
    loading,
    keyword,
    setKeyword,
    location,
    setLocation,
    industry,
    handleIndustryChange,
    previewJob,
    setPreviewJob,
    deleteTarget,
    setDeleteTarget,
    deleting,
    toast,
    totalPages,
    activeCount,
    expiredCount,
    hasFilter,
    fetchJobs,
    applySearch,
    clearFilter,
    goPage,
    handleDelete,
    clearKeyword,
    clearLocation,
    clearIndustry,
  } = useJobsManagement();

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quản lý Việc làm</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Toàn bộ tin tuyển dụng trên hệ thống
          </p>
        </div>
        <button
          onClick={() => fetchJobs(keyword, location, industry, page)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      <StatsRow
        total={total}
        activeCount={activeCount}
        expiredCount={expiredCount}
       
      />

      <SearchBar
        keyword={keyword}
        location={location}
        industry={industry}
        hasFilter={hasFilter}
        onKeywordChange={setKeyword}
        onLocationChange={setLocation}
        onIndustryChange={handleIndustryChange}
        onSearch={applySearch}
        onClear={clearFilter}
        onClearKeyword={clearKeyword}
        onClearLocation={clearLocation}
        onClearIndustry={clearIndustry}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <JobsTable
          jobs={jobs}
          page={page}
          loading={loading}
          onPreview={setPreviewJob}
          onDelete={setDeleteTarget}
        />
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        loading={loading}
        goPage={goPage}
      />

      <JobDetailDrawer job={previewJob} onClose={() => setPreviewJob(null)} />

      <ConfirmModal
        open={!!deleteTarget}
        job={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
};

export default JobsManagement;
