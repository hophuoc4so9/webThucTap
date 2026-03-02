import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { jobService } from "@/features/student/pages/JobsPage/services/jobService";
import type { Job } from "@/features/student/pages/JobsPage/types";
import type { JobFormData } from "../types";
import { PAGE_SIZE } from "../constants";

export function useCompanyJobs() {
  const { user } = useSelector((s: RootState) => s.auth);
  const email = user?.email ?? "";
  // Tên công ty cũ lưu ở localStorage (để khớp với data cũ)
  const LS_KEY = `company_name_${user?.id ?? "unknown"}`;
  const savedName = localStorage.getItem(LS_KEY) ?? "";

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);

  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchJobs = useCallback(async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await jobService.getJobs({ page: 1, limit: 1000 });
      const filtered = (res.data ?? []).filter((j: Job) => {
        const c = j.company?.toLowerCase() ?? "";
        return (
          c === email.toLowerCase() ||
          (savedName && c === savedName.toLowerCase())
        );
      });
      setAllJobs(filtered);
      setTotal(filtered.length);
      setPage(1);
    } catch {
      showToast("Không thể tải danh sách tin tuyển dụng.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, savedName]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSave = async (d: JobFormData) => {
    setSaving(true);
    try {
      const dto = {
        ...d,
        company: email, // gán email tài khoản vào trường company (data mới)
        vacancies: d.vacancies ? Number(d.vacancies) : undefined,
      };
      if (editJob) {
        await jobService.updateJob(editJob.id, dto);
        showToast("Cập nhật tin tuyển dụng thành công!");
      } else {
        await jobService.createJob(dto);
        showToast("Đăng tin tuyển dụng thành công!");
      }
      setShowModal(false);
      setEditJob(null);
      await fetchJobs();
    } catch {
      showToast(editJob ? "Cập nhật thất bại." : "Đăng tin thất bại.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobService.deleteJob(deleteTarget.id);
      showToast("Đã xoá tin tuyển dụng.");
      setDeleteTarget(null);
      const remaining = allJobs.filter((j) => j.id !== deleteTarget.id);
      setAllJobs(remaining);
      setTotal(remaining.length);
      const maxPage = Math.max(1, Math.ceil(remaining.length / PAGE_SIZE));
      if (page > maxPage) setPage(maxPage);
    } catch {
      showToast("Xoá thất bại.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setEditJob(null);
    setShowModal(true);
  };
  const openEdit = (job: Job) => {
    setEditJob(job);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditJob(null);
  };

  const pagedJobs = allJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const openCount = allJobs.filter(
    (j) => new Date(j.deadline ?? "") >= new Date(),
  ).length;
  const expiredCount = total - openCount;

  return {
    companyName: email, // hiển thị email trên UI
    pagedJobs,
    total,
    page,
    setPage,
    loading,
    totalPages,
    showModal,
    editJob,
    saving,
    openCreate,
    openEdit,
    closeModal,
    handleSave,
    previewJob,
    setPreviewJob,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    toast,
    openCount,
    expiredCount,
    refresh: fetchJobs,
  };
}
