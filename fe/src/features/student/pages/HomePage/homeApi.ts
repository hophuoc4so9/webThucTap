import axiosClient from "@/api/api/clients/axiosClient";
import type { Company } from "@/features/company/types";
import type { Job, JobListResponse } from "../JobsPage/types";

export interface FeaturedCompaniesResponse {
  data: Array<Company & { jobCount?: number }>;
  total: number;
  page: number;
  limit: number;
}

export interface TopMajor {
  name: string;
  jobCount: number;
}

export const homeApi = {
  getFeaturedJobs: async (limit = 6): Promise<JobListResponse> => {
    const res = await axiosClient.get<JobListResponse>("jobs/featured", {
      params: { limit },
    });
    return res.data;
  },

  getFeaturedCompanies: async (
    limit = 8,
  ): Promise<FeaturedCompaniesResponse> => {
    const res = await axiosClient.get<FeaturedCompaniesResponse>(
      "companies/featured",
      { params: { limit } },
    );
    return res.data;
  },

  getTopMajors: async (limit = 8): Promise<TopMajor[]> => {
    const res = await axiosClient.get<TopMajor[]>("jobs/top-majors", {
      params: { limit },
    });
    return res.data;
  },
};
