import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillAdminApi, type SkillCandidateQuery } from '../api/skillAdmin';
import { StatusBadge } from '../components/SkillBadges';
import { Search, Loader2, Ban, Trash2, Plus } from 'lucide-react';
import { useMajorGroups } from '@/hooks/useMajors';

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const StopwordManagerPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounceValue(searchTerm, 500);
  const [page, setPage] = useState(1);
  const [majorGroup, setMajorGroup] = useState('');
  const [stopwordScope, setStopwordScope] = useState<'global' | 'majorGroup' | 'major'>('global');
  const groups = useMajorGroups();

  const queryParams: SkillCandidateQuery = {
    page,
    limit: 50,
    status: 'stopword',
    search: debouncedSearch || undefined,
    majorGroup: stopwordScope === 'majorGroup' && majorGroup ? majorGroup : undefined,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['skills', 'stopwords', queryParams],
    queryFn: () => skillAdminApi.getCandidates(queryParams),
    placeholderData: (prev) => prev,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => skillAdminApi.rejectSkill(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  });

  const handleChangeScope = (scope: 'global' | 'majorGroup' | 'major') => {
    setStopwordScope(scope);
    setPage(1);
    if (scope === 'global') {
      setMajorGroup('');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
            <Ban className="w-8 h-8 text-rose-600" />
            Stopword Manager
          </h1>
          <p className="text-gray-500 text-sm">Quản lý các từ khóa gây nhiễu theo phạm vi áp dụng (Global / Nhóm / Ngành)</p>
        </div>
      </div>

      {/* Scope Selector */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Phạm vi Stopword:</label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleChangeScope('global')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              stopwordScope === 'global'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-rose-600'
            }`}
          >
            Global (Toàn bộ)
          </button>
          <button
            onClick={() => handleChangeScope('majorGroup')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              stopwordScope === 'majorGroup'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-rose-600'
            }`}
          >
            Nhóm Ngành
          </button>
          <button
            onClick={() => handleChangeScope('major')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              stopwordScope === 'major'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-rose-600'
            }`}
          >
            Ngành Cụ thể
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-sm"
            placeholder="Search stopwords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {stopwordScope === 'majorGroup' && (
          <select
            value={majorGroup}
            onChange={(e) => {
              setMajorGroup(e.target.value);
              setPage(1);
            }}
            className="block w-64 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none shadow-sm"
          >
            <option value="">-- Chọn nhóm ngành --</option>
            {groups.map((g: any) => (
              <option key={g.nhom} value={g.nhom}>{g.nhom}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-rose-600 animate-spin mb-4" />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-sm">
                  <th className="p-4 font-medium">Stopword Term</th>
                  <th className="p-4 font-medium">Phạm vi</th>
                  <th className="p-4 font-medium">Context</th>
                  <th className="p-4 font-medium">Số lần xuất hiện</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-rose-600 text-base">{item.canonicalName}</span>
                        <span className="text-xs text-gray-500 font-mono mt-1">{item.normalizedText}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        !item.majorGroup && !item.major ? 'bg-gray-100 text-gray-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {!item.majorGroup && !item.major ? 'Global' : item.majorGroup ? 'Nhóm' : 'Ngành'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-700">
                        {item.majorGroup ? `${item.majorGroup}` : item.major ? `${item.major}` : 'N/A'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold">
                        {item.frequency}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => confirm('Remove stopword?') && rejectMutation.mutate(item.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete stopword"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
