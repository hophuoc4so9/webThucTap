
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Briefcase, 
  FileText, 
  BarChart3, 
  Settings,
  Shield,
  Bell
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/admin/dashboard' },
  { icon: Users, label: 'Quản lý sinh viên', path: '/admin/students' },
  { icon: Building2, label: 'Quản lý doanh nghiệp', path: '/admin/companies' },
  { icon: Briefcase, label: 'Quản lý tin tuyển dụng', path: '/admin/jobs' },
  { icon: FileText, label: 'Quản lý thực tập', path: '/admin/internships' },
  { icon: BarChart3, label: 'Báo cáo & Thống kê', path: '/admin/reports' },
  { icon: Bell, label: 'Thông báo', path: '/admin/notifications' },
  { icon: Shield, label: 'Phân quyền', path: '/admin/permissions' },
  { icon: Settings, label: 'Cài đặt hệ thống', path: '/admin/settings' },
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
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Quick Stats */}
      <div className="mt-6 mx-4 p-4 bg-purple-50 rounded-lg">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">
          Thống kê nhanh
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sinh viên:</span>
            <span className="font-semibold text-purple-600">1,234</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Doanh nghiệp:</span>
            <span className="font-semibold text-purple-600">89</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tin tuyển dụng:</span>
            <span className="font-semibold text-purple-600">156</span>
          </div>
        </div>
      </div>
    </nav>
  );
};