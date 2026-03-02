import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Building2,
  Mail,
  Save,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Globe,
  MapPin,
  Users,
  Briefcase,
  AlignLeft,
  FileText,
} from "lucide-react";
import type { RootState } from "@/store";

interface CompanyProfile {
  name: string;
  phone: string;
  website: string;
  industry: string;
  size: string;
  address: string;
  shortAddress: string;
  shortDescription: string;
  description: string;
}

const EMPTY_PROFILE: CompanyProfile = {
  name: "",
  phone: "",
  website: "",
  industry: "",
  size: "",
  address: "",
  shortAddress: "",
  shortDescription: "",
  description: "",
};

const SIZE_OPTIONS = [
  "1–10 nhân viên",
  "11–50 nhân viên",
  "51–200 nhân viên",
  "201–500 nhân viên",
  "501–1000 nhân viên",
  "Trên 1000 nhân viên",
];

const INDUSTRY_OPTIONS = [
  "Công nghệ thông tin",
  "Phần mềm / Lập trình",
  "Tài chính / Ngân hàng",
  "Giáo dục / Đào tạo",
  "Thương mại điện tử",
  "Marketing / Truyền thông",
  "Sản xuất / Công nghiệp",
  "Y tế / Dược phẩm",
  "Xây dựng / Bất động sản",
  "Logistics / Vận tải",
  "Du lịch / Khách sạn",
  "Bán lẻ / Tiêu dùng",
  "Khác",
];

const inputCls =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-shadow bg-white";

function Field({
  label,
  icon: Icon,
  children,
  hint,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-gray-400" />}
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function CompanySettingsPage() {
  const { user } = useSelector((s: RootState) => s.auth);
  const email = user?.email ?? "";
  const userId = user?.id ?? "unknown";
  const PROFILE_KEY = `company_profile_${userId}`;
  const NAME_KEY = `company_name_${userId}`;

  const load = (): CompanyProfile => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return { ...EMPTY_PROFILE, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    const oldName = localStorage.getItem(NAME_KEY) ?? "";
    return { ...EMPTY_PROFILE, name: oldName };
  };

  const [profile, setProfile] = useState<CompanyProfile>(load);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof CompanyProfile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 250));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (profile.name.trim())
      localStorage.setItem(NAME_KEY, profile.name.trim());
    else localStorage.removeItem(NAME_KEY);
    setDirty(false);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const saveBtn = (
    <button
      onClick={handleSave}
      disabled={!dirty || saving}
      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
    >
      {saving ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
      ) : (
        <Save size={15} />
      )}
      Lưu thay đổi
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Cài đặt công ty</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Cập nhật thông tin cơ bản của công ty bạn
            </p>
          </div>
          {saveBtn}
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
            <CheckCircle2 size={16} />
            Đã lưu thông tin thành công!
          </div>
        )}

        {/* Tài khoản */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ShieldCheck size={17} className="text-green-500" />
            Tài khoản
          </h2>

          <Field
            label="Email đăng nhập"
            icon={Mail}
            hint="Email không thể thay đổi. Đây là định danh chính của tài khoản."
          >
            <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 select-all">
              {email}
            </div>
          </Field>

          <Field label="Loại tài khoản">
            <div>
              <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Nhà tuyển dụng (COMPANY)
              </span>
            </div>
          </Field>
        </section>

        {/* Thông tin cơ bản */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 size={17} className="text-green-500" />
            Thông tin cơ bản
          </h2>

          <Field
            label="Tên công ty *"
            icon={Building2}
            hint="Tên này hiển thị trên tin tuyển dụng và hồ sơ công ty."
          >
            <input
              type="text"
              value={profile.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ví dụ: Công ty TNHH ABC"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Số điện thoại" icon={Phone}>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="0901 234 567"
                className={inputCls}
              />
            </Field>
            <Field label="Website" icon={Globe}>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://company.com"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ngành nghề" icon={Briefcase}>
              <select
                value={profile.industry}
                onChange={(e) => set("industry", e.target.value)}
                className={inputCls}
              >
                <option value="">-- Chọn ngành --</option>
                {INDUSTRY_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quy mô" icon={Users}>
              <select
                value={profile.size}
                onChange={(e) => set("size", e.target.value)}
                className={inputCls}
              >
                <option value="">-- Chọn quy mô --</option>
                {SIZE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Địa chỉ */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <MapPin size={17} className="text-green-500" />
            Địa chỉ
          </h2>

          <Field label="Địa chỉ đầy đủ" icon={MapPin}>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="123 Đường ABC, Phường XYZ, TP. HCM"
              className={inputCls}
            />
          </Field>

          <Field label="Tỉnh / Thành phố">
            <input
              type="text"
              value={profile.shortAddress}
              onChange={(e) => set("shortAddress", e.target.value)}
              placeholder="TP. Hồ Chí Minh"
              className={inputCls}
            />
          </Field>
        </section>

        {/* Giới thiệu */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={17} className="text-green-500" />
            Giới thiệu công ty
          </h2>

          <Field
            label="Mô tả ngắn"
            icon={AlignLeft}
            hint="Hiển thị ở thẻ công ty trong danh sách. Tối đa 200 ký tự."
          >
            <textarea
              rows={2}
              maxLength={200}
              value={profile.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              placeholder="Một dòng giới thiệu ngắn gọn về công ty..."
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-right text-gray-400">
              {profile.shortDescription.length}/200
            </p>
          </Field>

          <Field
            label="Mô tả chi tiết"
            icon={FileText}
            hint="Hiển thị trong trang chi tiết công ty."
          >
            <textarea
              rows={5}
              value={profile.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Giới thiệu về lịch sử, sứ mệnh, văn hóa công ty..."
              className={`${inputCls} resize-y`}
            />
          </Field>
        </section>

        {/* Bottom save */}
        <div className="flex items-center gap-3 pb-4">
          {saveBtn}
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 size={15} /> Đã lưu!
            </span>
          )}
          {dirty && !saved && (
            <span className="text-xs text-amber-500">
              Có thay đổi chưa được lưu
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
