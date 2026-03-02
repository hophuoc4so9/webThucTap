import { useEffect, useState } from "react";
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { userApi } from "@/api/api/services/user.api";
import { jobService } from "@/features/student/pages/JobsPage/services/jobService";
import { applicationApi } from "@/api/api/services/application.api";

interface Stats {
  totalUsers: number;
  students: number;
  companies: number;
  totalJobs: number;
  totalApplications: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">
          {value === -1
            ? "—"
            : typeof value === "number"
              ? value.toLocaleString()
              : value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: -1,
    students: -1,
    companies: -1,
    totalJobs: -1,
    totalApplications: -1,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [userStats, jobsRes, appsRes] = await Promise.allSettled([
        userApi.getStats(),
        jobService.getJobs({ page: 1, limit: 1 }),
        applicationApi.getAll({ limit: 1 }),
      ]);
      setStats({
        totalUsers:
          userStats.status === "fulfilled" ? userStats.value.total : -1,
        students:
          userStats.status === "fulfilled" ? userStats.value.students : -1,
        companies:
          userStats.status === "fulfilled" ? userStats.value.companies : -1,
        totalJobs:
          jobsRes.status === "fulfilled"
            ? ((jobsRes.value as any).total ?? -1)
            : -1,
        totalApplications:
          appsRes.status === "fulfilled"
            ? ((appsRes.value as any).total ?? -1)
            : -1,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const quickLinks = [
    {
      path: "/admin/students",
      icon: Users,
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      label: "Quản lý sinh viên",
      sub: `${stats.students >= 0 ? stats.students : "—"} tài khoản`,
    },
    {
      path: "/admin/companies",
      icon: Building2,
      bg: "bg-green-50 border-green-200",
      text: "text-green-700",
      label: "Quản lý doanh nghiệp",
      sub: `${stats.companies >= 0 ? stats.companies : "—"} tài khoản`,
    },
    {
      path: "/admin/jobs",
      icon: Briefcase,
      bg: "bg-orange-50 border-orange-200",
      text: "text-orange-700",
      label: "Quản lý việc làm",
      sub: `${stats.totalJobs >= 0 ? stats.totalJobs : "—"} tin`,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Tổng quan hệ thống
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Thống kê chung toàn bộ hệ thống
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm
          mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Tổng người dùng"
          value={stats.totalUsers}
          color="bg-purple-500"
        />
        <StatCard
          icon={Users}
          label="Sinh viên"
          value={stats.students}
          color="bg-blue-500"
          sub={
            stats.totalUsers > 0
              ? `${Math.round((stats.students / stats.totalUsers) * 100)}% tổng users`
              : undefined
          }
        />
        <StatCard
          icon={Building2}
          label="Doanh nghiệp"
          value={stats.companies}
          color="bg-green-500"
        />
        <StatCard
          icon={Briefcase}
          label="Tin tuyển dụng"
          value={stats.totalJobs}
          color="bg-orange-500"
        />
        <StatCard
          icon={FileText}
          label="Đơn ứng tuyển"
          value={stats.totalApplications}
          color="bg-red-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Đơn / tin tb"
          value={
            stats.totalJobs > 0 && stats.totalApplications > 0
              ? `${(stats.totalApplications / stats.totalJobs).toFixed(1)}x`
              : "—"
          }
          color="bg-indigo-500"
          sub="Tỷ lệ ứng tuyển"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-3 p-4 rounded-2xl border ${item.bg} hover:shadow-sm transition-shadow text-left w-full`}
          >
            <item.icon size={20} className={item.text} />
            <div>
              <p className={`font-semibold text-sm ${item.text}`}>
                {item.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
