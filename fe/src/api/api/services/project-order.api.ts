import axiosClient from "../clients/axiosClient";

export interface ProjectOrder {
  id: number;
  companyId: number;
  companyName: string;
  title: string;
  description?: string;
  requirements?: string;
  budget?: string;
  deadline?: string;
  techStack?: string; // JSON string[]
  maxStudents: number;
  status: "open" | "in_progress" | "closed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  applications?: ProjectApplication[];
}

export interface ProjectApplication {
  id: number;
  projectId: number;
  userId: number;
  studentName: string;
  studentEmail: string;
  note?: string;
  status: "pending" | "reviewing" | "accepted" | "rejected";
  appliedAt: string;
  updatedAt: string;
  project?: ProjectOrder;
}

export interface ProjectOrderListResponse {
  data: ProjectOrder[];
  total: number;
}

export const projectOrderApi = {
  /** Lấy danh sách dự án (có filter) */
  findAll: async (params?: {
    status?: string;
    companyId?: number;
    page?: number;
    limit?: number;
  }): Promise<ProjectOrderListResponse> => {
    const res = await axiosClient.get<ProjectOrderListResponse>(
      "project-orders",
      { params }
    );
    return res.data;
  },

  /** Chi tiết một dự án */
  findOne: async (id: number): Promise<ProjectOrder> => {
    const res = await axiosClient.get<ProjectOrder>(`project-orders/${id}`);
    return res.data;
  },

  /** Tạo dự án mới (company) */
  create: async (dto: Partial<ProjectOrder>): Promise<ProjectOrder> => {
    const res = await axiosClient.post<ProjectOrder>("project-orders", dto);
    return res.data;
  },

  /** Cập nhật dự án (company) */
  update: async (
    id: number,
    dto: Partial<ProjectOrder>
  ): Promise<ProjectOrder> => {
    const res = await axiosClient.put<ProjectOrder>(
      `project-orders/${id}`,
      dto
    );
    return res.data;
  },

  /** Xoá dự án (company) */
  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`project-orders/${id}`);
  },

  /** Ứng tuyển vào dự án (student) */
  apply: async (
    projectId: number,
    payload: {
      userId: number;
      studentName: string;
      studentEmail: string;
      note?: string;
    }
  ): Promise<ProjectApplication> => {
    const res = await axiosClient.post<ProjectApplication>(
      `project-orders/${projectId}/apply`,
      payload
    );
    return res.data;
  },

  /** Lấy danh sách ứng viên của một dự án (company) */
  getApplications: async (
    projectId: number
  ): Promise<ProjectApplication[]> => {
    const res = await axiosClient.get<ProjectApplication[]>(
      `project-orders/${projectId}/applications`
    );
    return res.data;
  },

  /** Cập nhật trạng thái ứng viên (company) */
  updateApplicationStatus: async (
    appId: number,
    status: string
  ): Promise<ProjectApplication> => {
    const res = await axiosClient.patch<ProjectApplication>(
      `project-orders/applications/${appId}/status`,
      { status }
    );
    return res.data;
  },

  /** Lấy các dự án student đã ứng tuyển */
  getStudentApplications: async (
    userId: number
  ): Promise<ProjectApplication[]> => {
    const res = await axiosClient.get<ProjectApplication[]>(
      "project-orders/student/my-applications",
      { params: { userId } }
    );
    return res.data;
  },
};
