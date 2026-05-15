import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Tổng quan", path: "/admin/dashboard" },
  { icon: Users, label: "Quản lý sinh viên", path: "/admin/students" },
  { icon: Building2, label: "Quản lý công ty", path: "/admin/companies" },
  { icon: Briefcase, label: "Quản lý tin tuyển dụng", path: "/admin/jobs" },
  { 
    icon: TrendingUp, 
    label: "Phân tích AI & Xu hướng", 
    path: "/admin/market-trends", // dummy path for parent key mapping if needed, but we'll use children
    children: [
      { icon: TrendingUp, label: "Xu hướng thị trường", path: "/admin/market-trends" },
      { icon: BookOpen, label: "Quản lý Từ điển", path: "/admin/skills/manager" },
    ]
  },
  // { icon: FileText, label: 'Quản lý thực tập', path: '/admin/internships' },
  // { icon: BarChart3, label: 'Báo cáo & Thống kê', path: '/admin/reports' },
  // { icon: Bell, label: 'Thông báo', path: '/admin/notifications' },
  // { icon: Shield, label: 'Phân quyền', path: '/admin/permissions' },
  // { icon: Settings, label: 'Cài đặt hệ thống', path: '/admin/settings' },
];

export const AdminSidebar = () => {
  const location = useLocation();
  
  // Check if any child route is active to keep the menu open initially
  const isMarketOrSkillsActive = location.pathname.includes('/admin/market-trends') || location.pathname.includes('/admin/skills');
  const [openGroup, setOpenGroup] = useState<string | null>(isMarketOrSkillsActive ? "Phân tích AI & Xu hướng" : null);

  const toggleGroup = (label: string) => {
    setOpenGroup(openGroup === label ? null : label);
  };

  return (
    <nav className="py-6 px-4">
      <ul className="space-y-2">
        {menuItems.map((item) => (
          <li key={item.label}>
            {item.children ? (
              <div className="flex flex-col">
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                    openGroup === item.label
                      ? "bg-purple-50 text-purple-600 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {openGroup === item.label ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openGroup === item.label && (
                  <ul className="mt-2 ml-4 space-y-1 border-l-2 border-purple-100 pl-2">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <NavLink
                          to={child.path}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                              isActive
                                ? "bg-purple-100/50 text-purple-700 font-medium"
                                : "text-gray-600 hover:bg-gray-100"
                            }`
                          }
                        >
                          <child.icon className="w-4 h-4 opacity-70" />
                          <span className="text-sm">{child.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <NavLink
                to={item.path!}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-purple-50 text-purple-600 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};
