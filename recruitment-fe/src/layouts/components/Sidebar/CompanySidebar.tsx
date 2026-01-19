
import { LayoutDashboard, Briefcase, Users, FileText, BarChart3, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/company/dashboard' },
  { icon: Briefcase, label: 'Quản lý tin tuyển dụng', path: '/company/jobs' },
  { icon: Users, label: 'Ứng viên', path: '/company/candidates' },
  { icon: FileText, label: 'Hồ sơ ứng tuyển', path: '/company/applications' },
  { icon: BarChart3, label: 'Thống kê', path: '/company/analytics' },
  { icon: Settings, label: 'Cài đặt công ty', path: '/company/settings' },
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
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Company Stats Card */}
      <div className="mt-6 mx-4 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">
          Hiệu suất tuyển dụng
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tin đang tuyển:</span>
            <span className="font-semibold text-green-600">5</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ứng viên mới:</span>
            <span className="font-semibold text-green-600">23</span>
          </div>
        </div>
      </div>
    </nav>
  );
};