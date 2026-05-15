import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillAdminApi, type SkillCandidateQuery, type SkillTerm } from '../api/skillAdmin';
import { SkillReviewTable } from '../components/SkillReviewTable';
import { SkillReviewModal } from '../modals/SkillReviewModal';
import { Search, Filter, Loader2, CheckSquare } from 'lucide-react';
import { useMajorGroups } from '@/hooks/useMajors';

// Fallback debounce hook inline if not in project
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const PendingReviewPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounceValue(searchTerm, 500);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [majorGroup, setMajorGroup] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const groups = useMajorGroups();
  
  // Modal states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillTerm | null>(null);

  const queryParams: SkillCandidateQuery = {
    page,
    limit: 50,
    status: 'pending',
    search: debouncedSearch || undefined,
    type: typeFilter ? (typeFilter as any) : undefined,
    majorGroup: majorGroup || undefined,
    sortBy: 'frequency',
    sortOrder: 'DESC',
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['skills', 'candidates', queryParams],
    queryFn: () => skillAdminApi.getCandidates(queryParams),
    placeholderData: (previousData) => previousData, // keep previous data while fetching
  });

  const bulkActionMutation = useMutation({
    mutationFn: skillAdminApi.bulkAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setSelectedIds([]);
      // toast.success('Bulk action successful');
    },
  });

  const handleBulkApprove = () => {
    if (!selectedIds.length) return;
    if (confirm(`Approve ${selectedIds.length} skills?`)) {
      bulkActionMutation.mutate({ ids: selectedIds, action: 'approve' });
    }
  };

  const handleBulkStopword = () => {
    if (!selectedIds.length) return;
    if (confirm(`Mark ${selectedIds.length} skills as stopword?`)) {
      bulkActionMutation.mutate({ ids: selectedIds, action: 'mark_stopword' });
    }
  };

  const openReviewModal = (skill: SkillTerm) => {
    setSelectedSkill(skill);
    setReviewModalOpen(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Pending Skills Review</h1>
          <p className="text-gray-500 text-sm">Duyệt các kỹ năng mới được hệ thống trích xuất.</p>
        </div>
        
        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-top-4">
            <span className="text-indigo-700 font-medium text-sm mr-2">{selectedIds.length} selected</span>
            <button 
              onClick={handleBulkApprove}
              disabled={bulkActionMutation.isPending}
              className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md text-sm font-medium transition-colors"
            >
              Approve All
            </button>
            <button 
              onClick={handleBulkStopword}
              disabled={bulkActionMutation.isPending}
              className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-md text-sm font-medium transition-colors"
            >
              Mark Stopwords
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            placeholder="Search pending skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-sm"
          >
            <option value="">All Types</option>
            <option value="hard">Hard Skills</option>
            <option value="soft">Soft Skills</option>
            <option value="language">Languages</option>
            <option value="certificate">Certificates</option>
            <option value="unknown">Unknown</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <Filter className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="relative">
          <select
            value={majorGroup}
            onChange={(e) => setMajorGroup(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-sm"
          >
            <option value="">All Major Groups</option>
            {groups.map((g: any) => (
              <option key={g.nhom} value={g.nhom}>{g.nhom}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <Filter className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-500">Loading candidates...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-500">
            Error loading data. Please try again.
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
            <p className="text-gray-500 mt-1">No pending skills match your filters.</p>
          </div>
        ) : (
          <SkillReviewTable 
            items={data?.items || []} 
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onReview={openReviewModal}
          />
        )}
        
        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">
              Showing {((page - 1) * data.limit) + 1} to {Math.min(page * data.limit, data.total)} of {data.total} candidates
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors border border-gray-300"
              >
                Previous
              </button>
              <button 
                disabled={page === data.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors border border-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {reviewModalOpen && selectedSkill && (
        <SkillReviewModal 
          skill={selectedSkill} 
          isOpen={reviewModalOpen} 
          onClose={() => setReviewModalOpen(false)} 
        />
      )}
    </div>
  );
};
