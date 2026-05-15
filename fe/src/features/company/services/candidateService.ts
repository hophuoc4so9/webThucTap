import axiosClient from "@/api/api/clients/axiosClient";

export interface Candidate {
  id: number;
  fullName: string;
  title: string;
  major: string;
  skills: string;
  isTdmuVerified: boolean;
  aiScore: number;
  similarityScore?: number;
  combinedScore?: number;
  matchReason?: string;
}

export interface CandidateSearchResponse {
  data: Candidate[];
  total: number;
  page: number;
  limit: number;
  executionTimeMs?: number;
}

export const candidateService = {
  searchCandidates: async (params: {
    jobId?: number;
    query?: string;
    major?: string;
    skills?: string;
    page?: number;
    limit?: number;
  }): Promise<CandidateSearchResponse> => {
    const res = await axiosClient.get<CandidateSearchResponse>("cvs/search", {
      params,
    });
    return res.data;
  },
};
