import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  ArrowLeft,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Loader2,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from "lucide-react";
import { cvApi } from "@/api/api/services/cv.api";
import type { Cv, CreateCvDto, CvProjectItem, CvSuggestionResponse, CvImprovementItem, UpdateCvDto } from "@/features/student/types";
import { VIEW_CV_STYLE } from "./helpers";
import { toMonthDisplayValue, toMonthInputValue } from "@/utils/date";

const makeEmptyProject = (): CvProjectItem => ({
  name: "",
  role: "",
  description: "",
  technologies: [],
  startDate: "",
  endDate: "",
  link: "",
});

const parseProjectsFromValue = (raw: string | undefined): CvProjectItem[] => {
  if (!raw) return [makeEmptyProject()];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [makeEmptyProject()];
    const projects = parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;
        return {
          name: String(obj.name ?? "").trim(),
          role: String(obj.role ?? "").trim(),
          description: String(obj.description ?? "").trim(),
          technologies: Array.isArray(obj.technologies)
            ? obj.technologies.map((t) => String(t).trim()).filter(Boolean)
            : [],
          startDate: toMonthInputValue(String(obj.startDate ?? "").trim()),
          endDate: toMonthInputValue(String(obj.endDate ?? "").trim()),
          link: String(obj.link ?? "").trim(),
        };
      })
      .filter(Boolean) as CvProjectItem[];
    return projects.length > 0 ? projects : [makeEmptyProject()];
  } catch {
    return [makeEmptyProject()];
  }
};

/** Chuẩn hóa CV từ API — hỗ trợ cả camelCase và snake_case (backend có thể trả về khác nhau) */
function normalizeCvFromApi(raw: Record<string, unknown>): Cv {
  return {
    id: Number(raw.id),
    userId: Number(raw.userId),
    fullName: (raw.fullName ?? raw.full_name) as string | undefined,
    jobPosition: (raw.jobPosition ?? raw.job_position) as string | undefined,
    phone: (raw.phone ?? raw.phone) as string | undefined,
    contactEmail: (raw.contactEmail ?? raw.contact_email) as string | undefined,
    address: (raw.address ?? raw.address) as string | undefined,
    linkedIn: (raw.linkedIn ?? raw.linked_in) as string | undefined,
    title: (raw.title ?? raw.title) as string | undefined,
    summary: (raw.summary ?? raw.summary) as string | undefined,
    skills: (raw.skills ?? raw.skills) as string | undefined,
    education: (raw.education ?? raw.education) as string | undefined,
    experience: (raw.experience ?? raw.experience) as string | undefined,
    projects: (raw.projects ?? raw.projects) as string | undefined,
    filePath: (raw.filePath ?? raw.file_path) as string | undefined,
    fileOriginalName: (raw.fileOriginalName ?? raw.file_original_name) as string | undefined,
    fileMimeType: (raw.fileMimeType ?? raw.file_mime_type) as string | undefined,
    isDefault: Boolean(raw.isDefault ?? raw.is_default),
    source: (raw.source === "file" ? "file" : "form") as "form" | "file",
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

/* ── TagInput ─────────────────────────────────────────────────── */
const TagInput = ({
  label,
  tags,
  onChange,
  placeholder,
  colorClass = "bg-blue-50 text-blue-700 border-blue-200",
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  colorClass?: string;
}) => {
  const [input, setInput] = useState("");

  const addTag = (raw?: string) => {
    const val = (raw ?? input).trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(",")) {
      addTag(val.slice(0, -1));
    } else {
      setInput(val);
    }
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        {label}
      </label>
      <div className="min-h-[48px] w-full border border-gray-200 rounded-xl px-4 py-2.5 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 transition-all bg-white shadow-sm">
        {tags.map((tag, i) => (
          <span
            key={i}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${colorClass}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="hover:opacity-70 transition-opacity ml-0.5"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKey}
          onBlur={() => addTag()}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[140px] text-sm outline-none bg-transparent placeholder-gray-400"
        />
      </div>
      <p className="text-xs text-gray-500 mt-1.5">
        Nhấn <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[10px]">Enter</kbd>, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[10px]">Tab</kbd> hoặc dấu <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[10px]">,</kbd> để thêm
      </p>
    </div>
  );
};

/* ── CvFormPage ───────────────────────────────────────────────── */
export const CvFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const user = useSelector((s: RootState) => s.auth.user);
  const userId = user ? Number(user.id) : 0;

  const isEdit = Boolean(id);
  const [tab, setTab] = useState<"text" | "file">(
    searchParams.get("tab") === "file" ? "file" : "text",
  );
  const [initial, setInitial] = useState<Cv | null>(null);
  const [loadingCv, setLoadingCv] = useState(isEdit);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState<string[]>([]);
  const [projects, setProjects] = useState<CvProjectItem[]>([makeEmptyProject()]);
  const [isDefault, setIsDefault] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState<CvSuggestionResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(100);
  const [previewFont, setPreviewFont] = useState("Times New Roman");

  const updateProject = <K extends keyof CvProjectItem>(
    index: number,
    key: K,
    value: CvProjectItem[K],
  ) => {
    setProjects((prev) =>
      prev.map((project, idx) =>
        idx === index ? { ...project, [key]: value } : project,
      ),
    );
  };

  const addProject = () => {
    setProjects((prev) => [...prev, makeEmptyProject()]);
  };

  const removeProject = (index: number) => {
    setProjects((prev) => {
      if (prev.length === 1) return [makeEmptyProject()];
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleAnalyzeDraft = async () => {
    if (!userId) return;
    setAnalysisLoading(true);
    try {
      const result = await cvApi.previewSuggestions({
        userId,
        fullName,
        jobPosition,
        phone,
        contactEmail,
        address,
        linkedIn,
        title,
        summary,
        skills: JSON.stringify(skills),
        education,
        experience: JSON.stringify(experience),
        projects: JSON.stringify(
          projects
            .map((project) => ({
              name: project.name.trim(),
              role: project.role.trim(),
              description: project.description.trim(),
              technologies: project.technologies,
              startDate: project.startDate?.trim() || "",
              endDate: project.endDate?.trim() || "",
              link: project.link?.trim() || "",
            }))
            .filter(
              (project) =>
                project.name ||
                project.role ||
                project.description ||
                project.technologies.length > 0 ||
                project.startDate ||
                project.endDate ||
                project.link,
            ),
        ),
        source: isEdit ? initial?.source ?? "form" : "form",
      });
      setAnalysisResult(result);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể phân tích CV bằng API lúc này";
      setError(message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const renderAnalysisPanel = () => (
    <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] text-violet-800 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold flex items-center gap-1.5">
          <Sparkles size={12} /> Góp ý CV từ AI
        </p>
        <button
          type="button"
          onClick={handleAnalyzeDraft}
          disabled={analysisLoading}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-violet-700 border border-violet-200 text-[11px] font-semibold disabled:opacity-60"
        >
          {analysisLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {analysisLoading ? "Đang phân tích..." : "Phân tích"}
        </button>
      </div>

      {analysisResult ? (
        <div className="space-y-2 rounded-md bg-white/80 border border-violet-100 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-violet-700">Điểm tổng quan</p>
            <p className="text-sm font-bold text-violet-800">{analysisResult.score}/100</p>
          </div>
          <p className="text-[11px] text-violet-800">{analysisResult.summary}</p>
          {analysisResult.improvements.length > 0 && (
            <div className="space-y-1">
              {analysisResult.improvements.slice(0, 2).map((item: CvImprovementItem, idx: number) => (
                <div key={`${item.section}-${idx}`} className="rounded-md border border-violet-100 bg-violet-50/70 px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase text-violet-700">[{item.priority}] {item.section}</p>
                  <p className="text-[11px] text-violet-800">{item.suggestion}</p>
                </div>
              ))}
            </div>
          )}
          {analysisResult.keywordsToAdd.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {analysisResult.keywordsToAdd.slice(0, 6).map((kw: string) => (
                <span key={kw} className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-[10px]">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p></p>
      )}
    </div>
  );

  const renderProjectsSection = () => (
    <section className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-black">
        <h2 className="text-[11px] font-bold text-black uppercase tracking-wider">PROJECTS</h2>
        <button
          type="button"
          onClick={addProject}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold"
        >
          <Plus size={12} /> Thêm dự án
        </button>
      </div>

      {renderAnalysisPanel()}

      <div className="space-y-3">
        {projects.map((project, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-semibold text-slate-700">Dự án {index + 1}</p>
              <button
                type="button"
                onClick={() => removeProject(index)}
                className="text-[11px] px-2 py-1 rounded border border-red-200 text-red-600 bg-white hover:bg-red-50"
              >
                Xóa
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={project.name}
                onChange={(e) => updateProject(index, "name", e.target.value)}
                placeholder="Tên dự án"
                className="w-full text-[11px] text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 focus:outline-none"
              />
              <input
                type="text"
                value={project.role}
                onChange={(e) => updateProject(index, "role", e.target.value)}
                placeholder="Vai trò (Frontend Dev, Team Lead...)"
                className="w-full text-[11px] text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 focus:outline-none"
              />
              <input
                type="text"
                value={project.startDate}
                onChange={(e) => updateProject(index, "startDate", e.target.value)}
                placeholder="Bắt đầu (MM/YYYY)"
                className="w-full text-[11px] text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 focus:outline-none"
              />
              <input
                type="text"
                value={project.endDate}
                onChange={(e) => updateProject(index, "endDate", e.target.value)}
                placeholder="Kết thúc (MM/YYYY hoặc Hiện tại)"
                className="w-full text-[11px] text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <textarea
              value={project.description}
              onChange={(e) => updateProject(index, "description", e.target.value)}
              placeholder="Mô tả ngắn: bạn làm gì, bài toán gì, kết quả gì"
              rows={3}
              className="mt-2 w-full text-[11px] text-slate-800 bg-white border border-slate-200 rounded p-2 resize-y focus:border-blue-400 focus:outline-none"
            />
            <div className="mt-2">
              <TagInput
                label="Công nghệ sử dụng"
                tags={project.technologies}
                onChange={(tags) => updateProject(index, "technologies", tags)}
                placeholder="Ví dụ: React, Node.js, PostgreSQL"
                colorClass="bg-indigo-50 text-indigo-700 border-indigo-200"
              />
            </div>
            <input
              type="url"
              value={project.link}
              onChange={(e) => updateProject(index, "link", e.target.value)}
              placeholder="Link demo hoặc GitHub"
              className="mt-2 w-full text-[11px] text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </section>
  );

  // Load existing CV when editing — populate form để hiện thông tin đã lưu
  useEffect(() => {
    if (!isEdit || !id) return;
    setError("");
    setLoadingCv(true);
    const numId = Number(id);
    cvApi
      .getById(numId)
      .then((raw) => {
        const cv = normalizeCvFromApi(raw as unknown as Record<string, unknown>);
        setInitial(cv);
        setFullName(cv.fullName ?? "");
        setJobPosition(cv.jobPosition ?? "");
        setPhone(cv.phone ?? "");
        setContactEmail(cv.contactEmail ?? "");
        setAddress(cv.address ?? "");
        setLinkedIn(cv.linkedIn ?? "");
        setTitle(cv.title ?? "");
        setSummary(cv.summary ?? "");
        setEducation(cv.education ?? "");
        setProjects(parseProjectsFromValue(cv.projects));
        setIsDefault(cv.isDefault);
        try {
          setSkills(JSON.parse(cv.skills ?? "[]") as string[]);
        } catch {
          setSkills(cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : []);
        }
        try {
          const parsed = JSON.parse(cv.experience ?? "[]");
          setExperience(Array.isArray(parsed) ? parsed : cv.experience ? [cv.experience] : []);
        } catch {
          setExperience(cv.experience ? [cv.experience] : []);
        }
      })
      .catch(() => {
        setError("Không thể tải thông tin CV. Vui lòng thử lại.");
        setInitial(null);
      })
      .finally(() => setLoadingCv(false));
  }, [id, isEdit]);

  const handleFile = (f: File) => {
    const ok = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!ok.includes(f.type)) {
      setError("Chỉ chấp nhận PDF, DOC, DOCX");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File tối đa 10 MB");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (tab === "text" && !title.trim()) {
      setError("Vui lòng nhập tiêu đề CV");
      return;
    }
    if (tab === "file" && !file && !isEdit) {
      setError("Vui lòng chọn file CV");
      return;
    }
    setLoading(true);
    try {
      const skillsJson = JSON.stringify(skills);
      const experienceJson = JSON.stringify(experience);
      const normalizedProjects = projects
        .map((project) => ({
          name: project.name.trim(),
          role: project.role.trim(),
          description: project.description.trim(),
          technologies: project.technologies.map((t) => t.trim()).filter(Boolean),
          startDate: toMonthDisplayValue(project.startDate?.trim() || ""),
          endDate: toMonthDisplayValue(project.endDate?.trim() || ""),
          link: project.link?.trim() || "",
        }))
        .filter((project) => project.name || project.role || project.description || project.technologies.length > 0 || project.startDate || project.endDate || project.link);
      const projectsJson = JSON.stringify(normalizedProjects);

      if (isEdit && initial) {
        const dto: UpdateCvDto = {
          fullName,
          jobPosition,
          phone,
          contactEmail,
          address,
          linkedIn,
          title,
          summary,
          skills: skillsJson,
          education,
          experience: experienceJson,
          projects: projectsJson,
          isDefault,
        };
        await cvApi.update(initial.id, dto);
        if (file) await cvApi.updateFile(initial.id, file);
        navigate("/student/cv", { state: { saved: true, savedType: "update" as const } });
        return;
      } else if (tab === "file" && file) {
        await cvApi.uploadFile(file, {
          userId,
          title: title || file.name,
          isDefault,
        });
        navigate("/student/cv", { state: { saved: true, savedType: "create" as const } });
        return;
      } else {
        const dto: CreateCvDto = {
          userId,
          fullName,
          jobPosition,
          phone,
          contactEmail,
          address,
          linkedIn,
          title,
          summary,
          skills: skillsJson,
          education,
          experience: experienceJson,
          projects: projectsJson,
          isDefault,
        };
        await cvApi.create(dto);
        navigate("/student/cv", { state: { saved: true, savedType: "create" as const } });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  if (loadingCv) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (isEdit && !initial) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-red-600 mb-4">{error || "Không tải được thông tin CV."}</p>
        <button onClick={() => navigate("/student/cv")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
          Quay lại danh sách CV
        </button>
      </div>
    );
  }

  // ─── Chế độ Sửa CV tải từ file: chỉ cho đổi tiêu đề, mặc định, thay file ───
  if (isEdit && initial && initial.source === "file") {
    const handleSubmitFileOnly = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        await cvApi.update(initial.id, { title: title || undefined, isDefault });
        if (file) await cvApi.updateFile(initial.id, file);
        navigate("/student/cv", { state: { saved: true, savedType: "update" as const } });
      } catch (err: unknown) {
        const ex = err as { response?: { data?: { message?: string } } };
        setError(ex?.response?.data?.message ?? "Có lỗi xảy ra, vui lòng thử lại");
      } finally {
        setLoading(false);
      }
    };
    return (
      <div className="min-h-screen bg-slate-200/70 flex flex-col">
        <form onSubmit={handleSubmitFileOnly} className="flex flex-col flex-1 min-h-0">
          <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-2 shadow-sm">
            <button type="button" onClick={() => navigate("/student/cv")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft size={18} /> Quay lại
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề CV (tên hiển thị danh sách)"
              className="min-w-[180px] max-w-[240px] px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Lưu
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md border ${file ? "border-green-400 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <Upload size={16} />
              {file ? file.name : initial?.fileOriginalName ? `File: ${initial.fileOriginalName}` : "Thay file CV"}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </header>
          {error && (
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-red-50 text-red-700 text-sm border-b border-red-100">
              <AlertCircle size={18} className="flex-shrink-0" /> {error}
            </div>
          )}
          <div className="flex-1 overflow-auto py-8 px-4 flex justify-center">
            <div className="bg-white shadow-lg rounded-lg border border-slate-200 p-8 max-w-[480px] w-full space-y-6">
              {renderAnalysisPanel()}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertCircle size={20} className="flex-shrink-0" />
                <span>CV này được tải từ file (PDF/DOC). Bạn chỉ có thể đổi tiêu đề, đặt mặc định hoặc thay file mới; không thể chỉnh sửa nội dung bên trong file.</span>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg bg-slate-50 border border-slate-200">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4 accent-blue-500 rounded" />
                <span className="text-sm font-medium text-slate-700">Đặt làm CV mặc định khi ứng tuyển</span>
              </label>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ─── Chế độ Sửa CV (tạo từ form): form giữa trang, cấu trúc giống CV thực tế (điền như Word) ───
  if (isEdit && initial) {
    return (
      <div className="min-h-screen bg-slate-200/70 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Thanh công cụ: Quay lại | Tiêu đề | Lưu | Tải file CV | Font | Zoom */}
          <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-2 shadow-sm">
            <button type="button" onClick={() => navigate("/student/cv")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft size={18} /> Quay lại
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề CV (tên hiển thị danh sách)"
              className="min-w-[180px] max-w-[240px] px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Lưu
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md border ${file ? "border-green-400 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <Upload size={16} />
              {file ? file.name : initial?.fileOriginalName ? `File: ${initial.fileOriginalName}` : "Tải CV từ file"}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <select value={previewFont} onChange={(e) => setPreviewFont(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40" title="Font chữ">
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Segoe UI">Segoe UI</option>
              <option value="Arial">Arial</option>
            </select>
            <div className="flex items-center gap-0.5 border border-slate-200 rounded-md overflow-hidden bg-white">
              <button type="button" onClick={() => setZoom((z) => Math.max(70, z - 10))} className="p-1.5 text-slate-600 hover:bg-slate-100" title="Thu nhỏ"><ZoomOut size={14} /></button>
              <span className="px-2 text-xs font-medium text-slate-600 min-w-[2.2rem] text-center">{zoom}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(120, z + 10))} className="p-1.5 text-slate-600 hover:bg-slate-100" title="Phóng to"><ZoomIn size={14} /></button>
            </div>
          </header>

          {error && (
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-red-50 text-red-700 text-sm border-b border-red-100">
              <AlertCircle size={18} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Khung form giữa trang — cấu trúc giống CV thực tế */}
          <div className="flex-1 overflow-auto py-6 px-4 flex justify-center">
            <div
              className="bg-white shadow-lg rounded-sm p-8 md:p-10 max-w-[210mm] w-full"
              style={{
                fontFamily: previewFont,
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                minHeight: zoom < 100 ? "auto" : "calc(297mm * 0.7)",
              }}
            >
              <style>{VIEW_CV_STYLE}</style>

              <header className="text-center mb-6 pb-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Họ và tên"
                  className="w-full text-center text-2xl font-bold text-black tracking-wide bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={jobPosition}
                  onChange={(e) => setJobPosition(e.target.value)}
                  placeholder="Vị trí / Chức danh"
                  className="w-full text-center text-sm font-semibold text-black tracking-wide mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 placeholder:text-slate-400"
                />
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-2 text-[11px] text-slate-600">
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại" className="w-28 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-center placeholder:text-slate-400" />
                  <span className="text-slate-400">◇</span>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" className="w-36 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-center placeholder:text-slate-400" />
                  <span className="text-slate-400">◇</span>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Địa chỉ" className="w-28 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-center placeholder:text-slate-400" />
                </div>
                <input
                  type="month"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  className="w-full max-w-md mx-auto mt-1 text-[11px] text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-center placeholder:text-slate-400"
                />
              </header>
              Mô tả
              {/* OBJECTIVE */}
              <section className="mb-4">
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Mục tiêu nghề nghiệp, điểm mạnh..."
                  rows={3}
                  className="w-full text-[11px] text-slate-800 leading-relaxed bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none rounded p-1 resize-none placeholder:text-slate-400"
                />
              </section>

              {/* EDUCATION */}
              <section className="mb-4">
                <h2 className="text-[11px] font-bold text-black uppercase tracking-wider mb-2 pb-1 border-b border-black">EDUCATION</h2>
                <textarea
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Trường, ngành, năm tốt nghiệp (dự kiến)..."
                  rows={2}
                  className="w-full text-[11px] text-slate-800 leading-relaxed bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none rounded p-1 resize-none placeholder:text-slate-400"
                />
              </section>

              {/* SKILLS */}
              <section className="mb-4">
                <h2 className="text-[11px] font-bold text-black uppercase tracking-wider mb-2 pb-1 border-b border-black">SKILLS</h2>
                <div className="min-h-[2.5rem] flex flex-wrap gap-1.5 items-center text-[11px]">
                  {skills.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {s}
                      <button type="button" onClick={() => setSkills(skills.filter((_, j) => j !== i))} className="hover:opacity-70"><X size={12} /></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Thêm kỹ năng (Enter)"
                    className="flex-1 min-w-[100px] bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-[11px] placeholder:text-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (v && !skills.includes(v)) setSkills([...skills, v]);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && !skills.includes(v)) setSkills([...skills, v]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </section>

              {/* EXPERIENCE */}
              <section className="mb-4">
                <h2 className="text-[11px] font-bold text-black uppercase tracking-wider mb-2 pb-1 border-b border-black">EXPERIENCE</h2>
                <div className="min-h-[2.5rem] flex flex-wrap gap-1.5 items-center text-[11px]">
                  {experience.map((e, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-green-50 text-green-800 border border-green-200">
                      {e}
                      <button type="button" onClick={() => setExperience(experience.filter((_, j) => j !== i))} className="hover:opacity-70"><X size={12} /></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Thêm kinh nghiệm (Enter)"
                    className="flex-1 min-w-[120px] bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-[11px] placeholder:text-slate-400"
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === "Tab") {
                        ev.preventDefault();
                        const v = (ev.target as HTMLInputElement).value.trim();
                        if (v && !experience.includes(v)) setExperience([...experience, v]);
                        (ev.target as HTMLInputElement).value = "";
                      }
                    }}
                    onBlur={(ev) => {
                      const v = ev.target.value.trim();
                      if (v && !experience.includes(v)) setExperience([...experience, v]);
                      ev.target.value = "";
                    }}
                  />
                </div>
              </section>

              {renderProjectsSection()}

              <label className="flex items-center gap-2 mt-4 text-[11px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-3.5 h-3.5 accent-blue-500 rounded" />
                Đặt làm CV mặc định khi ứng tuyển
              </label>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ─── Tạo CV mới theo form: cùng form giữa trang, cấu trúc như CV thực tế ───
  if (!isEdit && tab === "text") {
    return (
      <div className="min-h-screen bg-slate-200/70 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-2 shadow-sm">
            <button type="button" onClick={() => navigate("/student/cv")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft size={18} /> Quay lại
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề CV (tên hiển thị danh sách)"
              className="min-w-[180px] max-w-[240px] px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Tạo CV
            </button>
            <button type="button" onClick={() => setTab("file")} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
              <Upload size={16} /> Tải CV từ file
            </button>
          </header>
          {error && (
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-red-50 text-red-700 text-sm border-b border-red-100">
              <AlertCircle size={18} className="flex-shrink-0" /> {error}
            </div>
          )}
          <div className="flex-1 overflow-auto py-6 px-4 flex justify-center">
            <div className="bg-white shadow-lg rounded-sm p-8 md:p-10 max-w-[210mm] w-full" style={{ fontFamily: previewFont }}>
              <style>{VIEW_CV_STYLE}</style>
              <header className="text-center mb-6 pb-2">
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Họ và tên" className="w-full text-center text-2xl font-bold text-black tracking-wide bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 placeholder:text-slate-400" />
                <input type="text" value={jobPosition} onChange={(e) => setJobPosition(e.target.value)} placeholder="Vị trí / Chức danh" className="w-full text-center text-sm font-semibold text-black tracking-wide mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 placeholder:text-slate-400" />
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-2 text-[11px] text-slate-600">
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại" className="w-28 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-center placeholder:text-slate-400" />
                  <span className="text-slate-400">◇</span>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" className="w-36 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-center placeholder:text-slate-400" />
                  <span className="text-slate-400">◇</span>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Địa chỉ" className="w-28 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-center placeholder:text-slate-400" />
                </div>
                <input type="url" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="LinkedIn: linkedin.com/in/..." className="w-full max-w-md mx-auto mt-1 text-[11px] text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-center placeholder:text-slate-400" />
              </header>
              <section className="mb-4">
                <h2 className="text-[11px] font-bold text-black uppercase tracking-wider mb-2 pb-1 border-b border-black">OBJECTIVE</h2>
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Mục tiêu nghề nghiệp, điểm mạnh..." rows={3} className="w-full text-[11px] text-slate-800 leading-relaxed bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none rounded p-1 resize-none placeholder:text-slate-400" />
              </section>
              <section className="mb-4">
                <h2 className="text-[11px] font-bold text-black uppercase tracking-wider mb-2 pb-1 border-b border-black">EDUCATION</h2>
                <textarea value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Trường, ngành, năm tốt nghiệp (dự kiến)..." rows={2} className="w-full text-[11px] text-slate-800 leading-relaxed bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none rounded p-1 resize-none placeholder:text-slate-400" />
              </section>
              <section className="mb-4">
                <h2 className="text-[11px] font-bold text-black uppercase tracking-wider mb-2 pb-1 border-b border-black">SKILLS</h2>
                <div className="min-h-[2.5rem] flex flex-wrap gap-1.5 items-center text-[11px]">
                  {skills.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {s}
                      <button type="button" onClick={() => setSkills(skills.filter((_, j) => j !== i))} className="hover:opacity-70"><X size={12} /></button>
                    </span>
                  ))}
                  <input type="text" placeholder="+ Thêm kỹ năng (Enter)" className="flex-1 min-w-[100px] bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-[11px] placeholder:text-slate-400"
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); (e.target as HTMLInputElement).value = ""; } }}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); e.target.value = ""; }} />
                </div>
              </section>
              <section className="mb-4">
                <h2 className="text-[11px] font-bold text-black uppercase tracking-wider mb-2 pb-1 border-b border-black">EXPERIENCE</h2>
                <div className="min-h-[2.5rem] flex flex-wrap gap-1.5 items-center text-[11px]">
                  {experience.map((e, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-green-50 text-green-800 border border-green-200">
                      {e}
                      <button type="button" onClick={() => setExperience(experience.filter((_, j) => j !== i))} className="hover:opacity-70"><X size={12} /></button>
                    </span>
                  ))}
                  <input type="text" placeholder="+ Thêm kinh nghiệm (Enter)" className="flex-1 min-w-[120px] bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none py-0.5 text-[11px] placeholder:text-slate-400"
                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === "Tab") { ev.preventDefault(); const v = (ev.target as HTMLInputElement).value.trim(); if (v && !experience.includes(v)) setExperience([...experience, v]); (ev.target as HTMLInputElement).value = ""; } }}
                    onBlur={(ev) => { const v = ev.target.value.trim(); if (v && !experience.includes(v)) setExperience([...experience, v]); ev.target.value = ""; }} />
                </div>
              </section>
              {renderProjectsSection()}
              <label className="flex items-center gap-2 mt-4 text-[11px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-3.5 h-3.5 accent-blue-500 rounded" />
                Đặt làm CV mặc định khi ứng tuyển
              </label>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ─── Tải CV từ file (create only) — layout giống form nhập ở web ───
  return (
    <div className="min-h-screen bg-slate-200/70 flex flex-col">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-2 shadow-sm">
          <button type="button" onClick={() => navigate("/student/cv")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={18} /> Quay lại
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề CV (tên hiển thị danh sách)"
            className="min-w-[180px] max-w-[240px] px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-md">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Tạo CV
          </button>
          <button type="button" onClick={() => setTab("text")} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
            <Upload size={16} /> Điền form như CV
          </button>
        </header>
        {error && (
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-red-50 text-red-700 text-sm border-b border-red-100">
            <AlertCircle size={18} className="flex-shrink-0" /> {error}
          </div>
        )}
        <div className="flex-1 overflow-auto py-8 px-4 flex justify-center">
          <div className="bg-white shadow-lg rounded-lg border border-slate-200 p-8 max-w-[480px] w-full space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Tải CV từ file</h3>
              {renderAnalysisPanel()}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/80"
                  } ${file ? "border-green-300 bg-green-50/50" : ""}`}
              >
                <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${file ? "bg-green-100" : "bg-slate-100"}`}>
                  <Upload size={22} className={file ? "text-green-600" : "text-slate-500"} />
                </div>
                {file ? (
                  <>
                    <p className="text-sm font-semibold text-green-700 flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> {file.name}
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">Nhấp hoặc kéo file khác để thay đổi</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-700">Kéo thả hoặc nhấp để chọn file</p>
                    <p className="text-xs text-slate-500 mt-0.5">PDF, DOC, DOCX — tối đa 10 MB</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg bg-slate-50 border border-slate-200">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4 accent-blue-500 rounded" />
              <span className="text-sm font-medium text-slate-700">Đặt làm CV mặc định khi ứng tuyển</span>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};
