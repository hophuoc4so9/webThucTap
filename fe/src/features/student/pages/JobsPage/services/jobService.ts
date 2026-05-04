import axiosClient from "@/api/api/clients/axiosClient";
import type { ApplicationFitResponse } from "@/features/student/types";
import type {
  JobListResponse,
  JobQuery,
  Job,
  AdvancedJobQuery,
  JobRecommendationResponse,
  JobRecommendQuery,
} from "../types";

export const jobService = {
  getJobs: async (query: JobQuery = {}): Promise<JobListResponse> => {
    const params = new URLSearchParams();
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.location) params.set("location", query.location);
    if (query.industry) params.set("industry", query.industry);
    if (query.src) params.set("src", query.src);
    if (query.salaryMin != null)
      params.set("salaryMin", String(query.salaryMin));
    if (query.salaryMax != null)
      params.set("salaryMax", String(query.salaryMax));
    params.set("page", String(query.page ?? 1));
    params.set("limit", String(query.limit ?? 20));
    const res = await axiosClient.get<JobListResponse>(
      `jobs?${params.toString()}`,
    );
    return res.data;
  },

  searchAdvanced: async (query: AdvancedJobQuery): Promise<JobListResponse> => {
    const res = await axiosClient.post<JobListResponse>("jobs/search-advanced", query);
    return res.data;
  },

  getRecommendations: async (
    currentJobId: number,
    payload: JobRecommendQuery,
  ): Promise<JobRecommendationResponse> => {
    const res = await axiosClient.post<JobRecommendationResponse>(
      `jobs/${currentJobId}/recommend`,
      payload,
    );
    return res.data;
  },

  // Thêm hàm lấy gợi ý cá nhân hoá dựa trên User ID
  getPersonalizedRecommendations: async (
    payload: { userId: number; topK?: number }
  ): Promise<JobRecommendationResponse> => {
    const res = await axiosClient.post<JobRecommendationResponse>(
      `jobs/recommendations/personalized`,
      payload
    );
    return res.data;
  },

  // Thêm hàm gửi tracking tương tác (View, Click, Apply...) về backend
  trackInteraction: async (
    payload: { userId: number; jobId: number; type: 'VIEW' | 'CLICK' | 'APPLY' | 'SAVE' }
  ): Promise<void> => {
    await axiosClient.post(`jobs/interactions`, payload);
  },

  getJobById: async (id: string | number): Promise<Job> => {
    const res = await axiosClient.get<Job>(`jobs/${id}`);
    return res.data;
  },

  createJob: async (dto: Partial<Job>): Promise<Job> => {
    const res = await axiosClient.post<Job>("jobs", dto);
    return res.data;
  },

  deleteJob: async (id: string | number): Promise<void> => {
    await axiosClient.delete(`jobs/${id}`);
  },

  updateJob: async (id: string | number, dto: Partial<Job>): Promise<Job> => {
    const res = await axiosClient.put<Job>(`jobs/${id}`, dto);
    return res.data;
  },

  fitCheck: async (
    id: string | number,
    payload: { cvId: number; userId?: number },
  ): Promise<ApplicationFitResponse> => {
    const res = await axiosClient.post<ApplicationFitResponse>(
      `jobs/${id}/fit-check`,
      payload,
    );
    return res.data;
  },
};