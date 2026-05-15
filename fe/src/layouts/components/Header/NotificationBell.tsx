import { useState, useEffect, useRef } from "react";
import { Bell, Check, Clock, Building2, ShieldCheck, AlertCircle, Sparkles, CheckCheck } from "lucide-react";
import { companyApi } from "@/api/api/services/company.api";
import { useNavigate } from "react-router-dom";

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await companyApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Lỗi khi lấy thông báo:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await companyApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Lỗi khi đánh dấu đã đọc:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await companyApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Lỗi khi đánh dấu tất cả đã đọc:", err);
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      try {
        await companyApi.markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        );
      } catch (err) {
        console.error("Lỗi khi đánh dấu đã đọc:", err);
      }
    }

    setIsOpen(false);

    // Navigation logic based on notification type/metadata
    const metadata = n.metadata || {};
    switch (n.type) {
      case "company_registered":
        navigate("/admin/companies?status=pending");
        break;
      case "company_auto_approved":
        navigate(`/admin/companies`); // or a detail page if exists
        break;
      case "job_analysis_completed":
        navigate("/admin/market-trends");
        break;
      default:
        // Default navigation or just stay
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "company_registered": return <Building2 className="w-4 h-4 text-blue-500" />;
      case "company_auto_approved": return <ShieldCheck className="w-4 h-4 text-green-600" />;
      case "job_analysis_completed": return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "system": return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationStyle = (n: any) => {
    if (!n.isRead) {
      if (n.type === "company_auto_approved") return "bg-green-50/50 border-l-4 border-l-green-500";
      if (n.type === "job_analysis_completed") return "bg-purple-50/50 border-l-4 border-l-purple-500";
      return "bg-blue-50/30 border-l-4 border-l-blue-500";
    }
    return "";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-blue-600 font-bold flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[450px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 opacity-20" />
                </div>
                <p className="text-xs font-medium">Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all relative group ${getNotificationStyle(n)}`}
                >
                  <div className="flex gap-4">
                    <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${!n.isRead ? "bg-white shadow-md" : "bg-gray-100"}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-[13px] leading-snug ${!n.isRead ? "font-bold text-gray-900" : "text-gray-600 font-medium"}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(e, n.id)}
                            className="p-1 hover:bg-blue-100 rounded-full text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Đánh dấu đã đọc"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {n.content}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-gray-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(n.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </div>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 text-center border-t border-gray-50 bg-gray-50/30">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate("/admin/notifications");
              }}
              className="text-[11px] text-gray-600 font-bold hover:text-purple-600 transition-colors py-1 px-4 rounded-full hover:bg-white hover:shadow-sm"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
