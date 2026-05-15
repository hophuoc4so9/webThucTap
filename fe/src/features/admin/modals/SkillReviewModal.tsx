import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { skillAdminApi, type SkillTerm, type SkillTermType } from '../api/skillAdmin';
import { TypeBadge } from '../components/SkillBadges';
import { X, Check, Save } from 'lucide-react';

interface SkillReviewModalProps {
  skill: SkillTerm;
  isOpen: boolean;
  onClose: () => void;
}

export const SkillReviewModal: React.FC<SkillReviewModalProps> = ({ skill, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    canonicalName: skill.canonicalName,
    type: skill.type as SkillTermType,
    category: skill.category || '',
    major: skill.major || '',
    majorGroup: skill.majorGroup || '',
  });

  const approveMutation = useMutation({
    mutationFn: (data: typeof formData) => skillAdminApi.approveSkill(skill.id, {
      canonicalName: data.canonicalName,
      type: data.type,
      category: data.category || undefined,
      major: data.major || undefined,
      majorGroup: data.majorGroup || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white">Review Skill Candidate</h2>
            <p className="text-slate-400 text-sm mt-1 font-mono">Normalized: {skill.normalizedText}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <span className="block text-slate-500 text-xs font-semibold uppercase mb-1">Raw Extraction</span>
              <span className="text-slate-200 font-medium">{skill.rawText}</span>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <span className="block text-slate-500 text-xs font-semibold uppercase mb-1">Frequency Stats</span>
              <span className="text-slate-200 font-medium">{skill.frequency} jobs</span>
              <span className="text-slate-500 text-sm ml-2">({Math.round(skill.confidenceAvg * 100)}% conf)</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Canonical Name</label>
              <input
                type="text"
                value={formData.canonicalName}
                onChange={(e) => setFormData({...formData, canonicalName: e.target.value})}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Tên chuẩn hóa sẽ hiển thị trên hệ thống</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Skill Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as SkillTermType})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                >
                  <option value="hard">Hard Skill</option>
                  <option value="soft">Soft Skill</option>
                  <option value="language">Language</option>
                  <option value="certificate">Certificate</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Category (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Backend, Frontend, Accounting"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Major Group Context</label>
                <input
                  type="text"
                  disabled
                  value={formData.majorGroup || 'Global (Any)'}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-400 outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50 flex justify-between">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => approveMutation.mutate(formData)}
              disabled={approveMutation.isPending}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {approveMutation.isPending ? 'Saving...' : 'Save & Approve'}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};
