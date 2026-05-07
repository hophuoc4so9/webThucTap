import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const menuItems = [
  { icon: LayoutDashboard, label: "Tổng quan", path: "/admin/dashboard" },
  { icon: Users, label: "Quản lý sinh viên", path: "/admin/students" },
  { icon: Building2, label: "Quản lý công ty", path: "/admin/companies" },
  { icon: Briefcase, label: "Quản lý tin tuyển dụng", path: "/admin/jobs" },
  { icon: TrendingUp, label: "Xu hướng thị trường", path: "/admin/market-trends" },

  // { icon: FileText, label: 'Quản lý thực tập', path: '/admin/internships' },
  // { icon: BarChart3, label: 'Báo cáo & Thống kê', path: '/admin/reports' },
  // { icon: Bell, label: 'Thông báo', path: '/admin/notifications' },
  // { icon: Shield, label: 'Phân quyền', path: '/admin/permissions' },
  // { icon: Settings, label: 'Cài đặt hệ thống', path: '/admin/settings' },
];

export const AdminSidebar = () => {
  return (
    <nav className="py-6 px-4">
      <ul className="space-y-2">
        {menuItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? "bg-purple-50 text-purple-600 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
