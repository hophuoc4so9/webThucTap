import axiosClient from "@/api/api/clients/axiosClient";

const API_BASE = "/admin";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SkillTermStatus = "pending" | "approved" | "stopword" | "alias" | "rejected";
export type SkillTermType = "hard" | "soft" | "language" | "certificate" | "noise" | "unknown";

export interface SkillTerm {
  id: number;
  rawText: string;
  normalizedText: string;
  canonicalName: string;
  status: SkillTermStatus;
  type: SkillTermType;
  category: string | null;
  major: string | null;
  majorGroup: string | null;
  frequency: number;
  confidenceAvg: number;
  exampleJobIds: number[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCandidateQuery {
  page?: number;
  limit?: number;
  status?: SkillTermStatus;
  type?: SkillTermType;
  majorGroup?: string;
  major?: string;
  category?: string;
  search?: string;
  minFrequency?: number;
  sortBy?: "frequency" | "confidenceAvg" | "createdAt" | "canonicalName";
  sortOrder?: "ASC" | "DESC";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SkillClusterOutput {
  clusterId: number;
  labelSuggested: string;
  terms: { id: number; canonicalName: string; normalizedText: string; frequency: number }[];
  totalFrequency: number;
  majorDistribution: Record<string, number>;
  examples: number[];
  suggestedAction: "approve" | "merge" | "review";
}

export interface BulkActionInput {
  ids: number[];
  action: 'approve' | 'reject' | 'mark_stopword' | 'merge_cluster';
  category?: string;
  type?: SkillTermType;
  targetName?: string;
  major?: string;
  majorGroup?: string;
  stopwordScope?: 'global' | 'majorGroup' | 'major';
  stopwordContext?: string;
}

export interface SkillCluster {
  id: number;
  clusterName: string;
  description?: string;
  scope: 'global' | 'majorGroup' | 'major';
  scopeContext?: string;
  status: 'active' | 'archived' | 'merged';
  skillTerms: { id: number; canonicalName: string; normalizedText: string; frequency: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillClusterInput {
  clusterName: string;
  description?: string;
  scope: 'global' | 'majorGroup' | 'major';
  scopeContext?: string;
  skillTermIds?: number[];
  skillNames?: string[];
}

export interface RenameSkillClusterInput {
  clusterName: string;
  description?: string;
}

export interface MoveSkillToStopwordInput {
  scope: 'global' | 'majorGroup' | 'major';
  scopeContext?: string;
}

export interface RenameSkillTermInput {
  canonicalName: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export const skillAdminApi = {
  getCandidates: async (query: SkillCandidateQuery): Promise<PaginatedResponse<SkillTerm>> => {
    const { data } = await axiosClient.get(`${API_BASE}/skill-candidates`, { params: query });
    return data;
  },

  getPendingClusters: async (filters?: { majorGroup?: string; major?: string; minFrequency?: number }): Promise<SkillClusterOutput[]> => {
    const { data } = await axiosClient.get(`${API_BASE}/skill-candidates/clusters`, { params: filters });
    return data;
  },

  approveSkill: async (id: number, payload: { canonicalName?: string; type?: SkillTermType; category?: string; major?: string; majorGroup?: string }) => {
    const { data } = await axiosClient.patch(`${API_BASE}/skill-terms/${id}/approve`, payload);
    return data;
  },

  markStopword: async (id: number, scope?: 'global' | 'majorGroup' | 'major', scopeContext?: string) => {
    const { data } = await axiosClient.patch(`${API_BASE}/skill-terms/${id}/mark-stopword`, { scope, scopeContext });
    return data;
  },

  rejectSkill: async (id: number) => {
    const { data } = await axiosClient.patch(`${API_BASE}/skill-terms/${id}/reject`);
    return data;
  },

  mergeAlias: async (id: number, targetSkillId: number) => {
    const { data } = await axiosClient.patch(`${API_BASE}/skill-terms/${id}/merge-alias`, { targetSkillId });
    return data;
  },

  bulkAction: async (payload: BulkActionInput) => {
    const { data } = await axiosClient.post(`${API_BASE}/skill-terms/bulk-action`, payload);
    return data;
  },

  // ─── Skill Cluster Management ───────────────────────────────────
  
  createCluster: async (input: CreateSkillClusterInput) => {
    const { data } = await axiosClient.post(`${API_BASE}/skill-clusters`, input);
    return data;
  },

  getManagedClusters: async (filters?: { scope?: 'global' | 'majorGroup' | 'major'; scopeContext?: string; majorGroup?: string; major?: string; minFrequency?: number }): Promise<SkillCluster[]> => {
    const { data } = await axiosClient.get(`${API_BASE}/skill-clusters`, { params: filters });
    return data;
  },

  renameCluster: async (id: number, input: RenameSkillClusterInput) => {
    const { data } = await axiosClient.patch(`${API_BASE}/skill-clusters/${id}/rename`, input);
    return data;
  },

  mergeCluster: async (sourceId: number, targetId: number) => {
    const { data } = await axiosClient.patch(`${API_BASE}/skill-clusters/${sourceId}/merge/${targetId}`);
    return data;
  },

  moveSkillToStopword: async (skillTermId: number, input: MoveSkillToStopwordInput) => {
    const { data } = await axiosClient.patch(`${API_BASE}/skill-terms/${skillTermId}/move-to-stopword`, input);
    return data;
  },

  renameSkillTerm: async (skillTermId: number, input: RenameSkillTermInput) => {
    const { data } = await axiosClient.patch(`${API_BASE}/skill-terms/${skillTermId}/rename`, input);
    return data;
  },
  
  reExtract: async (payload: { batchSize?: number; dryRun?: boolean }) => {
    const { data } = await axiosClient.post(`${API_BASE}/skill-migration/re-extract`, payload);
    return data;
  }
};
