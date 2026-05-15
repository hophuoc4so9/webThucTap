import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { skillAdminApi, type SkillCandidateQuery, type SkillTermType } from "../api/skillAdmin";
import { marketTrendApi } from "@/api/api/services/market-trend.api";
import { Ban, BookOpen, Loader2, Search, Trash2, CheckCircle, PlusCircle, Filter, RefreshCw } from "lucide-react";
import { useMajorGroups, useMajors } from "@/hooks/useMajors";

type ScopeMode = "global" | "majorGroup" | "major";
type TrendSkillRow = { name: string; mentions: number; clusters: number };

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const DictionaryManagerPage = () => {
  const queryClient = useQueryClient();
  const groups = useMajorGroups();
  const majors = useMajors();

  const [scope, setScope] = useState<ScopeMode>("global");
  const [majorGroup, setMajorGroup] = useState("");
  const [major, setMajor] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");
  const [approvingItem, setApprovingItem] = useState<{
    id: number;
    name: string;
    type: SkillTermType;
    category: string;
  } | null>(null);
  const debouncedSearch = useDebounceValue(searchTerm, 300);

  const majorsInGroup = useMemo(() => {
    if (!majorGroup) return majors;
    return majors.filter((item) => item.group === majorGroup);
  }, [majorGroup, majors]);

  const trendQuery = useQuery({
    queryKey: ["market-trends", "skill-manager", scope, majorGroup, major],
    queryFn: () => {
      const params = { days: 90, includeForecast: false, limitClusters: 30 };
      if (scope === "major" && major) return marketTrendApi.getByMajor({ ...params, major });
      if (scope === "majorGroup" && majorGroup) return marketTrendApi.getByMajorGroup({ ...params, majorGroup });
      return marketTrendApi.getOverview(params);
    },
    enabled: scope === "global" || (scope === "majorGroup" && !!majorGroup) || (scope === "major" && !!major),
  });

  // Query lấy dữ liệu từ điển để so khớp trạng thái
  const dictionaryQuery = useQuery({
    queryKey: ["skills", "dictionary-lookup", scope, majorGroup, major],
    queryFn: () => skillAdminApi.getCandidates({
      page: 1,
      limit: 1000,
      majorGroup: scope === "majorGroup" && majorGroup ? majorGroup : undefined,
      major: scope === "major" && major ? major : undefined,
    }),
  });

  const skillInfoMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of dictionaryQuery.data?.items ?? []) {
      map.set(normalizeSkill(item.canonicalName), item);
      map.set(item.normalizedText, item);
    }
    return map;
  }, [dictionaryQuery.data]);

  const trendSkills = useMemo<TrendSkillRow[]>(() => {
    const counts = new Map<string, TrendSkillRow>();
    for (const cluster of trendQuery.data?.clusters ?? []) {
      for (const skill of cluster.topSkills ?? []) {
        const current = counts.get(skill) ?? { name: skill, mentions: 0, clusters: 0 };
        current.mentions += cluster.jobCount;
        current.clusters += 1;
        counts.set(skill, current);
      }
    }

    const needle = debouncedSearch.trim().toLowerCase();
    return Array.from(counts.values())
      .filter((item) => !needle || item.name.toLowerCase().includes(needle))
      .sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name, "vi"));
  }, [debouncedSearch, trendQuery.data]);

  const filteredTrendSkills = useMemo(() => {
    const withInfo = trendSkills.map(s => ({
      ...s,
      info: skillInfoMap.get(normalizeSkill(s.name))
    }));

    if (statusFilter === "approved") return withInfo.filter(s => s.info?.status === "approved");
    if (statusFilter === "pending") return withInfo.filter(s => !s.info || s.info.status === "pending");
    return withInfo;
  }, [trendSkills, skillInfoMap, statusFilter]);

  const stopwordQueryParams: SkillCandidateQuery = {
    page: 1,
    limit: 200,
    status: "stopword",
    majorGroup: scope === "majorGroup" && majorGroup ? majorGroup : undefined,
    major: scope === "major" && major ? major : undefined,
    sortBy: "createdAt",
    sortOrder: "DESC",
  };

  const stopwordQuery = useQuery({
    queryKey: ["skills", "stopwords", stopwordQueryParams, scope],
    queryFn: () => skillAdminApi.getCandidates(stopwordQueryParams),
  });

  const scopedStopwords = useMemo(() => {
    const items = stopwordQuery.data?.items ?? [];
    if (scope === "global") return items.filter((item) => !item.major && !item.majorGroup);
    return items;
  }, [scope, stopwordQuery.data]);

  const approveMutation = useMutation({
    mutationFn: async (data: { id: number; canonicalName: string; type: SkillTermType; category: string }) => {
      return skillAdminApi.approveSkill(data.id, {
        canonicalName: data.canonicalName,
        type: data.type,
        category: data.category || undefined,
        major: major || undefined,
        majorGroup: majorGroup || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setApprovingItem(null);
      trendQuery.refetch();
    }
  });

  const markStopwordMutation = useMutation({
    mutationFn: async (skillName: string) => {
      const normalized = normalizeSkill(skillName);
      const match = skillInfoMap.get(normalized);

      if (!match) {
        throw new Error(`Không tìm thấy "${skillName}" để đánh dấu stopword.`);
      }

      const context =
        scope === "majorGroup" ? majorGroup :
        scope === "major" ? major :
        undefined;
      return skillAdminApi.markStopword(match.id, scope, context);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["market-trends"] });
      trendQuery.refetch();
    },
  });

  const removeStopwordMutation = useMutation({
    mutationFn: (id: number) => skillAdminApi.rejectSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["market-trends"] });
      trendQuery.refetch();
    },
  });

  const changeScope = (nextScope: ScopeMode) => {
    setScope(nextScope);
    if (nextScope === "global") {
      setMajorGroup("");
      setMajor("");
    }
    if (nextScope === "majorGroup") setMajor("");
  };

  const reExtractMutation = useMutation({
    mutationFn: () => skillAdminApi.reExtract({ batchSize: 200 }),
    onSuccess: (data: any) => {
      alert(`Đã quét xong ${data.processed} jobs. Hệ thống sẽ cập nhật lại danh sách kỹ năng mới.`);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      trendQuery.refetch();
    },
  });

  const scopeReady = scope === "global" || (scope === "majorGroup" && majorGroup) || (scope === "major" && major);
  const scopeLabel =
    scope === "global" ? "toàn bộ hệ thống" :
    scope === "majorGroup" ? `nhóm ngành "${majorGroup}"` :
    `ngành "${major}"`;

  const handleOpenApprove = (item: TrendSkillRow) => {
    const info = skillInfoMap.get(normalizeSkill(item.name));
    setApprovingItem({
      id: info?.id ?? 0,
      name: item.name,
      type: info?.type === "unknown" ? "hard" : (info?.type ?? "hard"),
      category: info?.category ?? ""
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Quản lý từ điển kỹ năng
          </h1>
          <p className="text-gray-500 text-sm">
            Phân cụm không giám sát dựa trên xu hướng thực tế. Duyệt kỹ năng mới hoặc loại bỏ rác (stopword).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm("Hệ thống sẽ quét lại toàn bộ 65.000 records để trích xuất kỹ năng mới. Quá trình này mất khoảng vài phút. Bạn chắc chắn muốn tiếp tục?")) {
                reExtractMutation.mutate();
              }
            }}
            disabled={reExtractMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm font-bold transition-all disabled:opacity-50"
          >
            {reExtractMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {reExtractMutation.isPending ? "Hệ thống đang quét..." : "Quét lại toàn bộ data"}
          </button>

          <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm ml-2">
            {(["all", "approved", "pending"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === s
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s === "all" ? "Tất cả" : s === "approved" ? "Trong từ điển" : "Chưa có"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "global", label: "Toàn bộ" },
            { id: "majorGroup", label: "Theo nhóm ngành" },
            { id: "major", label: "Theo ngành" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => changeScope(item.id as ScopeMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                scope === item.id
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:border-indigo-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Tìm kiếm kỹ năng đang xuất hiện..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          {(scope === "majorGroup" || scope === "major") && (
            <select
              value={majorGroup}
              onChange={(event) => {
                setMajorGroup(event.target.value);
                setMajor("");
              }}
              className="w-full lg:w-72 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Chọn nhóm ngành</option>
              {groups.map((group: any) => (
                <option key={group.nhom} value={group.nhom}>{group.nhom}</option>
              ))}
            </select>
          )}

          {scope === "major" && (
            <select
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              className="w-full lg:w-72 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Chọn ngành</option>
              {majorsInGroup.map((item) => (
                <option key={item.code || item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-gray-900">Kỹ năng phát hiện được</h2>
              <p className="text-sm text-gray-500 mt-1">Dữ liệu từ {scopeReady ? scopeLabel : "phạm vi đã chọn"}.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đã duyệt
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Chờ duyệt
              </div>
            </div>
          </div>

          {!scopeReady ? (
            <div className="p-10 text-center text-gray-500">Chọn phạm vi để xem kết quả phân cụm.</div>
          ) : trendQuery.isLoading || dictionaryQuery.isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredTrendSkills.length === 0 ? (
            <div className="p-10 text-center text-gray-500">Không tìm thấy kỹ năng nào khớp bộ lọc.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-sm">
                    <th className="p-4 font-medium">Kỹ năng</th>
                    <th className="p-4 font-medium">Trạng thái</th>
                    <th className="p-4 font-medium">Số cụm</th>
                    <th className="p-4 font-medium">Xu hướng</th>
                    <th className="p-4 font-medium text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTrendSkills.map((item) => {
                    const isApproved = item.info?.status === "approved" || item.info?.status === "alias";
                    return (
                      <tr key={item.name} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-semibold text-gray-900">{item.name}</div>
                          {item.info?.canonicalName && item.info.canonicalName !== item.name && (
                            <div className="text-xs text-gray-400 italic">Alias của: {item.info.canonicalName}</div>
                          )}
                        </td>
                        <td className="p-4">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                              <PlusCircle className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-600">{item.clusters}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
                            {item.mentions}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {!isApproved && (
                              <button
                                onClick={() => handleOpenApprove(item)}
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="Duyệt vào từ điển"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`Đưa "${item.name}" vào stopword cho ${scopeLabel}?`)) {
                                  markStopwordMutation.mutate(item.name);
                                }
                              }}
                              disabled={markStopwordMutation.isPending}
                              className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
                              title="Đánh dấu Stopword"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-fit">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Stopword hiện có</h2>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          {stopwordQuery.isLoading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
            </div>
          ) : scopedStopwords.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Chưa có stopword nào được thiết lập.</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {scopedStopwords.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{item.canonicalName}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{item.major || item.majorGroup || "GLOBAL"}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Khôi phục kỹ năng "${item.canonicalName}"?`)) {
                        removeStopwordMutation.mutate(item.id);
                      }
                    }}
                    disabled={removeStopwordMutation.isPending}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-50 transition-all"
                    title="Xóa khỏi Stopword"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {approvingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="font-bold text-gray-900">Duyệt kỹ năng vào từ điển</h3>
              <button onClick={() => setApprovingItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên chuẩn (Canonical)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={approvingItem.name}
                  onChange={(e) => setApprovingItem({ ...approvingItem, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loại kỹ năng</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={approvingItem.type}
                  onChange={(e) => setApprovingItem({ ...approvingItem, type: e.target.value as SkillTermType })}
                >
                  <option value="hard">Hard Skill (Kỹ thuật/Công nghệ)</option>
                  <option value="soft">Soft Skill (Kỹ năng mềm)</option>
                  <option value="language">Language (Ngoại ngữ)</option>
                  <option value="certificate">Certificate (Chứng chỉ)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chuyên mục (Category)</label>
                <input
                  type="text"
                  placeholder="VD: Frontend, Backend, AI..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={approvingItem.category}
                  onChange={(e) => setApprovingItem({ ...approvingItem, category: e.target.value })}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setApprovingItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Hủy
              </button>
              <button
                onClick={() => approveMutation.mutate({
                  id: approvingItem.id,
                  canonicalName: approvingItem.name,
                  type: approvingItem.type,
                  category: approvingItem.category
                })}
                disabled={approveMutation.isPending}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {approveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Xác nhận Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {(markStopwordMutation.error || approveMutation.error) && (
        <div className="fixed bottom-6 right-6 max-w-sm text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-4 shadow-lg animate-bounce z-[60]">
          Lỗi: {(markStopwordMutation.error as any)?.message || (approveMutation.error as any)?.message}
        </div>
      )}
    </div>
  );
};

function normalizeSkill(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9#+./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
