import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "@/store";
import { userApi } from "@/api/api/services/user.api";
import { cvApi } from "@/api/api/services/cv.api";
import { projectOrderApi, type ProjectApplication } from "@/api/api/services/project-order.api";
import type { Cv } from "@/features/student/types";
import { 
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, 
  ShieldCheck, ShieldAlert, Pencil, Plus, FileText, 
  X, Eye, Download, Loader2, FolderOpen, ChevronRight, Save
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
  const [myProjects, setMyProjects] = useState<ProjectApplication[]>([]);
  const [error, setError] = useState("");
  
  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resending, setResending] = useState(false);
  
  // Export/Edit state
  const [exporting, setExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    studentId: "",
    class: "",
    academicYear: "",
    major: "",
    summary: "",
    education: "",
    jobPosition: ""
  });

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

  const loadData = useCallback(async () => {
    if (!userId || Number.isNaN(userId)) {
      setError("Không xác định được người dùng");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [userData, cvData, projectsData] = await Promise.all([
        userApi.getById(userId),
        cvApi.getDefault(userId),
        projectOrderApi.getStudentApplications(userId)
      ]);
      
      setProfile(userData);
      setDefaultCv(cvData);
      setMyProjects(projectsData || []);
      
      setEditForm({
        name: userData.name || "",
        phone: cvData?.phone || "",
        address: cvData?.address || "",
        studentId: cvData?.studentId || "",
        class: cvData?.class || "",
        academicYear: cvData?.academicYear || "",
        major: cvData?.major || "",
        summary: cvData?.summary || "",
        education: cvData?.education || "",
        jobPosition: cvData?.jobPosition || ""
      });
    } catch (err) {
      setError("Không tải được thông tin profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      // Update User Name
      await userApi.updateProfile(userId, { name: editForm.name });
      
      // Update CV info if exists
      if (defaultCv) {
        const updatedCv = await cvApi.update(defaultCv.id, {
          phone: editForm.phone,
          address: editForm.address,
          studentId: editForm.studentId,
          class: editForm.class,
          academicYear: editForm.academicYear,
          major: editForm.major,
          summary: editForm.summary,
          education: editForm.education,
          jobPosition: editForm.jobPosition
        });
        setDefaultCv(updatedCv);
      }
      
      setProfile((prev: any) => ({ ...prev, name: editForm.name }));
      setIsEditing(false);
    } catch (err) {
      alert("Không thể cập nhật thông tin");
    } finally {
      setSaving(false);
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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

      {/* Portfolio Header */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-blue-500/5 overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] bg-[size:24px_24px]"></div>
        </div>
        <div className="px-8 pb-10">
          <div className="relative flex flex-col md:flex-row items-end gap-6 -mt-16 mb-8">
            <div className="w-32 h-32 rounded-[2.5rem] bg-white p-1.5 shadow-2xl relative">
              <div className="w-full h-full rounded-[2.2rem] bg-gray-100 flex items-center justify-center overflow-hidden">
                <User size={64} className="text-gray-300" />
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center border-4 border-white shadow-lg">
                <Plus size={16} />
              </button>
            </div>
            
            <div className="flex-1 pb-2 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input 
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none px-1 bg-transparent"
                      placeholder="Họ và tên"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{profile?.name || "Sinh viên"}</h1>
                    {profile?.isVerified && <ShieldCheck className="text-blue-500" size={24} />}
                    <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Pencil size={18} />
                    </button>
                  </div>
                )}
                {isTdmuStudent ? (
                  <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-black rounded-full border border-blue-100 uppercase tracking-widest self-center md:self-auto">
                    TDMU Student
                  </span>
                ) : (
                  <span className="inline-flex px-3 py-1 bg-gray-50 text-gray-600 text-[11px] font-black rounded-full border border-gray-100 uppercase tracking-widest self-center md:self-auto">
                    External Student
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                {isEditing ? (
                  <input 
                    value={editForm.jobPosition}
                    onChange={(e) => setEditForm(prev => ({ ...prev, jobPosition: e.target.value }))}
                    className="text-xs px-3 py-1 rounded-xl border border-gray-200 outline-none focus:border-blue-500 w-full max-w-md"
                    placeholder="Vị trí mong muốn (ví dụ: Fullstack Developer, UI/UX Designer)"
                  />
                ) : (
                  <>
                    {jobPositions.length > 0 ? (
                      jobPositions.map((pos, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 shadow-sm">
                          <Briefcase size={14} /> {pos}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">Chưa cập nhật vị trí ứng tuyển</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 self-center md:self-end">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleExportPdf}
                    disabled={!defaultCv || exporting}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 text-sm font-bold rounded-2xl border border-gray-200 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm disabled:opacity-50"
                  >
                    {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    Xuất Portfolio
                  </button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    <Pencil size={18} /> Chỉnh sửa
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 text-sm font-bold rounded-2xl border border-gray-200 hover:bg-gray-100 transition-all"
                  >
                    <X size={18} /> Hủy
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Lưu thay đổi
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8 border-t border-gray-100">
            {/* Contact Chips */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Liên hệ</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 border border-transparent hover:border-blue-100 hover:bg-white transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:text-blue-600">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                    <p className="text-sm font-semibold text-gray-700 truncate">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 border border-transparent hover:border-blue-100 hover:bg-white transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:text-blue-600">
                    <Phone size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Điện thoại</p>
                    {isEditing ? (
                      <input 
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="text-sm font-semibold text-gray-700 w-full bg-transparent border-b border-gray-200 outline-none focus:border-blue-500"
                        placeholder="Số điện thoại"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-700 truncate">{defaultCv?.phone || "---"}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 border border-transparent hover:border-blue-100 hover:bg-white transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:text-blue-600">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Địa chỉ</p>
                    {isEditing ? (
                      <input 
                        value={editForm.address}
                        onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        className="text-sm font-semibold text-gray-700 w-full bg-transparent border-b border-gray-200 outline-none focus:border-blue-500"
                        placeholder="Địa chỉ"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-700 truncate">{defaultCv?.address || "---"}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic & Summary */}
            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-wider">MSSV</p>
                  {isEditing ? (
                    <input 
                      value={editForm.studentId}
                      onChange={(e) => setEditForm(prev => ({ ...prev, studentId: e.target.value }))}
                      className="text-base font-black text-blue-900 w-full bg-transparent border-b border-blue-200 outline-none focus:border-blue-500"
                      placeholder="MSSV"
                    />
                  ) : (
                    <p className="text-base font-black text-blue-900">{defaultCv?.studentId || "---"}</p>
                  )}
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                  <p className="text-[10px] font-black text-indigo-400 uppercase mb-1 tracking-wider">Lớp / Niên khóa</p>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input 
                        value={editForm.class}
                        onChange={(e) => setEditForm(prev => ({ ...prev, class: e.target.value }))}
                        className="text-base font-black text-indigo-900 w-1/2 bg-transparent border-b border-indigo-200 outline-none focus:border-blue-500"
                        placeholder="Lớp"
                      />
                      <span className="text-indigo-300">/</span>
                      <input 
                        value={editForm.academicYear}
                        onChange={(e) => setEditForm(prev => ({ ...prev, academicYear: e.target.value }))}
                        className="text-base font-black text-indigo-900 w-1/2 bg-transparent border-b border-indigo-200 outline-none focus:border-blue-500"
                        placeholder="Niên khóa"
                      />
                    </div>
                  ) : (
                    <p className="text-base font-black text-indigo-900">{defaultCv?.class || "---"} / {defaultCv?.academicYear || "---"}</p>
                  )}
                </div>
                <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100/50">
                  <p className="text-[10px] font-black text-violet-400 uppercase mb-1 tracking-wider">Chuyên ngành</p>
                  {isEditing ? (
                    <input 
                      value={editForm.major}
                      onChange={(e) => setEditForm(prev => ({ ...prev, major: e.target.value }))}
                      className="text-base font-black text-violet-900 w-full bg-transparent border-b border-violet-200 outline-none focus:border-blue-500"
                      placeholder="Chuyên ngành"
                    />
                  ) : (
                    <p className="text-base font-black text-violet-900 truncate">{defaultCv?.major || "---"}</p>
                  )}
                </div>
              </div>
              <div className="bg-gray-50/30 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Giới thiệu</h3>
                {isEditing ? (
                  <textarea 
                    value={editForm.summary}
                    onChange={(e) => setEditForm(prev => ({ ...prev, summary: e.target.value }))}
                    className="text-base text-gray-700 leading-relaxed font-medium w-full bg-white border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500 min-h-[100px]"
                    placeholder="Giới thiệu bản thân..."
                  />
                ) : (
                  <p className="text-base text-gray-700 leading-relaxed font-medium italic">
                    "{defaultCv?.summary || "Hãy cập nhật giới thiệu để thu hút nhà tuyển dụng..."}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Education & Skills */}
        <div className="lg:col-span-1 space-y-8">
          {/* Skills Section */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Briefcase size={20} />
              </div>
              Kỹ năng & Chuyên môn
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {defaultCv && getCvSkills(defaultCv).length > 0 ? (
                getCvSkills(defaultCv).map((skill, i) => (
                  <SkillTag key={i} label={skill} />
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">Chưa cập nhật kỹ năng</p>
              )}
            </div>
            {isEditing && (
              <p className="text-[10px] text-gray-400 mt-4 italic">* Để cập nhật kỹ năng chi tiết, vui lòng sử dụng trình chỉnh sửa CV đầy đủ.</p>
            )}
          </div>

          {/* Education Section */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <GraduationCap size={20} />
              </div>
              Học vấn
            </h3>
            {isEditing ? (
              <textarea 
                value={editForm.education}
                onChange={(e) => setEditForm(prev => ({ ...prev, education: e.target.value }))}
                className="text-sm text-gray-700 font-medium leading-relaxed w-full bg-white border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500 min-h-[120px]"
                placeholder="Thông tin học vấn (trường, ngành, bằng cấp...)"
              />
            ) : (
              <>
                {defaultCv?.education ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {defaultCv.education}
                    </p>
                    {defaultCv.major && (
                      <div className="pt-4 border-t border-gray-50">
                        <p className="text-sm font-bold text-gray-900">{defaultCv.major}</p>
                        <p className="text-xs text-gray-500 font-medium">{defaultCv.majorGroup}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Chưa có thông tin học vấn</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Experience/Projects */}
        <div className="lg:col-span-2 space-y-8">
          {/* Projects Section */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <FolderOpen size={20} />
                </div>
                Dự án đã tham gia
              </h3>
              <button 
                onClick={() => navigate("/student/projects")}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Khám phá dự án mới
              </button>
            </div>

            {myProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myProjects.slice(0, 4).map((app) => (
                  <div 
                    key={app.id}
                    onClick={() => app.project && navigate(`/student/projects/${app.projectId}`)}
                    className="group p-5 rounded-2xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-600 transition-colors">
                        <FolderOpen size={20} />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        app.status === "accepted" ? "bg-green-100 text-green-700" :
                        app.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{app.project?.title || `Dự án #${app.projectId}`}</h4>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      {app.project?.companyName}
                    </p>
                    <div className="mt-4 flex items-center text-blue-600 text-[11px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                      Xem chi tiết <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
                <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-200">
                  <Plus size={32} />
                </div>
                <p className="text-sm font-bold text-gray-800">Chưa có dự án nào</p>
                <p className="text-xs text-gray-400 mt-1 mb-6">Hãy ứng tuyển các dự án từ doanh nghiệp để làm đẹp Portfolio</p>
                <button 
                  onClick={() => navigate("/student/projects")}
                  className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  Tìm dự án ngay
                </button>
              </div>
            )}
          </div>

          {/* Online CV Section */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                Hồ sơ trực tuyến (CV)
              </h3>
              <button 
                onClick={() => navigate("/student/cv")}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Tất cả hồ sơ
              </button>
            </div>

            {defaultCv ? (
              <div className="p-6 rounded-[2rem] border border-blue-100 bg-blue-50/20 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-[1.5rem] bg-white border border-blue-100 flex items-center justify-center shadow-xl shadow-blue-500/10 shrink-0">
                  <FileText className="text-blue-600" size={40} />
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-xl font-black text-gray-900 truncate">{defaultCv.title || "CV mặc định"}</p>
                  <p className="text-sm text-gray-500 font-medium mt-1">Cập nhật lần cuối: {new Date(defaultCv.updatedAt).toLocaleDateString("vi-VN")}</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4">
                    <button 
                      onClick={() => navigate(`/student/cv/${defaultCv.id}/edit`)}
                      className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={16} /> Chỉnh sửa
                    </button>
                    <button 
                      onClick={() => navigate("/student/cv")}
                      className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Eye size={16} /> Xem bản đầy đủ
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleExportPdf}
                  className="w-full sm:w-auto px-6 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  Tải CV
                </button>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
                <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-200">
                  <Plus size={32} />
                </div>
                <p className="text-sm font-bold text-gray-800">Bạn chưa có hồ sơ trực tuyến</p>
                <button 
                  onClick={() => navigate("/student/cv/new?tab=text")}
                  className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all mt-6"
                >
                  Tạo Profile ngay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
