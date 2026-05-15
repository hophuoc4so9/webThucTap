import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { skillAdminApi, type SkillTerm } from '../api/skillAdmin';
import { StatusBadge, TypeBadge } from './SkillBadges';
import { Check, X, Ban, MoreHorizontal, Layers } from 'lucide-react';

interface SkillReviewTableProps {
  items: SkillTerm[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onReview: (skill: SkillTerm) => void;
}

export const SkillReviewTable: React.FC<SkillReviewTableProps> = ({ 
  items, 
  selectedIds, 
  onSelectionChange,
  onReview 
}) => {
  const queryClient = useQueryClient();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectionChange(items.map(item => item.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelect = (id: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // Quick inline actions
  const approveMutation = useMutation({
    mutationFn: (id: number) => skillAdminApi.approveSkill(id, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  });

  const stopwordMutation = useMutation({
    mutationFn: (id: number) => skillAdminApi.markStopword(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 text-sm">
            <th className="p-4 w-12">
              <input 
                type="checkbox" 
                className="rounded bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-500/50"
                checked={items.length > 0 && selectedIds.length === items.length}
                onChange={handleSelectAll}
              />
            </th>
            <th className="p-4 font-medium">Candidate Term</th>
            <th className="p-4 font-medium">Frequency</th>
            <th className="p-4 font-medium">Suggested Type</th>
            <th className="p-4 font-medium">Major Group</th>
            <th className="p-4 font-medium">Confidence</th>
            <th className="p-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
              <td className="p-4">
                <input 
                  type="checkbox" 
                  className="rounded bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-500/50"
                  checked={selectedIds.includes(item.id)}
                  onChange={(e) => handleSelect(item.id, e.target.checked)}
                />
              </td>
              <td className="p-4">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-200">{item.canonicalName}</span>
                  <span className="text-xs text-slate-500 font-mono mt-1" title="Normalized text">
                    {item.normalizedText}
                  </span>
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-medium">{item.frequency}</span>
                  <span className="text-xs text-slate-500">jobs</span>
                </div>
              </td>
              <td className="p-4">
                <TypeBadge type={item.type} />
              </td>
              <td className="p-4">
                {item.majorGroup ? (
                  <span className="text-sm text-slate-300">{item.majorGroup}</span>
                ) : (
                  <span className="text-sm text-slate-500 italic">Global</span>
                )}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${item.confidenceAvg > 0.7 ? 'bg-emerald-500' : item.confidenceAvg > 0.4 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(item.confidenceAvg * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {Math.round(item.confidenceAvg * 100)}%
                  </span>
                </div>
              </td>
              <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => approveMutation.mutate(item.id)}
                    className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded border border-emerald-500/20 transition-colors"
                    title="Quick Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => stopwordMutation.mutate(item.id)}
                    className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded border border-rose-500/20 transition-colors"
                    title="Mark Stopword"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onReview(item)}
                    className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded text-sm font-medium border border-indigo-500/20 transition-colors"
                  >
                    Review Details
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
