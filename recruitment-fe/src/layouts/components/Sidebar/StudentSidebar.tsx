
import { Home, FileText, Briefcase, BookOpen, MessageSquare, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { icon: Home, label: 'Trang chủ', path: '/student/dashboard' },
  { icon: Briefcase, label: 'Tìm việc', path: '/student/jobs' },
  { icon: FileText, label: 'Hồ sơ của tôi', path: '/student/cv' },
  { icon: BookOpen, label: 'Đã ứng tuyển', path: '/student/applications' },
  { icon: MessageSquare, label: 'Tin nhắn', path: '/student/messages' },
  { icon: Settings, label: 'Cài đặt', path: '/student/settings' },
];

export const StudentSidebar = () => {
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
                    ? 'bg-blue-50 text-blue-600 font-medium'
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
    </nav>
  );
};