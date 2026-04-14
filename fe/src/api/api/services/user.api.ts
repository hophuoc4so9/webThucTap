import axiosClient from "../clients/axiosClient";

export interface UserItem {
  id: number;
  email: string;
  role: "student" | "company" | "admin";
  name?: string | null;
  recruiterStatus?: "none" | "pending" | "approved" | "rejected";
  companyName?: string | null;
  companyWebsite?: string | null;
}

export interface UserProfile {
  id: number;
  email: string;
  role: "student" | "company" | "admin";
  name?: string | null;
  recruiterStatus?: "none" | "pending" | "approved" | "rejected";
  companyName?: string | null;
  companyWebsite?: string | null;
}

export interface UserListResponse {
  data: UserItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UserStats {
  total: number;
  students: number;
  companies: number;
  admins: number;
}

export interface UserQuery {
  page?: number;
  limit?: number;
  role?: string;
  email?: string;
}

export const userApi = {
  getAll: async (query: UserQuery = {}): Promise<UserListResponse> => {
    const res = await axiosClient.get<UserListResponse>("users", {
      params: query,
    });
    return res.data;
  },

  getStats: async (): Promise<UserStats> => {
    const res = await axiosClient.get<UserStats>("users/stats");
    return res.data;
  },

  updateRole: async (id: number, role: string): Promise<UserItem> => {
    const res = await axiosClient.put<UserItem>(`users/${id}/role`, { role });
    return res.data;
  },

  getById: async (id: number): Promise<UserProfile> => {
    const res = await axiosClient.get<UserProfile>(`users/${id}`);
    return res.data;
  },

  updateProfile: async (id: number, payload: { name?: string }): Promise<UserProfile> => {
    const res = await axiosClient.put<UserProfile>(`users/${id}/profile`, payload);
    return res.data;
  },

  requestRecruiter: async (
    id: number,
    payload: { companyName: string; companyWebsite?: string; note?: string },
  ): Promise<UserProfile> => {
    const res = await axiosClient.post<UserProfile>(`users/${id}/recruiter-request`, payload);
    return res.data;
  },

  approveRecruiter: async (id: number): Promise<UserProfile> => {
    const res = await axiosClient.put<UserProfile>(`users/${id}/recruiter-approve`);
    return res.data;
  },

  rejectRecruiter: async (id: number, reason?: string): Promise<UserProfile> => {
    const res = await axiosClient.put<UserProfile>(`users/${id}/recruiter-reject`, { reason });
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`users/${id}`);
  },
};
