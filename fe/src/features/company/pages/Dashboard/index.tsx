import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Eye,
  TrendingUp,
} from "lucide-react";
import type { RootState } from "@/store";
import { jobService } from "@/features/student/pages/JobsPage/services/jobService";
import { applicationApi } from "@/api/api/services/application.api";
import type { Job } from "@/features/student/pages/JobsPage/types";
import type { Application } from "@/features/student/types";

/* ── helpers ─────────────────────────────────────────────── */
const isExpired = (deadline?: string) =>
  deadline ? new Date(deadline) < new Date() : false;

/* ── Stat card ───────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  sub?: string;
}
function StatCard({ label, value, icon, color, bg, sub }: StatCardProps) {
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${bg}`}>
      <div className={`p-3 rounded-xl ${color} bg-white/60`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Bar ────────────────────────────────────────────────── */
function Bar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-medium">
          {count} <span className="text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export function CompanyDashboard() {
  const { user } = useSelector((s: RootState) => s.auth);
  const email = user?.email ?? "";
  const LS_KEY = `company_name_${user?.id ?? "unknown"}`;
  const savedName = localStorage.getItem(LS_KEY) ?? "";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const [jobRes, appRes] = await Promise.all([
        jobService.getJobs({ page: 1, limit: 1000 }),
        applicationApi
          .getAll({ limit: 1000 })
          .catch(() => ({ data: [], total: 0, page: 1, limit: 1000 })),
      ]);

      const myJobs: Job[] = (jobRes.data ?? []).filter((j: Job) => {
        const c = j.company?.toLowerCase() ?? "";
        return (
          c === email.toLowerCase() ||
          (savedName && c === savedName.toLowerCase())
        );
      });
      setJobs(myJobs);

      const myJobIds = new Set(myJobs.map((j) => j.id));
      const myApps: Application[] = (appRes.data ?? []).filter(
        (a: Application) => myJobIds.has(a.jobId),
      );
      setApps(myApps);
    } finally {
      setLoading(false);
    }
  }, [email, savedName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived stats
  const openJobs = jobs.filter((j) => !isExpired(j.deadline)).length;
  const expiredJobs = jobs.filter((j) => isExpired(j.deadline)).length;
  const pending = apps.filter((a) => a.status === "pending").length;
  const reviewing = apps.filter((a) => a.status === "reviewing").length;
  const accepted = apps.filter((a) => a.status === "accepted").length;
  const rejected = apps.filter((a) => a.status === "rejected").length;

  // Recent 5 jobs sorted by deadline desc
  const recentJobs = [...jobs]
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Tổng quan & Thống kê
            </h1>
            {/* <p className="text-sm text-gray-400 mt-0.5">
              {lastUpdated
                ? `Cập nhật lúc ${lastUpdated.toLocaleTimeString("vi-VN")}`
                : "Đang tải dữ liệu..."}
            </p> */}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
            <Link
              to="/company/jobs"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={15} /> Đăng tin mới
            </Link>
          </div>
        </div>

        {/* Account info */}
        {/* <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm">
          <Building2 size={14} className="text-green-600 flex-shrink-0" />
          <span className="text-green-700">Tài khoản:</span>
          <span className="font-semibold text-green-800">{email}</span>
          {savedName && (
            <span className="text-green-500 ml-1">({savedName})</span>
          )}
        </div> */}

        {/* Stat cards row 1: jobs */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Tin tuyển dụng
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Tổng số tin"
              value={jobs.length}
              icon={<Briefcase size={20} />}
              color="text-blue-600"
              bg="bg-blue-50 border-blue-100"
            />
            <StatCard
              label="Đang tuyển"
              value={openJobs}
              icon={<TrendingUp size={20} />}
              color="text-green-600"
              bg="bg-green-50 border-green-100"
            />
            <StatCard
              label="Đã hết hạn"
              value={expiredJobs}
              icon={<Clock size={20} />}
              color="text-gray-500"
              bg="bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Stat cards row 2: applications */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ứng viên
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Tổng ứng viên"
              value={apps.length}
              icon={<Users size={20} />}
              color="text-purple-600"
              bg="bg-purple-50 border-purple-100"
            />
            <StatCard
              label="Chờ xét duyệt"
              value={pending}
              icon={<AlertCircle size={20} />}
              color="text-yellow-600"
              bg="bg-yellow-50 border-yellow-100"
            />
            <StatCard
              label="Đã chấp nhận"
              value={accepted}
              icon={<CheckCircle2 size={20} />}
              color="text-green-600"
              bg="bg-green-50 border-green-100"
            />
            <StatCard
              label="Từ chối"
              value={rejected}
              icon={<XCircle size={20} />}
              color="text-red-500"
              bg="bg-red-50 border-red-100"
            />
          </div>
        </div>

        {/* Application chart + recent jobs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={17} className="text-gray-500" />
              <h3 className="font-semibold text-gray-800 text-sm">
                Tỷ lệ xử lý hồ sơ
              </h3>
            </div>
            {apps.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Chưa có ứng viên nào
              </p>
            ) : (
              <div className="space-y-3">
                <Bar
                  label="Chờ xét duyệt"
                  count={pending}
                  total={apps.length}
                  color="bg-yellow-400"
                />
                <Bar
                  label="Đang xem xét"
                  count={reviewing}
                  total={apps.length}
                  color="bg-blue-400"
                />
                <Bar
                  label="Đã chấp nhận"
                  count={accepted}
                  total={apps.length}
                  color="bg-green-500"
                />
                <Bar
                  label="Từ chối"
                  count={rejected}
                  total={apps.length}
                  color="bg-red-400"
                />
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                to="/company/applications"
                className="text-xs text-green-600 hover:underline flex items-center gap-1"
              >
                <Eye size={13} /> Xem tất cả hồ sơ
              </Link>
            </div>
          </div>

          {/* Recent jobs */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={17} className="text-gray-500" />
              <h3 className="font-semibold text-gray-800 text-sm">
                Tin tuyển dụng gần đây
              </h3>
            </div>
            {recentJobs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Chưa có tin tuyển dụng
              </p>
            ) : (
              <ul className="space-y-2">
                {recentJobs.map((job) => {
                  const expired = isExpired(job.deadline);
                  return (
                    <li
                      key={job.id}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-gray-700 truncate pr-2 flex-1">
                        {job.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${expired ? "bg-gray-100 text-gray-400" : "bg-green-100 text-green-700"}`}
                      >
                        {expired ? "Hết hạn" : "Đang tuyển"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                to="/company/jobs"
                className="text-xs text-green-600 hover:underline flex items-center gap-1"
              >
                <Eye size={13} /> Quản lý tất cả tin
              </Link>
            </div>
          </div>
        </div>

       
      </div>
    </div>
  );
}
