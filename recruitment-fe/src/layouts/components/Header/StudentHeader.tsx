import { Bell, Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentHeader = () => {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      {/* Logo */}
      <Link to="/student/dashboard" className="flex items-center gap-2">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">TD</span>
        </div>
        <div>
          <h1 className="font-bold text-lg text-gray-900">TDMU Jobs</h1>
          <p className="text-xs text-gray-500">Sinh viên</p>
        </div>
      </Link>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm công việc, công ty..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded-lg">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-sm font-medium">Nguyễn Văn A</span>
        </div>
      </div>
    </div>
  );
};
