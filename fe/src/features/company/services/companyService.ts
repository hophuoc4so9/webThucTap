import axiosClient from "@/api/api/clients/axiosClient";
import type { CompanyListResponse, Company } from "../types";

export const companyService = {
  getCompanies: async (
    page = 1,
    limit = 20,
    name?: string,
  ): Promise<CompanyListResponse> => {
    const res = await axiosClient.get<CompanyListResponse>("companies", {
      params: {
        page,
        limit,
        ...(name ? { name } : {}),
      },
    });
    return res.data;
  },

  getCompanyById: async (id: string | number): Promise<Company> => {
    const res = await axiosClient.get<Company>(`companies/${id}`);
    return res.data;
  },

  /** Tìm công ty theo tên (exact/partial). Trả về kết quả đầu tiên hoặc null. */
  getCompanyByName: async (name: string): Promise<Company | null> => {
    const res = await axiosClient.get<CompanyListResponse>(
      `companies?name=${encodeURIComponent(name)}&page=1&limit=1`,
    );
    return res.data.data[0] ?? null;
  },
};
