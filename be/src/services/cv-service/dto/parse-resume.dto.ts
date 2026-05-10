export interface ParsedResumeData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  studentId?: string;
  class?: string;
  academicYear?: string;
  birthday?: string;
  gender?: string;
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
  parsed: ParsedResumeData;
}
