import { useState } from "react";
import { MarketTrendDashboard } from "@/components/MarketTrend/MarketTrendDashboard";
import { MajorGroupFilter } from "@/components/MarketTrend/MajorGroupFilter";
import { MajorFilter } from "@/components/MarketTrend/MajorFilter";
import { useMarketTrendOverview, useMarketTrendByMajor, useMarketTrendByMajorGroup } from "@/api/api/hooks/useMarketTrend";
import type { MarketTrendResponse } from "@/api/api/services/market-trend.api";
import { Calendar, AlertCircle } from "lucide-react";

export function StudentMarketTrendPage() {
  const [days, setDays] = useState(90);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Overall trends (no user-specific data needed)
  const overviewQuery = useMarketTrendOverview({
    days,
    includeForecast: true,
  });

  // By major group
  const groupTrendQuery = useMarketTrendByMajorGroup({
    majorGroup: selectedGroup || "",
    days,
    includeForecast: true,
  });

  // By individual major
  const majorTrendQuery = useMarketTrendByMajor({
    major: selectedMajor || "",
    days,
    includeForecast: true,
  });

  let isLoading = overviewQuery.isLoading;
  let error = overviewQuery.error;
  let data = overviewQuery.data;
  let title = "Xu hướng thị trường toàn bộ";

  if (selectedGroup) {
    isLoading = groupTrendQuery.isLoading;
    error = groupTrendQuery.error;
    data = groupTrendQuery.data;
    title = `Xu hướng nhóm: ${selectedGroup}`;
  } else if (selectedMajor) {
    isLoading = majorTrendQuery.isLoading;
    error = majorTrendQuery.error;
    data = majorTrendQuery.data;
    title = `Xu hướng ngành: ${selectedMajor}`;
  }

  const handleReset = () => {
    setSelectedMajor(null);
    setSelectedGroup(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Xu Hướng Thị Trường Việc Làm</h1>
          <p className="text-sm text-gray-500 mt-0.5">Phân tích xu hướng tuyển dụng theo ngành học và nhóm ngành</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        {/* Major Group Filter */}
        <div className="flex-1 sm:flex-none">
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Theo nhóm ngành</label>
          <MajorGroupFilter
            onGroupSelect={(group) => {
              setSelectedGroup(group);
              if (group) setSelectedMajor(null);
            }}
            selectedGroup={selectedGroup}
          />
        </div>

        {/* Major Filter */}
        <div className="flex-1 sm:flex-none">
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Theo ngành học cụ thể</label>
          <MajorFilter
            onMajorSelect={(major) => {
              setSelectedMajor(major);
              if (major) setSelectedGroup(null);
            }}
            selectedMajor={selectedMajor}
          />
        </div>

        {/* Days Filter */}
        <div className="flex-1 sm:flex-none">
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Khoảng thời gian</label>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200 shrink-0 h-full">
            <Calendar size={16} className="text-gray-500" />
            <select
              className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer flex-1"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={30}>30 ngày</option>
              <option value={90}>3 tháng</option>
              <option value={180}>6 tháng</option>
            </select>
          </div>
        </div>

        {/* Reset Button */}
        {(selectedMajor || selectedGroup) && (
          <div className="flex items-end">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {error ? (
        <div className="bg-white rounded-2xl border border-red-100 p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Không thể tải dữ liệu</h3>
          <p className="text-gray-500 max-w-md mb-6">
            {error instanceof Error ? error.message : "Không thể tải dữ liệu xu hướng thị trường."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Tải lại trang
          </button>
        </div>
      ) : (
        <MarketTrendDashboard
          data={data as MarketTrendResponse}
          isLoading={isLoading}
          title={title}
        />
      )}
    </div>
  );
}
