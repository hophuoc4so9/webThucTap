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
  careerObjective?: string;
  skills: string[];
  experience: string[];
  education: string[];
  gpa?: string;
  activities: string[];
  awards: string[];
  certifications: string[];
  languages: string[];
  socialLinks: string[];
}

export interface CvParseResponse {
  cvId: number;
  userId: number;
  parsed: ParsedResumeData;
}
