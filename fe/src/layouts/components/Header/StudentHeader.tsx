import { useEffect, useRef, useState } from "react";
import { Menu, LogOut, ChevronDown, ShieldCheck, LayoutDashboard, UserCircle2, Bell, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { studentMenuItems } from "@/config/menu/studentMenuConfig";
import { logout } from "@/store/slices/authSlice";
import type { RootState, AppDispatch } from "@/store";
import { cvApi } from "@/api/api/services/cv.api";
import { formatRelativeTime } from "@/utils/date";

export const StudentHeader = ({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const userId = user ? Number(user.id) : 0;

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const data = await cvApi.getNotifications(userId);
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Poll every 30 seconds for simple "real-time" feel without WebSockets
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const handleMarkRead = async (id: number) => {
    try {
      await cvApi.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Thông báo</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {unreadCount} mới
                </span>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 px-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <Bell size={20} className="text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">Bạn chưa có thông báo nào</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 transition-colors hover:bg-slate-50 relative group ${!n.isRead ? "bg-blue-50/30" : ""} cursor-pointer`}
                        onClick={() => {
                          if (n.metadata?.cvId) {
                            setNotifOpen(false);
                            navigate("/student/cv", { state: { viewAnalysisForCvId: n.metadata.cvId } });
                          }
                          handleMarkRead(n.id);
                        }}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.type?.includes("completed") ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                            {n.type?.includes("completed") ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-tight mb-1 ${!n.isRead ? "font-bold text-slate-900" : "text-slate-700"}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">{n.message}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </div>
                          {!n.isRead && (
                            <Circle size={8} className="fill-blue-600 text-blue-600 mt-1.5 shrink-0" />
                          )}
                        </div>
                        {n.metadata?.cvId && (
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotifOpen(false);
                                navigate("/student/cv", { state: { viewAnalysisForCvId: n.metadata.cvId } });
                                handleMarkRead(n.id);
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 px-3 py-1 rounded-lg border border-blue-100 bg-white shadow-sm transition-all"
                            >
                              Xem kết quả ngay
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => { setNotifOpen(false); /* navigate to all notifications page if exists */ }}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Xem tất cả thông báo
                </button>
              </div>
            </div>
          )}
        </div>

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
      </div>
    </header>
  );
};
