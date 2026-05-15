import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillAdminApi, type SkillClusterOutput } from '../api/skillAdmin';
import { Loader2, Layers, Check, GitMerge, Ban, RefreshCw, Filter } from 'lucide-react';
import { useMajorGroups } from '@/hooks/useMajors';

export const ClusterReviewPage = () => {
  const queryClient = useQueryClient();
  const [minFrequency, setMinFrequency] = useState(2);
  const [majorGroupFilter, setMajorGroupFilter] = useState('');
  const [editedLabels, setEditedLabels] = useState<Record<string, string>>({});
  const [stopwordScope, setStopwordScope] = useState<'global' | 'majorGroup' | 'major'>('global');
  const [stopwordModalOpen, setStopwordModalOpen] = useState(false);
  const [pendingStopwordAction, setPendingStopwordAction] = useState<{ type: 'cluster' | 'term'; ids: number[] } | null>(null);
  const groups = useMajorGroups();

  const { data: clusters, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['skills', 'clusters', { minFrequency, majorGroup: majorGroupFilter }],
    queryFn: () => skillAdminApi.getPendingClusters({ 
      minFrequency: minFrequency,
      majorGroup: majorGroupFilter || undefined 
    }),
  });

  const bulkMutation = useMutation({
    mutationFn: skillAdminApi.bulkAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setStopwordModalOpen(false);
      setPendingStopwordAction(null);
    },
  });

  const handleLabelChange = (clusterId: number, newLabel: string) => {
    setEditedLabels(prev => ({ ...prev, [clusterId]: newLabel }));
  };

  const handleApproveCluster = (cluster: SkillClusterOutput) => {
    const label = editedLabels[cluster.clusterId] || cluster.labelSuggested;
    if (!confirm(`Approve all ${cluster.terms.length} terms in "${label}"?`)) return;
    const ids = cluster.terms.map(t => t.id);
    bulkMutation.mutate({ ids, action: 'approve' });
  };

  const handleMergeCluster = (cluster: SkillClusterOutput) => {
    const label = editedLabels[cluster.clusterId] || cluster.labelSuggested;
    if (!confirm(`Merge all terms into a single skill: "${label}"?`)) return;
    const ids = cluster.terms.map(t => t.id);
    bulkMutation.mutate({ ids, action: 'merge_cluster', targetName: label });
  };

  const openStopwordModal = (ids: number[]) => {
    setPendingStopwordAction({ type: 'cluster', ids });
    setStopwordModalOpen(true);
  };

  const handleConfirmStopword = () => {
    if (!pendingStopwordAction) return;
    
    bulkMutation.mutate({
      ids: pendingStopwordAction.ids,
      action: 'mark_stopword',
      stopwordScope,
      stopwordContext: stopwordScope === 'majorGroup' ? majorGroupFilter : undefined,
    });
  };

  const handleSingleStopword = (id: number, termName: string) => {
    setPendingStopwordAction({ type: 'term', ids: [id] });
    setStopwordModalOpen(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-600" />
            AI Clustering Review
          </h1>
          <p className="text-gray-500 text-sm">Review unsupervised clustered skills grouped by text similarity.</p>
        </div>
        
        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          Regenerate Clusters
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Min Frequency</label>
          <input 
            type="number" 
            value={minFrequency} 
            onChange={(e) => setMinFrequency(Number(e.target.value))}
            className="w-32 px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Major Group Context</label>
          <select
            value={majorGroupFilter}
            onChange={(e) => setMajorGroupFilter(e.target.value)}
            className="w-64 px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 appearance-none shadow-sm"
          >
            <option value="">All Major Groups</option>
            {groups.map((g: any) => (
              <option key={g.nhom} value={g.nhom}>{g.nhom}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 top-6 flex items-center px-2 pointer-events-none">
            <Filter className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      ) : clusters?.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200 border-dashed">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No Clusters Found</h3>
          <p className="text-gray-500 mt-1">There are not enough pending candidates to form meaningful clusters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {clusters?.map((cluster) => (
            <div key={cluster.clusterId} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2 mb-1 w-full">
                    <input 
                      type="text"
                      className="text-lg font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 bg-transparent outline-none w-full transition-colors"
                      value={editedLabels[cluster.clusterId] ?? cluster.labelSuggested}
                      onChange={(e) => handleLabelChange(cluster.clusterId, e.target.value)}
                      placeholder="Enter cluster name"
                    />
                  </div>
                  <p className="text-sm text-gray-500">{cluster.totalFrequency} total mentions in jobs</p>
                </div>
                <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 font-bold text-sm shrink-0">
                  {cluster.terms.length} terms
                </div>
              </div>

              <div className="flex-1 bg-gray-50 rounded-xl p-3 mb-4 max-h-48 overflow-y-auto custom-scrollbar border border-gray-100">
                <ul className="space-y-2">
                  {cluster.terms.map(term => (
                    <li key={term.id} className="flex justify-between items-center text-sm group/item">
                      <span className="text-gray-700 truncate" title={term.canonicalName}>{term.canonicalName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-500 bg-gray-200 px-2 py-0.5 rounded text-xs font-medium">{term.frequency}x</span>
                        <button 
                          onClick={() => handleSingleStopword(term.id, term.canonicalName)}
                          className="opacity-0 group-hover/item:opacity-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-all"
                          title="Mark as Stopword"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-auto">
                <button 
                  onClick={() => handleApproveCluster(cluster)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200"
                >
                  <Check className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Approve</span>
                </button>
                <button 
                  onClick={() => handleMergeCluster(cluster)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors border border-blue-200"
                >
                  <GitMerge className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Merge</span>
                </button>
                <button 
                  onClick={() => openStopwordModal(cluster.terms.map(t => t.id))}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors border border-rose-200"
                >
                  <Ban className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">Stopword</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stopword Scope Modal */}
      {stopwordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Mark as Stopword</h2>
              <p className="text-sm text-gray-600 mt-1">Chọn phạm vi áp dụng stopword</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <button
                  onClick={() => setStopwordScope('global')}
                  className={`w-full p-3 rounded-lg border-2 font-medium transition-all text-left ${
                    stopwordScope === 'global'
                      ? 'border-rose-600 bg-rose-50 text-rose-900'
                      : 'border-gray-200 text-gray-700 hover:border-rose-300'
                  }`}
                >
                  <div className="font-bold">Global (Toàn bộ)</div>
                  <div className="text-xs mt-1 opacity-75">Áp dụng cho toàn bộ hệ thống</div>
                </button>

                <button
                  onClick={() => setStopwordScope('majorGroup')}
                  className={`w-full p-3 rounded-lg border-2 font-medium transition-all text-left ${
                    stopwordScope === 'majorGroup'
                      ? 'border-rose-600 bg-rose-50 text-rose-900'
                      : 'border-gray-200 text-gray-700 hover:border-rose-300'
                  }`}
                >
                  <div className="font-bold">Nhóm Ngành</div>
                  <div className="text-xs mt-1 opacity-75">Áp dụng cho một nhóm ngành</div>
                </button>

                <button
                  onClick={() => setStopwordScope('major')}
                  className={`w-full p-3 rounded-lg border-2 font-medium transition-all text-left ${
                    stopwordScope === 'major'
                      ? 'border-rose-600 bg-rose-50 text-rose-900'
                      : 'border-gray-200 text-gray-700 hover:border-rose-300'
                  }`}
                >
                  <div className="font-bold">Ngành Cụ thể</div>
                  <div className="text-xs mt-1 opacity-75">Áp dụng cho một ngành cụ thể</div>
                </button>
              </div>

              {stopwordScope === 'majorGroup' && (
                <select
                  value={majorGroupFilter}
                  onChange={(e) => setMajorGroupFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-rose-500"
                >
                  <option value="">-- Chọn nhóm ngành --</option>
                  {groups.map((g: any) => (
                    <option key={g.nhom} value={g.nhom}>{g.nhom}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setStopwordModalOpen(false);
                  setPendingStopwordAction(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStopword}
                disabled={bulkMutation.isPending}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {bulkMutation.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
