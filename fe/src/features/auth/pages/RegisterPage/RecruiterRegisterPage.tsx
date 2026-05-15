import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SampleInput from "@/components/common/Input/SampleInput";
import SampleButton from "@/components/common/Button/SampleButton";
import { Footer } from "@/layouts/components/Footer/Footer";
import { registerRecruiterApi } from "@/api/api/services/auth.api";
import { ArrowLeft } from "lucide-react";

const RecruiterRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !name || !position || !location) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await registerRecruiterApi({
        email,
        password,
        name,
        role: "company",
        position,
        location,
      });
      navigate("/login", { state: { message: "Đăng ký thành công! Vui lòng đăng nhập." } });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#f0f4f8]">
      <header className="bg-white shadow-sm px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center text-white font-bold">
            TD
          </div>
          <span className="font-bold text-gray-800">TDMU Jobs</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Background */}
        <div className="hidden lg:block flex-1 bg-gradient-to-br from-green-600 to-green-800 relative">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-12 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Tuyển dụng nhân tài
            </h2>
            <p className="text-lg text-green-100 max-w-lg">
              Tiếp cận nguồn sinh viên chất lượng cao từ Đại học Thủ Dầu Một. Quản lý tuyển dụng hiệu quả và nhanh chóng.
            </p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex-1 flex items-stretch bg-[#f0f4f8]">
          <div className="w-full h-full flex flex-col justify-center bg-[#f8fafc] p-8 lg:p-16 relative">
            <Link to="/register" className="absolute top-8 right-8 text-gray-500 hover:text-green-600 flex items-center gap-1 transition-colors">
              <ArrowLeft size={16} /> Quay lại
            </Link>

            <form onSubmit={handleRegister} className="max-w-md w-full mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-green-700 tracking-wide">
                  Đăng ký Nhà tuyển dụng
                </h2>
                <p className="text-gray-500 mt-2">Đăng ký tài khoản HR cá nhân của bạn</p>
              </div>

              <div className="space-y-4">
                <SampleInput
                  label="Họ và tên"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ và tên HR"
                />
                <SampleInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email công việc"
                />
                <div className="grid grid-cols-2 gap-4">
                  <SampleInput
                    label="Vị trí công tác"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="VD: Trưởng phòng NS"
                  />
                  <SampleInput
                    label="Địa điểm làm việc"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: Bình Dương"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SampleInput
                    label="Mật khẩu"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                  />
                  <SampleInput
                    label="Nhập lại"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
              )}

              <SampleButton
                type="submit"
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đăng ký HR"}
              </SampleButton>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-green-600 hover:underline text-sm font-medium">
                  Đã có tài khoản? Đăng nhập
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RecruiterRegisterPage;
export { RecruiterRegisterPage };
