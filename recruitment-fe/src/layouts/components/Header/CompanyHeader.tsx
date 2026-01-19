import { Bell, Plus, User, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CompanyHeader = () => {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <Link to="/company/dashboard" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-gray-900">TDMU Jobs</h1>
          <p className="text-xs text-gray-500">Nhà tuyển dụng</p>
        </div>
      </Link>

      {/* Quick Actions */}
      <div className="flex items-center gap-4">
        <Link
          to="/company/jobs/create"
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Đăng tin tuyển dụng</span>
        </Link>

        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded-lg">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Công ty ABC</p>
            <p className="text-xs text-gray-500">admin@company.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};
