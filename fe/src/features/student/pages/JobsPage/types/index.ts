import type { Company } from "@/features/company/types";

export interface Job {
  id: number;
  crawlId?: string;
  title: string;
  company?: string;
  location?: string;
  salary?: string;
  salaryMin?: string;
  salaryMax?: string;
  deadline?: string;
  description?: string;
  requirement?: string;
  benefit?: string;
  experience?: string;
  degree?: string;
  age?: string;
  field?: string;
  industry?: string;
  otherInfo?: string;
  url?: string;
  src: string;
  tagsBenefit?: string;
  tagsRequirement?: string;
  provinceIds?: string;
  vacancies?: number;
  jobType?: string;
  companyRef?: Company;
}

export interface JobListResponse {
  data: Job[];
  total: number;
  page: number;
  limit: number;
}

export interface JobQuery {
  keyword?: string;
  location?: string;
  industry?: string;
  src?: string;
  salaryMin?: number;
  salaryMax?: number;
  page?: number;
  limit?: number;
}
