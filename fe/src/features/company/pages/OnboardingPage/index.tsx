import { useState } from "react";
import { CreateCompanyForm } from "./CreateCompanyForm";
import { JoinCompanyForm } from "./JoinCompanyForm";
import { Building2, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const CompanyOnboardingPage = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"select" | "create" | "join">("select");

  if (mode === "create") {
    return <CreateCompanyForm onBack={() => setMode("select")} />;
  }

  if (mode === "join") {
    return <JoinCompanyForm onBack={() => setMode("select")} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#f0f4f8] p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Chào mừng {user?.name || "bạn"} đến với TDMU Jobs
        </h1>
        <p className="text-gray-500 mb-8">
          Để bắt đầu tuyển dụng, vui lòng thiết lập hồ sơ công ty của bạn.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setMode("join")}
            className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Tham gia công ty
            </h3>
            <p className="text-sm text-gray-500">
              Công ty của bạn đã có trên hệ thống? Hãy tìm kiếm và gửi yêu cầu tham gia.
            </p>
          </button>

          <button
            onClick={() => setMode("create")}
            className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Building2 size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Tạo công ty mới
            </h3>
            <p className="text-sm text-gray-500">
              Đăng ký hồ sơ công ty mới trên hệ thống để bắt đầu đăng tin tuyển dụng.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
