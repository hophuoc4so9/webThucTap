import { useState, useEffect, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { ChevronLeft, X } from "lucide-react";
import {
  projectOrderApi,
  type ProjectOrder,
} from "@/api/api/services/project-order.api";

// ─── TagInput ────────────────────────────────────────────────────────────────
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  color?: "indigo" | "green";
}
function TagInput({ tags, onChange, placeholder = "Nhập rồi Enter...", color = "indigo" }: TagInputProps) {
  const [input, setInput] = useState("");
  const colorCls = color === "green"
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-indigo-50 text-indigo-700 border-indigo-200";

  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i));
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && tags.length > 0) remove(tags.length - 1);
  };

  return (
    <div className="flex flex-wrap gap-1.5 border border-gray-200 rounded-xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-400 min-h-[42px]">
      {tags.map((t, i) => (
        <span key={t} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${colorCls}`}>
          {t}
          <button type="button" onClick={() => remove(i)} className="hover:opacity-70">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
      />
    </div>
  );
}

// ─── ProjectFormPage ──────────────────────────────────────────────────────────
export function ProjectFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const { user } = useSelector((s: RootState) => s.auth);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxStudents, setMaxStudents] = useState(1);
  const [techTags, setTechTags] = useState<string[]>([]);
  const [status, setStatus] = useState<ProjectOrder["status"]>("open");

  useEffect(() => {
    if (!user?.email) return;
    if (!isEdit) {
      setCompanyName(user.email);
      return;
    }
    setLoading(true);
    projectOrderApi.findOne(Number(id))
      .then((p) => {
        setCompanyName(p.companyName ?? user.email ?? "");
        setTitle(p.title);
        setDescription(p.description ?? "");
        setRequirements(p.requirements ?? "");
        setBudget(p.budget ?? "");
        setDeadline(p.deadline ?? "");
        setMaxStudents(p.maxStudents ?? 1);
        setStatus(p.status);
        setTechTags(p.techStack ? JSON.parse(p.techStack) : []);
      })
      .catch(() => setError("Không thể tải thông tin dự án."))
      .finally(() => setLoading(false));
  }, [id, isEdit, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Vui lòng nhập tên dự án."); return; }
    if (!companyName.trim()) { setError("Vui lòng nhập tên công ty."); return; }
    if (!user?.id) { setError("Không xác định được tài khoản."); return; }
    setSaving(true);
    setError("");
    const dto: Partial<ProjectOrder> = {
      title: title.trim(),
      description: description.trim() || undefined,
      requirements: requirements.trim() || undefined,
      budget: budget.trim() || undefined,
      deadline: deadline.trim() || undefined,
      maxStudents,
      techStack: techTags.length > 0 ? JSON.stringify(techTags) : undefined,
      status,
      companyId: +user.id,
      companyName: companyName.trim(),
    };
    try {
      if (isEdit) {
        await projectOrderApi.update(Number(id), dto);
      } else {
        await projectOrderApi.create(dto);
      }
      navigate("/company/projects", { state: { saved: true } });
    } catch {
      setError("Lưu dự án thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {isEdit ? "Chỉnh sửa dự án" : "Tạo dự án mới"}
            </h1>
            <p className="text-sm text-gray-400">
              {isEdit ? "Cập nhật thông tin dự án" : "Đăng dự án để sinh viên ứng tuyển"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Company name (hiển thị cho sinh viên) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tên công ty <span className="text-red-500">*</span>
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Tên công ty / đơn vị đặt hàng dự án"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tên dự án <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Xây dựng ứng dụng quản lý nhân sự"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mô tả dự án
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tổng quan về dự án, mục tiêu, phạm vi..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Yêu cầu với sinh viên
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Các kỹ năng, kiến thức, kinh nghiệm yêu cầu..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Công nghệ sử dụng
            </label>
            <TagInput
              tags={techTags}
              onChange={setTechTags}
              placeholder="VD: React, NestJS, Docker... (Enter để thêm)"
              color="indigo"
            />
          </div>

          {/* Budget + Deadline row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ngân sách / Thù lao
              </label>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="VD: 5,000,000 VND"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Thời hạn
              </label>
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="VD: 31/12/2025 hoặc 3 tháng"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Max students + Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Số sinh viên tối đa
              </label>
              <input
                type="number"
                min={1}
                value={maxStudents}
                onChange={(e) => setMaxStudents(+e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectOrder["status"])}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                >
                  <option value="open">Đang mở</option>
                  <option value="in_progress">Đang thực hiện</option>
                  <option value="closed">Đã đóng</option>
                  <option value="cancelled">Đã huỷ</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo dự án"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
