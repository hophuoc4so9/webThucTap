import { LayoutDashboard, Briefcase, FileText, Settings, FolderOpen, Building2 } from "lucide-react";
import { NavLink } from "react-router-dom";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Tổng quan & Thống kê",
    path: "/company/dashboard",
  },
  { icon: Briefcase, label: "Quản lý tin tuyển dụng", path: "/company/jobs" },
  { icon: FolderOpen, label: "Đặt hàng dự án", path: "/company/projects" },
  { icon: FileText, label: "Ứng viên & Hồ sơ", path: "/company/applications" },
  { icon: Settings, label: "Cài đặt công ty", path: "/company/settings" },

];

export const CompanySidebar = () => {
  return (
    <nav className="py-6 px-4">
      <ul className="space-y-2">
        {menuItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? "bg-green-50 text-green-600 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>


    </nav>
  );
};
