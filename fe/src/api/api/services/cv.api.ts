import axiosClient from "../clients/axiosClient";
import type {
  Cv,
  CreateCvDto,
  UpdateCvDto,
  CvListResponse,
  CvSuggestionResponse,
} from "@/features/student/types";

export const cvApi = {
  /** Lấy danh sách CV có phân trang */
  getByUserPaged: async (
    userId: number,
    page = 1,
    limit = 10,
  ): Promise<CvListResponse> => {
    const res = await axiosClient.get<CvListResponse>(`cvs`, {
      params: { userId, page, limit },
    });
    return res.data;
  },

  /** Lấy danh sách CV của user */
  getByUser: async (userId: number): Promise<Cv[]> => {
    const res = await cvApi.getByUserPaged(userId, 1, 100);
    return res.data;
  },

  /** Lấy chi tiết một CV */
  getById: async (id: number): Promise<Cv> => {
    const res = await axiosClient.get<Cv>(`cvs/${id}`);
    return res.data;
  },

  /** Tạo CV dạng text */
  create: async (dto: CreateCvDto): Promise<Cv> => {
    const res = await axiosClient.post<Cv>("cvs", dto);
    return res.data;
  },

  /**
   * Tạo CV kèm file
   * @param file  File PDF/DOC/DOCX
   * @param meta  userId, title?, isDefault?
   */
  uploadFile: async (
    file: File,
    meta: { userId: number; title?: string; isDefault?: boolean },
  ): Promise<Cv> => {
    const form = new FormData();
    form.append("file", file);
    form.append("userId", String(meta.userId));
    if (meta.title) form.append("title", meta.title);
    if (meta.isDefault) form.append("isDefault", "true");
    const res = await axiosClient.post<Cv>("cvs/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /** Cập nhật file CV cho CV đã tồn tại */
  updateFile: async (id: number, file: File): Promise<Cv> => {
    const form = new FormData();
    form.append("file", file);
    const res = await axiosClient.put<Cv>(`cvs/${id}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /** Cập nhật thông tin CV (text). BE trả về bản ghi đã lưu (có updatedAt). */
  update: async (id: number, dto: UpdateCvDto): Promise<Cv> => {
    const res = await axiosClient.put<Cv>(`cvs/${id}`, dto);
    return res.data;
  },

  /** Xoá CV */
  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`cvs/${id}`);
  },

  suggestImprovements: async (
    id: number,
    userId?: number,
  ): Promise<CvSuggestionResponse> => {
    const res = await axiosClient.post<CvSuggestionResponse>(
      `cvs/${id}/suggestions`,
      { userId },
    );
    return res.data;
  },

  previewSuggestions: async (payload: {
    userId: number;
    fullName?: string;
    jobPosition?: string;
    phone?: string;
    contactEmail?: string;
    address?: string;
    linkedIn?: string;
    title?: string;
    summary?: string;
    skills?: string;
    education?: string;
    experience?: string;
    projects?: string;
    source?: "form" | "file";
  }): Promise<CvSuggestionResponse> => {
    const res = await axiosClient.post<CvSuggestionResponse>(
      "cvs/preview-suggestions",
      payload,
    );
    return res.data;
  },
};
