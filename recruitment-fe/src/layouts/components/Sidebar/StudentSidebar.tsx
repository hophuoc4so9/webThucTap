// src/layouts/components/Sidebar/StudentSidebar.tsx
import { NavLink } from 'react-router-dom';
import { studentMenuItems } from '@/config/menu/studentMenuConfig';
export const StudentSidebar = () => {
  return (
    <div className="p-4">
      {/* Sidebar Header */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">
          Menu
        </h2>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1">
        {studentMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
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
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Cần hỗ trợ?</h3>
        <p className="text-sm text-blue-700 mb-3">
          Liên hệ với chúng tôi để được giúp đỡ
        </p>
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          Liên hệ hỗ trợ
        </button>
      </div>
    </div>
  );
};