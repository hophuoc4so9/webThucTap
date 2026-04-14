import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { GoogleLogin } from "@react-oauth/google";
import SampleInput from "@/components/common/Input/SampleInput";
import SampleButton from "@/components/common/Button/SampleButton";
import SampleModal from "@/components/common/Modal/SampleModal";
import { Footer } from "@/layouts/components/Footer/Footer";
import { loginApi, googleLoginApi } from "@/api/api/services/auth.api";
import { setCredentials } from "@/store/slices/authSlice";
import type { AppDispatch } from "@/store";

const ROLE_ROUTES: Record<string, string> = {
  STUDENT: "/student/dashboard",
  COMPANY: "/company/dashboard",
  ADMIN: "/admin/dashboard",
};

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError("Không nhận được credential từ Google");
      return;
    }
    setError("");
    try {
      const res = await googleLoginApi(credentialResponse.credential);
      const { accessToken, user } = res.data;
      const role = (user.role as string).toUpperCase() as "STUDENT" | "COMPANY" | "ADMIN";
      dispatch(setCredentials({ user: { id: String(user.id), email: user.email, role, name: user.name ?? null }, token: accessToken }));
      navigate(ROLE_ROUTES[role] || "/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Đăng nhập Google thất bại");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setError("");
    try {
      const res = await loginApi({ email, password });
      const { accessToken, user } = res.data;
      const role = (user.role as string).toUpperCase() as
        | "STUDENT"
        | "COMPANY"
        | "ADMIN";
      dispatch(
        setCredentials({
          user: { id: String(user.id), email: user.email, role, name: user.name ?? null },
          token: accessToken,
        }),
      );
      navigate(ROLE_ROUTES[role] || "/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Đăng nhập thất bại");
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
            onSubmit={handleLogin}
          >
            <h2 className="text-3xl font-extrabold mb-8 text-center text-blue-700 tracking-wide">
              Đăng nhập
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
            {error && email && password && (
              <p className="text-red-500 text-sm mb-2">{error}</p>
            )}
            <SampleButton
              type="submit"
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Đăng nhập
            </SampleButton>
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-gray-300" />
              <span className="px-3 text-gray-400 text-sm">hoặc</span>
              <div className="flex-1 border-t border-gray-300" />
            </div>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Đăng nhập Google thất bại")}
                text="signin_with"
                shape="rectangular"
                width="320"
              />
            </div>
            <div className="mt-6 text-center">
              <a
                href="/register"
                className="text-blue-600 hover:underline text-sm"
              >
                Chưa có tài khoản? Đăng ký
              </a>
            </div>
          </form>
          <SampleModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Thông báo"
          >
            <p>Đăng nhập thành công!</p>
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

export default LoginPage;
export { LoginPage };
