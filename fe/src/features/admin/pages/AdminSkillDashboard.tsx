import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { skillAdminApi } from '../api/skillAdmin';
import { Activity, CheckCircle, Ban, AlertTriangle, Layers } from 'lucide-react';

export const AdminSkillDashboard = () => {
  // Fetch overview stats (using candidates endpoint with limit=1 to get totals)
  const { data: pendingData } = useQuery({
    queryKey: ['skills', 'pending'],
    queryFn: () => skillAdminApi.getCandidates({ status: 'pending', limit: 1 }),
  });

  const { data: approvedData } = useQuery({
    queryKey: ['skills', 'approved'],
    queryFn: () => skillAdminApi.getCandidates({ status: 'approved', limit: 1 }),
  });

  const { data: stopwordData } = useQuery({
    queryKey: ['skills', 'stopword'],
    queryFn: () => skillAdminApi.getCandidates({ status: 'stopword', limit: 1 }),
  });

  const pendingCount = pendingData?.total || 0;

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Skill Dictionary Dashboard</h1>
        <p className="text-gray-500">Human-in-the-loop skill extraction management.</p>
      </div>

      {pendingCount > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 rounded-lg">
            <AlertTriangle className="text-amber-500 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-amber-500 font-medium">Action Required</h3>
            <p className="text-amber-400/80 text-sm">Còn {pendingCount} kỹ năng chưa duyệt, kết quả Market Trend có thể chưa chính xác.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Pending Card */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Pending Skills</p>
              <h2 className="text-3xl font-bold text-gray-900">{pendingCount}</h2>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <Activity className="text-amber-600 w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>

        {/* Approved Card */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Approved Skills</p>
              <h2 className="text-3xl font-bold text-gray-900">{approvedData?.total || 0}</h2>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle className="text-emerald-600 w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>

        {/* Stopwords Card */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Stopwords Filtered</p>
              <h2 className="text-3xl font-bold text-gray-900">{stopwordData?.total || 0}</h2>
            </div>
            <div className="p-3 bg-rose-100 rounded-xl">
              <Ban className="text-rose-600 w-6 h-6" />
            </div>
          </div>
        </div>
        
        {/* Alias Card */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Mapped Aliases</p>
              <h2 className="text-3xl font-bold text-gray-900">124</h2>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Layers className="text-blue-600 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Placeholder for charts/tables */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Pending Candidates</h3>
        <p className="text-gray-500 text-sm">Please navigate to the Pending Review page to manage candidates.</p>
      </div>
    </div>
  );
};
