import { useState, useEffect } from "react";
import { CreateCompanyForm } from "./CreateCompanyForm";
import { JoinCompanyForm } from "./JoinCompanyForm";
import { Building2, Search, Clock, AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDispatch } from "react-redux";
import { logout, setCredentials } from "@/store/slices/authSlice";
import { companyApi } from "@/api/api/services/company.api";
import { useNavigate } from "react-router-dom";

export const CompanyOnboardingPage = () => {
  const { user, token } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const status = await companyApi.getOnboardingStatus(Number(user.id));
      setOnboardingStatus(status);
    } catch (err) {
      console.error("Lỗi khi lấy trạng thái onboarding:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user?.id]);

  useEffect(() => {
    const checkApproved = async () => {
      if (onboardingStatus?.status === "approved" && user && token) {
        try {
          const company = await companyApi.getMemberCompany(Number(user.id));
          if (company) {
            dispatch(
              setCredentials({
                user: { ...user, companyId: company.id },
                token,
              }),
            );
            setTimeout(() => {
              window.location.href = "/company/dashboard";
            }, 500);
          }
        } catch (err) {
          console.error("Lỗi khi lấy thông tin công ty sau duyệt:", err);
        }
      }
    };
    checkApproved();
  }, [onboardingStatus, user, token, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f4f8]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-500 font-medium">Đang tải trạng thái...</p>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return <CreateCompanyForm onBack={() => setMode("select")} />;
  }

  if (mode === "join") {
    return <JoinCompanyForm onBack={() => setMode("select")} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f0f4f8]">
      {/* Header with Logout */}
      <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold">
            TD
          </div>
          <span className="font-bold text-gray-800">TDMU Jobs</span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium text-sm border border-transparent hover:border-red-100"
        >
          <LogOut size={18} /> Đăng xuất
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-4">
        {/* Nếu đang chờ duyệt */}
        {onboardingStatus?.status === "pending" ? (
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Đang chờ xác thực</h2>
            <p className="text-gray-600 mb-8">
              Yêu cầu {onboardingStatus.type === "create" ? "tạo công ty" : "tham gia công ty"} 
              <span className="font-bold"> {onboardingStatus.company?.name} </span> 
              đã được gửi. Vui lòng chờ {onboardingStatus.type === "create" ? "Admin" : "Công ty"} duyệt.
            </p>
            <button 
              onClick={fetchStatus}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-shadow shadow-lg hover:shadow-blue-200"
            >
              <RefreshCw size={18} /> Cập nhật trạng thái
            </button>
          </div>
        ) : onboardingStatus?.status === "rejected" ? (
          /* Nếu bị từ chối */
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border-t-4 border-red-500 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Yêu cầu bị từ chối</h2>
            <div className="bg-red-50 p-4 rounded-lg mb-6 text-left">
              <p className="text-sm text-red-800 font-semibold mb-1">Lý do từ chối:</p>
              <p className="text-sm text-red-600">{onboardingStatus.reason || "Không có lý do cụ thể."}</p>
            </div>
            <p className="text-gray-600 mb-8 text-sm">
              Bạn có thể thử gửi yêu cầu khác hoặc liên hệ bộ phận hỗ trợ.
            </p>
            <button 
              onClick={() => setOnboardingStatus(null)}
              className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
            >
              Gửi yêu cầu mới
            </button>
          </div>
        ) : (
          /* Màn hình lựa chọn ban đầu */
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Chào mừng {user?.name || "bạn"} đến với TDMU Jobs
            </h1>
            <p className="text-gray-500 mb-8">
              Để bắt đầu tuyển dụng, vui lòng thiết lập hồ sơ công ty của bạn.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setMode("join")}
                className="flex flex-col items-center justify-center p-8 border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all group relative overflow-hidden"
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 transform group-hover:rotate-6">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Tham gia công ty
                </h3>
                <p className="text-sm text-gray-500">
                  Công ty của bạn đã có trên hệ thống? Hãy tìm kiếm và gửi yêu cầu tham gia.
                </p>
              </button>

              <button
                onClick={() => setMode("create")}
                className="flex flex-col items-center justify-center p-8 border-2 border-gray-100 rounded-2xl hover:border-green-500 hover:bg-green-50/50 transition-all group relative overflow-hidden"
              >
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-all duration-300 transform group-hover:-rotate-6">
                  <Building2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Tạo công ty mới
                </h3>
                <p className="text-sm text-gray-500">
                  Đăng ký hồ sơ công ty mới trên hệ thống để bắt đầu đăng tin tuyển dụng.
                </p>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
