import { useState, useRef } from "react";
import { companyApi } from "@/api/api/services/company.api";
import { useAuth } from "@/hooks/useAuth";
import SampleInput from "@/components/common/Input/SampleInput";
import SampleButton from "@/components/common/Button/SampleButton";
import { ArrowLeft, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onBack: () => void;
}

export const CreateCompanyForm = ({ onBack }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    companyEmail: "",
    phone: "",
    website: "",
    industry: "",
    size: "",
    address: "",
    shortDescription: "",
    description: "",
    taxCode: "",
    charterCapital: "",
    representativeName: "",
    licenseAddress: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [analyzing, setAnalyzing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "license") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === "logo") {
        setLogoFile(file);
      } else {
        setLicenseFile(file);
        // Tự động phân tích khi upload giấy phép
        handleAnalyze(file);
      }
    }
  };

  const handleAnalyze = async (file: File) => {
    setAnalyzing(true);
    setError("");
    try {
      const res = await companyApi.analyzeLicense(file);
      if (res.success && res.data) {
        const info = res.data;
        setFormData((prev) => ({
          ...prev,
          name: info.name_vn || prev.name,
          address: info.address || prev.address,
          taxCode: info.tax_code || prev.taxCode,
          charterCapital: info.charter_capital || prev.charterCapital,
          representativeName: info.representative || prev.representativeName,
          licenseAddress: info.address || prev.licenseAddress,
        }));
      }
    } catch (err) {
      console.error("Phân tích giấy phép thất bại:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.companyEmail || !formData.phone || !licenseFile) {
      setError("Vui lòng nhập các trường bắt buộc và upload Giấy phép kinh doanh.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      data.append("ownerId", user?.id || "");
      if (logoFile) data.append("logo", logoFile);
      if (licenseFile) data.append("businessLicense", licenseFile);

      await companyApi.createOnboarding(data);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Tạo công ty thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Đăng ký thành công!</h2>
          <p className="text-gray-600 mb-6">
            Hồ sơ công ty của bạn đã được gửi. Vui lòng chờ Ban Quản Trị hệ thống xác thực thông tin và giấy phép kinh doanh.
          </p>
          <SampleButton onClick={() => navigate("/login")} className="w-full">
            Trở về Đăng nhập
          </SampleButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-[#f0f4f8]">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden relative">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        <div className="p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Thông tin công ty</h2>
            <p className="text-gray-500 mt-2">Cung cấp thông tin chi tiết để đăng ký công ty trên hệ thống</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload Files */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo công ty</label>
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <ImageIcon className="text-gray-400 mb-2" size={24} />
                  <span className="text-sm text-gray-600">{logoFile ? logoFile.name : "Nhấn để chọn logo"}</span>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "logo")} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giấy phép kinh doanh <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => licenseInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Upload className="text-gray-400 mb-2" size={24} />
                  <span className="text-sm text-gray-600">
                    {analyzing ? "Đang phân tích thông tin..." : (licenseFile ? licenseFile.name : "Nhấn để chọn file")}
                  </span>
                  <input type="file" ref={licenseInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, "license")} />
                </div>
                {analyzing && (
                  <div className="mt-2 text-[11px] text-blue-600 flex items-center gap-1 italic">
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Hệ thống đang tự động trích xuất thông tin từ giấy phép...
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SampleInput label="Tên công ty *" name="name" value={formData.name} onChange={handleChange} placeholder="VD: Công ty TNHH ABC" />
              <SampleInput label="Mã số thuế" name="taxCode" value={formData.taxCode} onChange={handleChange} placeholder="Tự động trích xuất từ giấy phép" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SampleInput label="Người đại diện" name="representativeName" value={formData.representativeName} onChange={handleChange} placeholder="Tên người đại diện pháp luật" />
              <SampleInput label="Vốn điều lệ" name="charterCapital" value={formData.charterCapital} onChange={handleChange} placeholder="VD: 8.000.000.000 đồng" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SampleInput label="Email công ty *" type="email" name="companyEmail" value={formData.companyEmail} onChange={handleChange} placeholder="VD: contact@abc.com" />
              <SampleInput label="Số điện thoại *" name="phone" value={formData.phone} onChange={handleChange} placeholder="VD: 0123456789" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SampleInput label="Website" name="website" value={formData.website} onChange={handleChange} placeholder="VD: https://abc.com" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quy mô</label>
                <select
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn quy mô</option>
                  <option value="1-50">1 - 50 nhân viên</option>
                  <option value="51-150">51 - 150 nhân viên</option>
                  <option value="151-500">151 - 500 nhân viên</option>
                  <option value="500+">Hơn 500 nhân viên</option>
                </select>
              </div>
            </div>
            
            <SampleInput label="Lĩnh vực hoạt động" name="industry" value={formData.industry} onChange={handleChange} placeholder="VD: IT, Ngân hàng" />

            <SampleInput label="Địa chỉ" name="address" value={formData.address} onChange={handleChange} placeholder="Nhập địa chỉ đầy đủ" />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
              <textarea
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Khẩu hiệu hoặc mô tả ngắn gọn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu chi tiết</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Giới thiệu về lịch sử, văn hóa, môi trường làm việc..."
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <SampleButton type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-medium">
              {loading ? "Đang xử lý..." : "Gửi yêu cầu đăng ký"}
            </SampleButton>
          </form>
        </div>
      </div>
    </div>
  );
};
