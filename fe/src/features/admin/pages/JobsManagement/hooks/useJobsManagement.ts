import { useState, useCallback, useEffect } from "react";
import { jobService } from "@/features/student/pages/JobsPage/services/jobService";
import type { Job } from "@/features/student/pages/JobsPage/types";
import { PAGE_SIZE } from "../constants";
import { isExpired } from "../utils";

export function useJobsManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");

  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCount = jobs.filter((j) => !isExpired(j.deadline)).length;
  const expiredCount = jobs.filter((j) => isExpired(j.deadline)).length;
  const hasFilter = !!(keyword || location || industry);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchJobs = useCallback(
    async (kw: string, loc: string, ind: string, pg: number) => {
      setLoading(true);
      try {
        const res = await jobService.getJobs({
          keyword: kw,
          location: loc,
          industry: ind,
          page: pg,
          limit: PAGE_SIZE,
        });
        setJobs(res.data);
        setTotal(res.total);
      } catch {
        showToast("Không thể tải dữ liệu", "error");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchJobs("", "", "", 1);
  }, []); // eslint-disable-line

  const applySearch = () => {
    setPage(1);
    fetchJobs(keyword, location, industry, 1);
  };

  const clearFilter = () => {
    setKeyword("");
    setLocation("");
    setIndustry("");
    setPage(1);
    fetchJobs("", "", "", 1);
  };

  const handleIndustryChange = (v: string) => {
    setIndustry(v);
    setPage(1);
    fetchJobs(keyword, location, v, 1);
  };

  const goPage = (p: number) => {
    setPage(p);
    fetchJobs(keyword, location, industry, p);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobService.deleteJob(deleteTarget.id);
      showToast(`Đã xoá "${deleteTarget.title}"`);
      setDeleteTarget(null);
      const newTotal = total - 1;
      const maxPage = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      const targetPage = page > maxPage ? maxPage : page;
      setPage(targetPage);
      fetchJobs(keyword, location, industry, targetPage);
    } catch {
      showToast("Xoá thất bại, thử lại sau", "error");
    } finally {
      setDeleting(false);
    }
  };

  const clearKeyword = () => {
    setKeyword("");
    fetchJobs("", location, industry, 1);
  };
  const clearLocation = () => {
    setLocation("");
    fetchJobs(keyword, "", industry, 1);
  };
  const clearIndustry = () => {
    setIndustry("");
    fetchJobs(keyword, location, "", 1);
  };

  return {
    // state
    jobs,
    total,
    page,
    loading,
    keyword,
    setKeyword,
    location,
    setLocation,
    industry,
    previewJob,
    setPreviewJob,
    deleteTarget,
    setDeleteTarget,
    deleting,
    toast,
    // derived
    totalPages,
    activeCount,
    expiredCount,
    hasFilter,
    // handlers
    fetchJobs,
    applySearch,
    clearFilter,
    handleIndustryChange,
    goPage,
    handleDelete,
    clearKeyword,
    clearLocation,
    clearIndustry,
  };
}
