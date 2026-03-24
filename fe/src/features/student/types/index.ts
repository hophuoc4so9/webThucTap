/* ── CV ─────────────────────────────────────────────────────── */
export interface Cv {
  id: number;
  userId: number;
  fullName?: string;
  jobPosition?: string;
  phone?: string;
  contactEmail?: string;
  address?: string;
  linkedIn?: string;
  title?: string;
  summary?: string;
  /** JSON string — array of skill strings */
  skills?: string;
  /** Học vấn */
  education?: string;
  /** JSON string — array of experience tag strings */
  experience?: string;
  /** Kinh nghiệm dự án — đoạn văn */
  projectExperience?: string;
  filePath?: string;
  fileOriginalName?: string;
  fileMimeType?: string;
  isDefault: boolean;
  /** 'form' = tạo từ form (sửa đầy đủ), 'file' = chỉ tải file (chỉ sửa tiêu đề/mặc định/file) */
  source?: "form" | "file";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCvDto {
  userId: number;
  fullName?: string;
  jobPosition?: string;
  phone?: string;
  contactEmail?: string;
  address?: string;
  linkedIn?: string;
  title?: string;
  summary?: string;
  skills?: string;
  education?: string;
  experience?: string;
  projectExperience?: string;
  isDefault?: boolean;
}

export interface UpdateCvDto {
  fullName?: string;
  jobPosition?: string;
  phone?: string;
  contactEmail?: string;
  address?: string;
  linkedIn?: string;
  title?: string;
  summary?: string;
  skills?: string;
  education?: string;
  experience?: string;
  projectExperience?: string;
  isDefault?: boolean;
}

/* ── Application ────────────────────────────────────────────── */
export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected";

export interface Application {
  id: number;
  userId: number;
  jobId: number;
  jobTitle?: string;
  companyName?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  note?: string;
  cvId?: number;
  cv?: Cv;
  appliedAt: string;
  updatedAt: string;
}

export interface CreateApplicationDto {
  userId: number;
  jobId: number;
  jobTitle?: string;
  companyName?: string;
  cvId?: number;
  coverLetter?: string;
}

export interface ApplicationListResponse {
  data: Application[];
  total: number;
}

export interface ApplicationQuery {
  userId?: number;
  jobId?: number;
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}
