import React, { useState } from "react";
import SampleInput from "@/components/common/Input/SampleInput";
import SampleButton from "@/components/common/Button/SampleButton";
import SampleModal from "@/components/common/Modal/SampleModal";
import { Footer } from "@/layouts/components/Footer/Footer";
import { registerApi } from "@/api/api/services/auth.api";

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }
    setError("");
    try {
      await registerApi({ email, password });
      setShowModal(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "Đăng ký thất bại");
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between bg-[#f0f4f8]"
      style={{ minHeight: "100vh" }}
    >
      <header className="bg-white shadow-sm px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold">
            TD
          </div>
          <span className="font-bold text-gray-800">TDMU Jobs</span>
        </div>
      </header>
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Form */}
        <div className="flex-1 flex items-stretch bg-[#f0f4f8]">
          <form
            className="w-full h-full flex flex-col justify-center bg-[#f8fafc] p-16"
            style={{
              background: "#f8fafc",
              borderRadius: 0,
              boxShadow: "none",
            }}
            onSubmit={handleRegister}
          >
            <h2 className="text-3xl font-extrabold mb-8 text-center text-blue-700 tracking-wide">
              Đăng ký
            </h2>
            <SampleInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email"
              error={error && !email ? error : ""}
            />
            <SampleInput
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              error={error && !password ? error : ""}
            />
            <SampleInput
              label="Nhập lại mật khẩu"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              error={error && !confirmPassword ? error : ""}
            />
            {error && email && password && confirmPassword && (
              <p className="text-red-500 text-sm mb-2">{error}</p>
            )}
            <SampleButton
              type="submit"
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Đăng ký
            </SampleButton>
            <div className="mt-6 text-center">
              <a
                href="/login"
                className="text-blue-600 hover:underline text-sm"
              >
                Đã có tài khoản? Đăng nhập
              </a>
            </div>
          </form>
          <SampleModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Thông báo"
          >
            <p>Đăng ký thành công (demo)!</p>
            <SampleButton onClick={() => setShowModal(false)}>
              Đóng
            </SampleButton>
          </SampleModal>
        </div>
        {/* Right: Background/Decoration */}
        <div className="hidden lg:block flex-1 bg-gradient-to-br from-blue-100 to-blue-400 relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-900 opacity-80">
            <h2 className="text-4xl font-bold mb-4 text-center">
              Chào mừng bạn đến với TDMU Jobs
            </h2>
            <p className="text-lg max-w-md text-center">
              Nền tảng tuyển dụng và thực tập dành cho sinh viên Đại học Thủ Dầu
              Một
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RegisterPage;
export { RegisterPage };
