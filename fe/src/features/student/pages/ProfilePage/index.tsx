import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "@/store";
import { userApi } from "@/api/api/services/user.api";
import { cvApi } from "@/api/api/services/cv.api";
import { StudentMarketTrendPage } from "../MarketTrend/index";
import type { Cv } from "@/features/student/types";
import { 
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, 
  ShieldCheck, ShieldAlert, Pencil, Plus, FileText, 
  AlertCircle, RefreshCcw, X, Eye, Download, Loader2
} from "lucide-react";
import { SkillTag } from "../CVPage/SkillTag";
import { getCvSkills } from "../CVPage/helpers";
import { exportCvToPdf } from "../CVPage/cvPdfExport";

export const StudentProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const userId = useMemo(() => Number(user?.id), [user?.id]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [defaultCv, setDefaultCv] = useState<Cv | null>(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resending, setResending] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isTdmuStudent = useMemo(() => 
    user?.email?.toLowerCase().endsWith("@student.tdmu.edu.vn"), 
    [user?.email]
  );

  const jobPositions = useMemo(() => {
    if (!defaultCv?.jobPosition) return [];
    try {
      const parsed = JSON.parse(defaultCv.jobPosition);
      return Array.isArray(parsed) ? parsed : [String(defaultCv.jobPosition)];
    } catch {
      return [defaultCv.jobPosition];
    }
  }, [defaultCv?.jobPosition]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!userId || Number.isNaN(userId)) {
        setError("Không xác định được người dùng");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [userData, cvData] = await Promise.all([
          userApi.getById(userId),
          cvApi.getDefault(userId)
        ]);
        
        if (!active) return;
        setProfile(userData);
        setDefaultCv(cvData);
      } catch (err) {
        if (!active) return;
        setError("Không tải được thông tin profile");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, [userId]);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Vui lòng nhập mã OTP 6 chữ số");
      return;
    }
    setVerifying(true);
    setOtpError("");
    try {
      await userApi.verifyOtp({ email: user?.email || "", otp });
      setProfile((prev: any) => ({ ...prev, isVerified: true }));
      setOtpSent(false);
      setOtp("");
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      await userApi.resendOtp({ email: user?.email || "" });
      setOtpSent(true);
      setOtpError("");
    } catch (err) {
      setOtpError("Không thể gửi lại mã OTP");
    } finally {
      setResending(false);
    }
  };

  const handleExportPdf = async () => {
    if (!defaultCv) return;
    try {
      setExporting(true);
      await exportCvToPdf(defaultCv);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-64 bg-gray-100 rounded-2xl mb-8"></div>
        <div className="h-96 bg-gray-100 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Verification Banner */}
      {!profile?.isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="text-amber-600" size={24} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-amber-800">Tài khoản chưa được xác thực</h3>
            <p className="text-sm text-amber-700">
              {isTdmuStudent 
                ? "Email sinh viên TDMU của bạn cần được xác nhận để hưởng các đặc quyền."
                : "Hãy xác thực tài khoản để tăng độ tin cậy đối với nhà tuyển dụng."}
            </p>
          </div>
          <div className="shrink-0 flex gap-2">
            {!otpSent ? (
              <button 
                onClick={handleResendOtp}
                disabled={resending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {resending ? "Đang gửi..." : "Gửi mã xác thực"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Mã 6 số"
                  className="w-24 px-3 py-2 text-sm border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                  maxLength={6}
                />
                <button 
                  onClick={handleVerifyOtp}
                  disabled={verifying}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {verifying ? "..." : "Xác nhận"}
                </button>
                <button 
                  onClick={() => setOtpSent(false)}
                  className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {otpError && <p className="text-xs text-red-600 text-center">{otpError}</p>}

      {/* Profile Header & Main Info */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="px-8 pb-8">
          <div className="relative flex flex-col sm:flex-row items-end gap-4 -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                <User size={48} className="text-gray-300" />
              </div>
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{profile?.name || "Sinh viên"}</h1>
                {profile?.isVerified && (
                  <ShieldCheck className="text-blue-500" size={20} />
                )}
                {isTdmuStudent && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md border border-blue-100 uppercase tracking-wider">
                    TDMU Student
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {jobPositions.length > 0 ? (
                  jobPositions.map((pos, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                      <Briefcase size={12} /> {pos}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">Chưa cập nhật vị trí ứng tuyển</span>
                )}
              </div>
              <p className="text-gray-500 flex items-center gap-1.5 mt-2 text-sm">
                <Mail size={14} /> {profile?.email}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPdf}
                disabled={!defaultCv || exporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-sm font-semibold rounded-xl border border-green-100 hover:bg-green-100 transition-colors shadow-sm disabled:opacity-50"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Xuất PDF
              </button>
              <button 
                onClick={() => navigate(defaultCv ? `/student/cv/${defaultCv.id}/edit` : "/student/cv/new?tab=text")}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Pencil size={14} /> Sửa Profile
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-50">
            {/* Quick Stats/Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Thông tin cá nhân</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <Phone size={14} className="text-gray-400" />
                  </div>
                  {defaultCv?.phone || "Chưa cập nhật SĐT"}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-gray-400" />
                  </div>
                  {defaultCv?.address || "Chưa cập nhật địa chỉ"}
                </div>
                {defaultCv?.birthday && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-400 uppercase">
                      DOB
                    </div>
                    {new Date(defaultCv.birthday).toLocaleDateString("vi-VN")}
                  </div>
                )}
                {defaultCv?.gender && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-400 uppercase">
                      GEN
                    </div>
                    {defaultCv.gender}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Thông tin sinh viên TDMU</h3>
                {isTdmuStudent && <GraduationCap size={16} className="text-blue-500" />}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">MSSV</p>
                  <p className="text-sm font-bold text-slate-700">{defaultCv?.studentId || "---"}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Lớp</p>
                  <p className="text-sm font-bold text-slate-700">{defaultCv?.class || "---"}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Niên khóa</p>
                  <p className="text-sm font-bold text-slate-700">{defaultCv?.academicYear || "---"}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Giới thiệu bản thân</h3>
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  {defaultCv?.summary || "Hãy cập nhật giới thiệu để thu hút nhà tuyển dụng..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Education & Skills */}
        <div className="lg:col-span-1 space-y-6">
          {/* Education */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <GraduationCap className="text-blue-500" size={18} /> Học vấn
            </h3>
            {defaultCv?.education ? (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{defaultCv.education}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Chưa có thông tin học vấn</p>
            )}
            {defaultCv?.major && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ngành học</p>
                <p className="text-sm font-semibold text-gray-800">{defaultCv.major}</p>
                <p className="text-xs text-gray-500">{defaultCv.majorGroup}</p>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Briefcase className="text-blue-500" size={18} /> Kỹ năng
            </h3>
            <div className="flex flex-wrap gap-2">
              {defaultCv && getCvSkills(defaultCv).length > 0 ? (
                getCvSkills(defaultCv).map((skill, i) => (
                  <SkillTag key={i} label={skill} />
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">Chưa cập nhật kỹ năng</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Experience/Projects & Market Trends */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent CV / Portfolio */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-blue-500" size={18} /> Hồ sơ trực tuyến (CV)
              </h3>
              <button 
                onClick={() => navigate("/student/cv")}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Quản lý tất cả CV
              </button>
            </div>

            {defaultCv ? (
              <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-blue-100 flex items-center justify-center shadow-sm">
                  <FileText className="text-blue-500" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{defaultCv.title || "CV mặc định"}</p>
                  <p className="text-xs text-gray-500">Cập nhật lần cuối: {new Date(defaultCv.updatedAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/student/cv/${defaultCv.id}/edit`)}
                    className="p-2 bg-white hover:bg-gray-50 text-gray-600 rounded-lg border border-gray-200 shadow-sm transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={() => navigate("/student/cv")}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm text-gray-300">
                  <Plus size={24} />
                </div>
                <p className="text-sm font-semibold text-gray-700">Bạn chưa có hồ sơ trực tuyến</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Tạo hồ sơ ngay để nhà tuyển dụng có thể tìm thấy bạn</p>
                <button 
                  onClick={() => navigate("/student/cv/new?tab=text")}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
                >
                  Tạo Profile ngay
                </button>
              </div>
            )}
          </div>

          {/* Market Trends Section */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <RefreshCcw className="text-blue-500" size={18} /> Xu hướng thị trường
              </h3>
            </div>
            <div className="p-2">
              <StudentMarketTrendPage />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
