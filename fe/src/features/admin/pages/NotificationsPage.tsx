import { useState, useEffect } from "react";
import { Bell, Check, Clock, Building2, ShieldCheck, AlertCircle, Sparkles, CheckCheck, Trash2, Filter } from "lucide-react";
import { companyApi } from "@/api/api/services/company.api";
import { useNavigate } from "react-router-dom";

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await companyApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Lỗi khi lấy thông báo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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
      await handleMarkAsRead(n.id);
    }

    const metadata = n.metadata || {};
    switch (n.type) {
      case "company_registered":
        navigate("/admin/companies?status=pending");
        break;
      case "company_auto_approved":
        navigate(`/admin/companies`);
        break;
      case "job_analysis_completed":
        navigate("/admin/market-trends");
        break;
      default:
        break;
    }
  };

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.isRead) 
    : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case "company_registered": return <Building2 className="w-5 h-5 text-blue-500" />;
      case "company_auto_approved": return <ShieldCheck className="w-5 h-5 text-green-600" />;
      case "job_analysis_completed": return <Sparkles className="w-5 h-5 text-purple-500" />;
      case "system": return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-7 h-7 text-purple-600" />
            Thông báo hệ thống
          </h1>
          <p className="text-gray-500 mt-1">Quản lý và theo dõi các hoạt động trên hệ thống</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === "all" ? "bg-purple-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === "unread" ? "bg-purple-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Chưa đọc
            </button>
          </div>
          
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 shadow-sm rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            Đọc tất cả
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Đang tải thông báo...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Không có thông báo</h3>
            <p className="text-gray-500 mt-1">Bạn đã cập nhật hết mọi thứ rồi!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-6 transition-all cursor-pointer hover:bg-gray-50 flex gap-5 group relative ${!n.isRead ? "bg-blue-50/20" : ""}`}
              >
                <div className={`mt-1 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110 ${!n.isRead ? "bg-white shadow-md" : "bg-gray-100"}`}>
                  {getIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className={`text-base leading-tight ${!n.isRead ? "font-bold text-gray-900" : "text-gray-600 font-medium"}`}>
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(n.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })}
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(n.id);
                          }}
                          className="p-2 hover:bg-blue-100 rounded-xl text-blue-600 transition-colors"
                          title="Đánh dấu đã đọc"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className={`mt-2 text-sm leading-relaxed ${!n.isRead ? "text-gray-700" : "text-gray-500"}`}>
                    {n.content}
                  </p>
                  
                  <div className="mt-4 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {n.type.replace(/_/g, ' ')}
                    </span>
                    {!n.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
