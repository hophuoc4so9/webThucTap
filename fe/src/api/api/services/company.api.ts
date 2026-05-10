import axiosClient from "../clients/axiosClient";

export interface CompanyItem {
  id: number;
  name: string;
  logo?: string | null;
  industry?: string | null;
  size?: string | null;
  address?: string | null;
  website?: string | null;
  status?: "pending" | "approved" | "rejected";
  phone?: string | null;
  companyEmail?: string | null;
  description?: string | null;
  rejectReason?: string | null;
  ownerId?: number | null;
  businessLicense?: string | null;
  taxCode?: string | null;
  ocrData?: string | null;
  apiData?: string | null;
  verificationMethod?: "auto" | "manual";
  isAutoVerified?: boolean;
  jobCount?: number;
  createdAt?: string;
}

export interface CompanyListResponse {
  data: CompanyItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CompanyMemberItem {
  id: number;
  userId: number;
  companyId: number;
  role: "owner" | "admin" | "member";
  status: "pending" | "approved" | "rejected";
  rejectReason?: string | null;
  createdAt?: string;
  user?: {
    id: number;
    email: string;
    name?: string | null;
  };
}

export const companyApi = {
  /** Lấy danh sách công ty đã APPROVED (public) */
  getAll: async (params?: {
    page?: number;
    limit?: number;
    name?: string;
  }): Promise<CompanyListResponse> => {
    const res = await axiosClient.get<CompanyListResponse>("companies", {
      params,
    });
    return res.data;
  },

  /** Lấy danh sách công ty kèm filter status (admin) */
  getAllAdmin: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    name?: string;
    sortByJobs?: string;
  }): Promise<CompanyListResponse> => {
    const res = await axiosClient.get<CompanyListResponse>("companies/admin", {
      params,
    });
    return res.data;
  },

  getById: async (id: number): Promise<CompanyItem> => {
    const res = await axiosClient.get<CompanyItem>(`companies/${id}`);
    return res.data;
  },

  /**
   * HR tạo công ty mới từ onboarding.
   * Gửi multipart/form-data để upload logo + giấy phép kinh doanh.
   */
  createOnboarding: async (formData: FormData): Promise<CompanyItem> => {
    const res = await axiosClient.post<CompanyItem>(
      "companies/onboarding",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  /** Admin duyệt công ty */
  approve: async (id: number): Promise<CompanyItem> => {
    const res = await axiosClient.put<CompanyItem>(`companies/${id}/approve`);
    return res.data;
  },

  /** Admin từ chối công ty */
  reject: async (id: number, reason?: string): Promise<CompanyItem> => {
    const res = await axiosClient.put<CompanyItem>(`companies/${id}/reject`, {
      reason,
    });
    return res.data;
  },

  /** HR gửi yêu cầu join công ty */
  joinRequest: async (
    companyId: number,
    userId: number,
  ): Promise<CompanyMemberItem> => {
    const res = await axiosClient.post<CompanyMemberItem>(
      `companies/${companyId}/join`,
      { userId },
    );
    return res.data;
  },

  /** Lấy công ty mà user đang là thành viên */
  getMemberCompany: async (userId: number): Promise<CompanyItem | null> => {
    try {
      const res = await axiosClient.get<CompanyItem>(
        `companies/member/${userId}`,
      );
      return res.data;
    } catch {
      return null;
    }
  },

  /** Lấy trạng thái onboarding của user */
  getOnboardingStatus: async (userId: number): Promise<any> => {
    const res = await axiosClient.get<any>(`companies/onboarding/status/${userId}`);
    return res.data;
  },

  /** Lấy join requests của công ty */
  getJoinRequests: async (
    companyId: number,
  ): Promise<CompanyMemberItem[]> => {
    const res = await axiosClient.get<CompanyMemberItem[]>(
      `companies/${companyId}/join-requests`,
    );
    return res.data;
  },

  /** Owner duyệt join request */
  approveJoin: async (memberId: number): Promise<CompanyMemberItem> => {
    const res = await axiosClient.put<CompanyMemberItem>(
      `companies/join/${memberId}/approve`,
    );
    return res.data;
  },

  /** Owner từ chối join request */
  rejectJoin: async (
    memberId: number,
    reason?: string,
  ): Promise<CompanyMemberItem> => {
    const res = await axiosClient.put<CompanyMemberItem>(
      `companies/join/${memberId}/reject`,
      { reason },
    );
    return res.data;
  },

  /** Lấy danh sách thành viên của công ty */
  getMembers: async (companyId: number): Promise<CompanyMemberItem[]> => {
    const res = await axiosClient.get<CompanyMemberItem[]>(
      `companies/${companyId}/members`,
    );
    return res.data;
  },

  /** Cập nhật quyền cho thành viên */
  updateMemberRole: async (
    memberId: number,
    role: "admin" | "member",
  ): Promise<CompanyMemberItem> => {
    const res = await axiosClient.patch<CompanyMemberItem>(
      `companies/members/${memberId}/role`,
      { role },
    );
    return res.data;
  },

  /** Xoá thành viên khỏi công ty */
  removeMember: async (memberId: number): Promise<{ message: string }> => {
    const res = await axiosClient.delete<{ message: string }>(
      `companies/members/${memberId}`,
    );
    return res.data;
  },

  /** Chuyển quyền sở hữu */
  transferOwnership: async (
    companyId: number,
    newOwnerMemberId: number,
  ): Promise<{ message: string }> => {
    const res = await axiosClient.post<{ message: string }>(
      `companies/${companyId}/transfer-ownership`,
      { newOwnerMemberId },
    );
    return res.data;
  },

  /** Phân tích giấy phép (OCR) để điền nhanh form */
  analyzeLicense: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("license", file);
    const res = await axiosClient.post<any>("companies/analyze-license", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /** Lấy danh sách thông báo */
  getNotifications: async (userId?: number): Promise<any[]> => {
    const res = await axiosClient.get<any[]>("companies/notifications", {
      params: { userId },
    });
    return res.data;
  },

  /** Đánh dấu thông báo đã đọc */
  markNotificationRead: async (id: number): Promise<any> => {
    const res = await axiosClient.patch<any>(`companies/notifications/${id}/read`);
    return res.data;
  },
};
