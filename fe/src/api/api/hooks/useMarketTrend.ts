import { useQuery, useQueryClient } from "@tanstack/react-query";
import { marketTrendApi } from "../services/market-trend.api";
import type { MarketTrendParams } from "../services/market-trend.api";

const MARKET_TREND_QUERY_KEY = "market-trends";

export function useMarketTrendOverview(params?: MarketTrendParams) {
  return useQuery({
    queryKey: [MARKET_TREND_QUERY_KEY, "overview", params],
    queryFn: () => marketTrendApi.getOverview(params),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
}

export function useMarketTrendByMajor(params: MarketTrendParams & { major: string }) {
  return useQuery({
    queryKey: [MARKET_TREND_QUERY_KEY, "by-major", params],
    queryFn: () => marketTrendApi.getByMajor(params),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    enabled: !!params.major && params.major.length > 0,
  });
}

export function useMarketTrendByMajorGroup(params: MarketTrendParams & { majorGroup: string }) {
  return useQuery({
    queryKey: [MARKET_TREND_QUERY_KEY, "by-major-group", params],
    queryFn: () => marketTrendApi.getByMajorGroup(params),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    enabled: !!params.majorGroup && params.majorGroup.length > 0,
  });
}

export function useInvalidateMarketTrend() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [MARKET_TREND_QUERY_KEY] });
}
