import React from "react";
import { Link } from "react-router-dom";
import { Footer } from "@/layouts/components/Footer/Footer";
import { GraduationCap, Building2 } from "lucide-react";

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#f8fafc]">
      <header className="bg-white shadow-sm px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold">
            TD
          </div>
          <span className="font-bold text-gray-800">TDMU Jobs</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-blue-700 tracking-wide mb-3">
            Đăng ký tài khoản
          </h2>
          <p className="text-gray-500">
            Chọn vai trò của bạn để tiếp tục
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Card Sinh viên */}
          <Link
            to="/register/student"
            className="group relative bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
              <GraduationCap className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Sinh viên</h3>
            <p className="text-gray-500 text-sm">
              Tìm kiếm việc làm, thực tập, tạo CV và ứng tuyển vào các công ty hàng đầu.
            </p>
          </Link>

          {/* Card Nhà tuyển dụng */}
          <Link
            to="/register/recruiter"
            className="group relative bg-white border-2 border-transparent hover:border-green-500 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors duration-300">
              <Building2 className="w-10 h-10 text-green-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Nhà tuyển dụng</h3>
            <p className="text-gray-500 text-sm">
              Đăng tin tuyển dụng, tìm kiếm ứng viên tài năng và quản lý hồ sơ ứng tuyển.
            </p>
          </Link>
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-600">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RegisterPage;
export { RegisterPage };
