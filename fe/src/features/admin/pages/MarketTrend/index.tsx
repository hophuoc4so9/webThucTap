import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MarketTrendDashboard } from "@/components/MarketTrend/MarketTrendDashboard";
import { MajorGroupFilter } from "@/components/MarketTrend/MajorGroupFilter";
import { MajorFilter } from "@/components/MarketTrend/MajorFilter";
import { useMarketTrendOverview, useMarketTrendByMajor, useMarketTrendByMajorGroup, useInvalidateMarketTrend } from "@/api/api/hooks/useMarketTrend";
import type { MarketTrendResponse } from "@/api/api/services/market-trend.api";
import { skillAdminApi, type SkillCluster } from "@/features/admin/api/skillAdmin";
import { Calendar, AlertCircle, RotateCw, Layers, Save } from "lucide-react";

export function AdminMarketTrendPage() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(90);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clusterNames, setClusterNames] = useState<Record<number, string>>({});
  const [trendClusterNames, setTrendClusterNames] = useState<Record<string, string>>({});
  const invalidateMarketTrend = useInvalidateMarketTrend();

  const overviewQuery = useMarketTrendOverview({
    days,
    includeForecast: true,
  });

  const groupTrendQuery = useMarketTrendByMajorGroup({
    majorGroup: selectedGroup || "",
    days,
    includeForecast: true,
  });

  const majorTrendQuery = useMarketTrendByMajor({
    major: selectedMajor || "",
    days,
    includeForecast: true,
  });

  const managedClusterQuery = useQuery({
    queryKey: ["skills", "managed-clusters", selectedGroup, selectedMajor],
    queryFn: () => skillAdminApi.getManagedClusters({
      majorGroup: selectedGroup || undefined,
      major: selectedMajor || undefined,
    }),
  });

  const renameClusterMutation = useMutation({
    mutationFn: ({ cluster, clusterName }: { cluster: SkillCluster; clusterName: string }) =>
      skillAdminApi.renameCluster(cluster.id, {
        clusterName,
        description: cluster.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      invalidateMarketTrend();
      overviewQuery.refetch();
      if (selectedGroup) groupTrendQuery.refetch();
      if (selectedMajor) majorTrendQuery.refetch();
    },
  });

  const createClusterMutation = useMutation({
    mutationFn: (cluster: MarketTrendResponse["clusters"][number]) => {
      const clusterName = (trendClusterNames[cluster.id] ?? cluster.label).trim();
      return skillAdminApi.createCluster({
        clusterName,
        scope: selectedMajor ? "major" : selectedGroup ? "majorGroup" : "global",
        scopeContext: selectedMajor ?? selectedGroup ?? undefined,
        skillNames: cluster.topSkills,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      invalidateMarketTrend();
      overviewQuery.refetch();
      if (selectedGroup) groupTrendQuery.refetch();
      if (selectedMajor) majorTrendQuery.refetch();
    },
  });

  let isLoading = overviewQuery.isLoading;
  let error = overviewQuery.error;
  let data = overviewQuery.data;
  let title = "Tổng quan thị trường toàn bộ";

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      invalidateMarketTrend();
      // Let queries refetch automatically
      await Promise.all([
        overviewQuery.refetch(),
        selectedGroup ? groupTrendQuery.refetch() : Promise.resolve(),
        selectedMajor ? majorTrendQuery.refetch() : Promise.resolve(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Xu Hướng Thị Trường Tuyển Dụng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Phân tích chi tiết thị trường theo ngành học và nhóm ngành</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Tải lại dữ liệu"
        >
          <RotateCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          Tải lại
        </button>
      </div>

      {/* Filters */}
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
              disabled={isLoading}
            >
              <option value={30}>30 ngày</option>
              <option value={90}>3 tháng</option>
              <option value={180}>6 tháng</option>
              <option value={365}>1 năm</option>
            </select>
          </div>
        </div>

        {/* Reset Button */}
        {(selectedMajor || selectedGroup) && (
          <div className="flex items-end">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Dashboard or Error */}
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
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isRefreshing ? "Đang tải..." : "Thử lại"}
          </button>
        </div>
      ) : (
        <>
          <MarketTrendDashboard
            data={data as MarketTrendResponse}
            isLoading={isLoading}
            title={title}
          />
          <NamedClusterManager
            clusters={managedClusterQuery.data ?? []}
            isLoading={managedClusterQuery.isLoading}
            editedNames={clusterNames}
            onNameChange={(id, value) => setClusterNames((prev) => ({ ...prev, [id]: value }))}
            onSave={(cluster) => {
              const nextName = (clusterNames[cluster.id] ?? cluster.clusterName).trim();
              if (!nextName || nextName === cluster.clusterName) return;
              renameClusterMutation.mutate({ cluster, clusterName: nextName });
            }}
            isSaving={renameClusterMutation.isPending}
          />
          <TrendClusterNaming
            clusters={(data as MarketTrendResponse | undefined)?.clusters ?? []}
            editedNames={trendClusterNames}
            onNameChange={(id, value) => setTrendClusterNames((prev) => ({ ...prev, [id]: value }))}
            onCreate={(cluster) => createClusterMutation.mutate(cluster)}
            isSaving={createClusterMutation.isPending}
          />
        </>
      )}
    </div>
  );
}

function TrendClusterNaming({
  clusters,
  editedNames,
  onNameChange,
  onCreate,
  isSaving,
}: {
  clusters: MarketTrendResponse["clusters"];
  editedNames: Record<string, string>;
  onNameChange: (id: string, value: string) => void;
  onCreate: (cluster: MarketTrendResponse["clusters"][number]) => void;
  isSaving: boolean;
}) {
  const topClusters = clusters.slice(0, 8);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-600" />
          Đặt tên cụm đang hiển thị
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Nhập tên dễ hiểu cho từng cụm market trend. Sau khi lưu, admin và sinh viên sẽ thấy tên này thay cho nhãn tự sinh.
        </p>
      </div>

      {topClusters.length === 0 ? (
        <div className="text-sm text-gray-500 py-6 border border-dashed border-gray-200 rounded-lg text-center">
          Chưa có cụm xu hướng để đặt tên.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {topClusters.map((cluster) => (
            <div key={cluster.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex gap-2">
                <input
                  value={editedNames[cluster.id] ?? cluster.label}
                  onChange={(event) => onNameChange(cluster.id, event.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={() => onCreate(cluster)}
                  disabled={isSaving || cluster.topSkills.length === 0}
                  className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lưu tên
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{cluster.jobCount} vị trí</span>
                <span>{cluster.topSkills.length} kỹ năng</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cluster.topSkills.slice(0, 10).map((skill) => (
                  <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NamedClusterManager({
  clusters,
  isLoading,
  editedNames,
  onNameChange,
  onSave,
  isSaving,
}: {
  clusters: SkillCluster[];
  isLoading: boolean;
  editedNames: Record<number, string>;
  onNameChange: (id: number, value: string) => void;
  onSave: (cluster: SkillCluster) => void;
  isSaving: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Cụm kỹ năng đã đặt tên
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Đổi tên cụm tại đây để nhãn cụm trong xu hướng thị trường cập nhật theo cache mới.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500 py-6">Đang tải cụm kỹ năng...</div>
      ) : clusters.length === 0 ? (
        <div className="text-sm text-gray-500 py-6 border border-dashed border-gray-200 rounded-lg text-center">
          Chưa có cụm kỹ năng đã đặt tên cho phạm vi đang chọn.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {clusters.map((cluster) => {
            const value = editedNames[cluster.id] ?? cluster.clusterName;
            const changed = value.trim() !== cluster.clusterName;
            return (
              <div key={cluster.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <input
                    value={value}
                    onChange={(event) => onNameChange(cluster.id, event.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => onSave(cluster)}
                    disabled={!changed || isSaving}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    Lưu
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(cluster.skillTerms ?? []).slice(0, 8).map((term) => (
                    <span key={term.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {term.canonicalName}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
