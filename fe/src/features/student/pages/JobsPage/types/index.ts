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
  companyId?: number | null;
  viewsCount?: number;
  applyCount?: number;
  popularityScore?: number;
  indexedAt?: string | null;
  similarityScore?: number;
  combinedScore?: number;
  reason?: string;
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

export type JobSortBy =
  | "ai_relevance"
  | "score_desc"
  | "salary_desc"
  | "salary_asc"
  | "popular"
  | "latest_indexed";

export interface AdvancedJobQuery {
  query: string;
  location?: string;
  industry?: string;
  src?: string;
  salaryMin?: number;
  salaryMax?: number;
  page?: number;
  limit?: number;
  weights?: {
    contentSim?: number;
    popularity?: number;
    companyBoost?: number;
  };
}

export interface JobRecommendQuery {
  userId?: number;
  cvId?: number;
  topK?: number;
  weights?: {
    contentSim?: number;
    collaborative?: number;
    popularity?: number;
    companyBoost?: number;
  };
}

export interface JobRecommendationResponse {
  data: Job[];
  executionTimeMs?: number;
  explanation?: string;
}
