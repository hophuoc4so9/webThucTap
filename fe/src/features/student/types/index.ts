/* ── CV ─────────────────────────────────────────────────────── */
export interface Cv {
  id: number;
  userId: number;
  title?: string;
  summary?: string;
  /** JSON string — array of skill strings */
  skills?: string;
  /** JSON string — array of education objects */
  education?: string;
  /** JSON string — array of experience objects */
  experience?: string;
  filePath?: string;
  fileOriginalName?: string;
  fileMimeType?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCvDto {
  userId: number;
  title?: string;
  summary?: string;
  skills?: string;
  education?: string;
  experience?: string;
  isDefault?: boolean;
}

export interface UpdateCvDto {
  title?: string;
  summary?: string;
  skills?: string;
  education?: string;
  experience?: string;
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
