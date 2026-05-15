// src/layouts/components/Sidebar/StudentSidebar.tsx
import { NavLink } from "react-router-dom";
import { studentMenuItems } from "@/config/menu/studentMenuConfig";

interface Props {
  onNavigate?: () => void;
}

export const StudentSidebar = ({ onNavigate }: Props) => {
  return (
    <div className="p-4">
      {/* Sidebar Header */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
          Menu
        </h2>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1">
        {studentMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                isActive
                  ? "bg-red-50 text-red-600 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="mt-8 p-4 bg-red-50 rounded-lg">
        <h3 className="font-semibold text-red-900 mb-2">Cần hỗ trợ?</h3>
        <p className="text-sm text-red-700 mb-3">
          Liên hệ với chúng tôi để được giúp đỡ
        </p>
        <button className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
          Liên hệ hỗ trợ
        </button>
      </div>
    </div>
  );
};
