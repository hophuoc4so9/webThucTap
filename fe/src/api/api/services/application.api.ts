import axiosClient from "../clients/axiosClient";
import type {
  Application,
  ApplicationListResponse,
  ApplicationQuery,
  CreateApplicationDto,
} from "@/features/student/types";

export const applicationApi = {
  /** Nộp đơn ứng tuyển */
  create: async (dto: CreateApplicationDto): Promise<Application> => {
    const res = await axiosClient.post<Application>("applications", dto);
    return res.data;
  },

  /** Lấy danh sách đơn theo query */
  getAll: async (
    query: ApplicationQuery = {},
  ): Promise<ApplicationListResponse> => {
    const res = await axiosClient.get<ApplicationListResponse>("applications", {
      params: query,
    });
    return res.data;
  },

  /** Chi tiết đơn */
  getById: async (id: number): Promise<Application> => {
    const res = await axiosClient.get<Application>(`applications/${id}`);
    return res.data;
  },

  /** Kiểm tra đã ứng tuyển chưa */
  checkApplied: async (
    userId: number,
    jobId: number,
  ): Promise<{ applied: boolean }> => {
    const res = await axiosClient.get<{ applied: boolean }>(
      "applications/check",
      {
        params: { userId, jobId },
      },
    );
    return res.data;
  },

  /** Rút đơn */
  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`applications/${id}`);
  },

  /** Cập nhật trạng thái (dành cho company/admin) */
  updateStatus: async (
    id: number,
    dto: { status: string; note?: string },
  ): Promise<Application> => {
    const res = await axiosClient.patch<Application>(
      `applications/${id}/status`,
      dto,
    );
    return res.data;
  },
};
