import axiosClient from "../clients/axiosClient";
import type { Cv, CreateCvDto, UpdateCvDto } from "@/features/student/types";

export const cvApi = {
  /** Lấy danh sách CV của user */
  getByUser: async (userId: number): Promise<Cv[]> => {
    const res = await axiosClient.get<Cv[]>(`cvs`, { params: { userId } });
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
};
