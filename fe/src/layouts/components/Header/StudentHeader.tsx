import { useEffect, useRef, useState } from "react";
import { Menu, LogOut, ChevronDown, ShieldCheck, LayoutDashboard, UserCircle2 } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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

      {/* User + dropdown */}
      <div className="relative flex items-center gap-2" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-1.5 shadow-sm hover:bg-blue-50 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-sky-400 text-white flex-shrink-0 text-xs font-bold uppercase">
            {(user?.name || user?.email || "S").slice(0, 1)}
          </div>
          <div className="hidden xl:block text-left max-w-[150px]">
            <p className="text-sm font-semibold text-blue-900 truncate">
              {user?.name || user?.email || "Sinh viên"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user?.recruiterStatus === "approved" || user?.role === "COMPANY" ? "Nhà tuyển dụng" : "Sinh viên"}</p>
          </div>
          <ChevronDown size={14} className="text-blue-700" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-sky-50">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || "Sinh viên"}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); navigate("/student/profile"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left"
              >
                <UserCircle2 size={16} className="text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Hồ sơ của tôi</p>
                  <p className="text-xs text-gray-500">Cập nhật thông tin cá nhân</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); navigate("/student/recruiter"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left"
              >
                <ShieldCheck size={16} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Bạn là nhà tuyển dụng?</p>
                  <p className="text-xs text-gray-500">Đăng ký và xác minh tài khoản</p>
                </div>
              </button>
              {user?.recruiterStatus === "approved" || user?.role === "COMPANY" ? (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate("/company/dashboard"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left"
                >
                  <LayoutDashboard size={16} className="text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Trang nhà tuyển dụng</p>
                    <p className="text-xs text-gray-500">Đi tới dashboard công ty</p>
                  </div>
                </button>
              ) : null}
            </div>
          </div>
        )}

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
