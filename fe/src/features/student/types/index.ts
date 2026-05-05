export interface CvProjectItem {
  name: string;
  role: string;
  description: string;
  technologies: string[];
  startDate?: string;
  endDate?: string;
  link?: string;
}

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
  /** JSON string — array of project objects */
  projects?: string;
  /** JSON string — array of certification strings */
  certifications?: string;
  /** JSON string — array of language strings */
  languages?: string;
  /** JSON string — array of social link strings */
  socialLinks?: string;
  filePath?: string;
  fileOriginalName?: string;
  fileMimeType?: string;
  isDefault: boolean;
  /** 'form' = tạo từ form (sửa đầy đủ), 'file' = chỉ tải file (chỉ sửa tiêu đề/mặc định/file) */
  source?: "form" | "file";
  createdAt: string;
  updatedAt: string;
}

export interface CvListResponse {
  data: Cv[];
  total: number;
  page: number;
  limit: number;
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
  projects?: string;
  certifications?: string;
  languages?: string;
  socialLinks?: string;
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
  projects?: string;
  certifications?: string;
  languages?: string;
  socialLinks?: string;
  isDefault?: boolean;
}

export interface CvParsedData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  skills: string[];
  experience: string[];
  education: string[];
  certifications: string[];
  languages: string[];
  socialLinks: string[];
}

export interface CvParseResponse {
  cvId: number;
  userId: number;
  parsed: CvParsedData;
  cv: Cv;
}

export type AiRecommendation =
  | "use-current-cv"
  | "revise-current-cv"
  | "create-new-cv";

export interface CvImprovementItem {
  section: "summary" | "skills" | "experience" | "projects" | "general";
  issue: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
}

export interface CvSuggestionResponse {
  cvId: number;
  userId: number;
  score: number;
  summary: string;
  strengths: string[];
  improvements: CvImprovementItem[];
  keywordsToAdd: string[];
  recommendation: Exclude<AiRecommendation, "use-current-cv">;
}

export interface ApplicationFitResponse {
  applicationId: number;
  jobId: number;
  cvId?: number;
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  missingKeywords: string[];
  recommendation: AiRecommendation;
  explanation: string;
  actionPlan: string[];
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
  page: number;
  limit: number;
}

export interface ApplicationQuery {
  userId?: number;
  jobId?: number;
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}
