import axiosClient from "../clients/axiosClient";

export interface MarketTrendParams {
  major?: string;
  majorGroup?: string;
  days?: number;
  horizon?: number;
  limitClusters?: number;
  includeForecast?: boolean;
}

export interface MarketTrendResponse {
  generatedAt: string;
  period: { start: string; end: string; days: number };
  major: { name: string; group: string | null } | null;
  clusters: {
    id: string;
    label: string;
    jobCount: number;
    topSkills: string[];
    series: { date: string; value: number }[];
    forecast: { ds: string; yhat: number; yhat_lower: number; yhat_upper: number }[];
    rank: number;
  }[];
  topMajors: {
    major: string;
    group: string;
    code: string;
    total: number;
    recent: number;
    previous: number;
    trendScore: number;
    direction: "up" | "down" | "flat";
  }[];
}

export const marketTrendApi = {
  getOverview: async (params?: MarketTrendParams) => {
    const res = await axiosClient.get<{ data: MarketTrendResponse; success: boolean }>("/market-trends/overview", {
      params,
    });
    return res.data?.data ?? res.data;
  },

  getByMajor: async (params: MarketTrendParams & { major: string }) => {
    const res = await axiosClient.get<{ data: MarketTrendResponse; success: boolean }>("/market-trends/by-major", {
      params,
    });
    return res.data?.data ?? res.data;
  },

  getByMajorGroup: async (params: MarketTrendParams & { majorGroup: string }) => {
    const res = await axiosClient.get<{ data: MarketTrendResponse; success: boolean }>("/market-trends/by-major-group", {
      params,
    });
    return res.data?.data ?? res.data;
  },
};
