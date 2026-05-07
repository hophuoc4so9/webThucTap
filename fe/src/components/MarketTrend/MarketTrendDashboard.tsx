import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { TrendingUp, AlertCircle, Briefcase, Lightbulb } from "lucide-react";
import { MarketTrendSkeleton } from "./MarketTrendSkeleton";
import type { MarketTrendResponse } from "@/api/api/services/market-trend.api";

interface MarketTrendDashboardProps {
  data: MarketTrendResponse;
  isLoading: boolean;
  title?: string;
}

export function MarketTrendDashboard({ data, isLoading, title = "Phân Tích Xu Hướng Thị Trường" }: MarketTrendDashboardProps) {
  const [activeClusterIndex, setActiveClusterIndex] = useState<number>(0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <MarketTrendSkeleton />
      </div>
    );
  }

  if (!data || !data.clusters || data.clusters.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center justify-center h-64 shadow-sm">
        <AlertCircle className="text-gray-400 mb-3" size={32} />
        <p className="text-gray-500 font-medium">Chưa có đủ dữ liệu để phân tích xu hướng trong khoảng thời gian này.</p>
      </div>
    );
  }

  const activeCluster = data.clusters[activeClusterIndex];

  const formatChartData = () => {
    if (!activeCluster) return [];

    const combinedMap = new Map<string, any>();

    activeCluster.series.forEach(item => {
      combinedMap.set(item.date, {
        date: item.date,
        historical: item.value,
        forecast: null,
        lower: null,
        upper: null
      });
    });

    activeCluster.forecast.forEach(item => {
      if (combinedMap.has(item.ds)) {
        const existing = combinedMap.get(item.ds);
        existing.forecast = Math.round(Math.max(0, item.yhat));
        existing.lower = Math.round(Math.max(0, item.yhat_lower));
        existing.upper = Math.round(Math.max(0, item.yhat_upper));
      } else {
        combinedMap.set(item.ds, {
          date: item.ds,
          historical: null,
          forecast: Math.round(Math.max(0, item.yhat)),
          lower: Math.round(Math.max(0, item.yhat_lower)),
          upper: Math.round(Math.max(0, item.yhat_upper))
        });
      }
    });

    return Array.from(combinedMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const chartData = formatChartData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            {title}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {data.major ? `Ngành: ${data.major.name}` : "Tất cả ngành nghề"} • {data.period.days} ngày qua • Cập nhật: {new Date(data.generatedAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      {/* Top Majors Section */}
      {data.topMajors && data.topMajors.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Briefcase size={18} className="text-orange-500" /> Top Ngành Tuyển Dụng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.topMajors.map((major, idx) => (
              <div
                key={`${major.major}-${idx}`}
                className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-25 border border-gray-150 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col flex-1 min-w-0 pr-2">
                  <span className="font-medium text-gray-800 truncate text-sm" title={major.major}>
                    {major.major}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">
                    {major.total} tin {major.recent > 0 && `• +${major.recent} tuần này`}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                    major.direction === 'up'
                      ? 'text-green-700 bg-green-100'
                      : major.direction === 'down'
                        ? 'text-red-700 bg-red-100'
                        : 'text-gray-700 bg-gray-100'
                  }`}
                >
                  {major.direction === 'up' && '↑'}
                  {major.direction === 'down' && '↓'}
                  {major.direction === 'flat' && '→'}
                  {(major.trendScore * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Clusters list */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Lightbulb size={18} className="text-yellow-500" /> Phân nhóm Kỹ năng ({data.clusters.length})
          </h3>
          <div className="flex flex-col gap-2.5 max-h-[520px] overflow-y-auto pr-1">
            {data.clusters.map((cluster, idx) => (
              <button
                key={cluster.id}
                onClick={() => setActiveClusterIndex(idx)}
                className={`text-left p-3.5 rounded-xl border-2 transition-all duration-150 ${
                  activeClusterIndex === idx
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h4 className="font-semibold text-gray-800 capitalize text-sm leading-tight flex-1">
                    {cluster.label}
                  </h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0 ${
                    activeClusterIndex === idx
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {cluster.jobCount}
                  </span>
                </div>

                {/* ✅ Hiển thị toàn bộ kỹ năng, không giới hạn */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cluster.topSkills.length > 0 ? (
                    cluster.topSkills.map(skill => (
                      <span
                        key={skill}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          activeClusterIndex === idx
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                        title={skill}
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs px-2 py-1 text-gray-400 italic">
                      (chỉ có yêu cầu chung)
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Chart & Forecast */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-5">
          <div>
            <h3 className="font-semibold text-gray-800 text-base">
              Xu hướng nhóm: <span className="text-blue-600 capitalize">{activeCluster?.label}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {activeCluster?.jobCount} vị trí tuyển dụng • Biểu đồ tuyển dụng thực tế và dự báo tương lai (Prophet Forecast)
            </p>
          </div>

          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    stroke="#9ca3af"
                    fontSize={12}
                    tickMargin={10}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: '#ffffff',
                    }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString('vi-VN')}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="#fef3c7" name="Vùng dự báo" isAnimationActive={false} />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" isAnimationActive={false} legendType="none" />
                  <Area type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHistorical)" name="Thực tế" activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" fill="none" name="Dự báo" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">Không có dữ liệu để hiển thị</p>
            </div>
          )}

          {/* ✅ Section toàn bộ kỹ năng trong panel phải */}
          {activeCluster?.topSkills && activeCluster.topSkills.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Toàn bộ kỹ năng — {activeCluster.topSkills.length} kỹ năng
              </p>
              <div className="flex flex-wrap gap-2">
                {activeCluster.topSkills.map(skill => (
                  <span
                    key={skill}
                    className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}