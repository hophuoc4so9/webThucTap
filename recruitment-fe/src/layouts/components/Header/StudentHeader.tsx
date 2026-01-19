// src/layouts/components/Header/StudentHeader.tsx
import { Bell, Search, User, Menu, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useSidebar } from '../../MainLayout';
import { studentMenuItems } from '@/config/menu/studentMenuConfig';

export const StudentHeader = () => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section: Logo & Toggle */}
          <div className="flex items-center gap-4">
            {/* Toggle Sidebar Button */}
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isCollapsed ? <Menu size={24} /> : <X size={24} />}
            </button>

            {/* Logo */}
            <Link to="/student/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                TD
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-800">TDMU Jobs</span>
                <span className="text-xs text-gray-500">Sinh viên</span>
              </div>
            </Link>
          </div>

          {/* Center Section: Menu (when sidebar is collapsed) */}
          {isCollapsed && (
            <nav className="hidden lg:flex items-center gap-1">
              {studentMenuItems.map((item : any) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span className="text-sm">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Right Section: Search & User Actions */}
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Tìm kiếm công việc..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                <User size={18} />
              </div>
              <span className="hidden lg:block text-sm font-medium text-gray-700">
                Nguyễn Văn A
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Menu (when sidebar is collapsed) */}
        {isCollapsed && (
          <nav className="lg:hidden mt-4 border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              {studentMenuItems.map((item : any) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors relative ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span className="text-sm">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};