import { useState, useEffect, useRef } from "react";
import { Bell, Check, Clock, Building2, ShieldCheck, AlertCircle } from "lucide-react";
import { companyApi } from "@/api/api/services/company.api";

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    // Polling mỗi 30s hoặc dùng socket nếu có
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

  const handleMarkAsRead = async (id: number) => {
    try {
      await companyApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Lỗi khi đánh dấu đã đọc:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "company_registered": return <Building2 className="w-4 h-4 text-blue-500" />;
      case "company_auto_approved": return <ShieldCheck className="w-4 h-4 text-green-600" />;
      case "system": return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationStyle = (n: any) => {
    if (!n.isRead) {
      if (n.type === "company_auto_approved") return "bg-green-50/50 border-l-4 border-l-green-500";
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
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} mới
              </span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs italic">Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id)}
                  className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors relative ${getNotificationStyle(n)}`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? "bg-white shadow-sm" : "bg-gray-100"}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.isRead ? "font-bold text-gray-900" : "text-gray-700 font-medium"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {n.content}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400">
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
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 text-center border-t border-gray-50">
              <button className="text-[11px] text-purple-600 font-bold hover:underline">
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
