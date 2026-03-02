import { User, Menu, LogOut } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { studentMenuItems } from "@/config/menu/studentMenuConfig";
import { logout } from "@/store/slices/authSlice";
import type { RootState, AppDispatch } from "@/store";

export const StudentHeader = ({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <header className="relative z-30 flex items-center justify-between border-b border-blue-200/50 bg-white/75 px-6 lg:px-16 py-4 shadow-sm backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-700"
          aria-label="Mở menu"
        >
          <Menu size={22} />
        </button>

        <Link to="/student/dashboard" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-sky-400 text-sm font-black text-white shadow-lg shadow-blue-300/40">
            TDM
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-[15px] font-extrabold text-blue-900">
              TDM Careers
            </p>
            <p className="text-[11px] font-medium text-sky-400">
              Đại học Thủ Dầu Một
            </p>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
        {studentMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-blue-800 hover:text-blue-600 hover:bg-blue-50/60"
              }`
            }
          >
            <item.icon size={16} />
            <span>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="ml-0.5 bg-sky-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-semibold leading-none">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-1.5 shadow-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-sky-400 text-white flex-shrink-0">
            <User size={14} />
          </div>
          <span className="hidden xl:block text-sm font-semibold text-blue-900 max-w-[130px] truncate">
            {user?.email ?? "Sinh viên"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          title="Đăng xuất"
          className="rounded-lg border border-blue-200 bg-white p-2 text-blue-700 transition hover:bg-blue-50 hover:text-blue-900"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
