import axiosClient from "../clients/axiosClient";

export interface UserItem {
  id: number;
  email: string;
  role: "student" | "company" | "admin";
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

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`users/${id}`);
  },
};
