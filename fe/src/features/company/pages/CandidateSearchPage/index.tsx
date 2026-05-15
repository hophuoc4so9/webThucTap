import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, CheckCircle, Brain, Filter } from 'lucide-react';
import { candidateService, type Candidate } from '../../services/candidateService';
import { AppPagination } from '@/components/common/AppPagination';

export const CandidateSearchPage = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [major, setMajor] = useState('');
  const limit = 10;

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await candidateService.searchCandidates({
        query,
        major,
        page,
        limit,
      });
      setCandidates(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('Failed to fetch candidates', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [page, major]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tìm kiếm sinh viên</h1>
            <p className="text-gray-500">Tìm kiếm ứng viên phù hợp dựa trên kỹ năng và độ tương quan AI</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm theo kỹ năng, vị trí (vd: React, Frontend Developer...)"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64 relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
              >
                <option value="">Tất cả ngành học</option>
                <option value="Công nghệ thông tin">Công nghệ thông tin</option>
                <option value="Kỹ thuật phần mềm">Kỹ thuật phần mềm</option>
                <option value="Hệ thống thông tin">Hệ thống thông tin</option>
                <option value="Khoa học máy tính">Khoa học máy tính</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-green-600 rounded-full" role="status"></div>
              <p className="mt-2 text-gray-500">Đang tìm kiếm ứng viên phù hợp...</p>
            </div>
          ) : candidates.length > 0 ? (
            <>
              {candidates.map((candidate) => (
                <div key={candidate.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-green-200 transition-all group">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-gray-400">
                        <GraduationCap size={32} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-green-700 transition-colors">
                            {candidate.fullName}
                          </h3>
                          {candidate.isTdmuVerified && (
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium" title="Sinh viên TDMU đã xác thực">
                              <CheckCircle size={12} />
                              Xác thực TDMU
                            </div>
                          )}
                        </div>
                        <p className="text-gray-600 font-medium">{candidate.title || 'Chưa cập nhật tiêu đề'}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <GraduationCap size={14} />
                            {candidate.major}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {candidate.skills?.split(',').slice(0, 6).map((skill, i) => (
                            <span key={i} className="bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-md border border-gray-100">
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 min-w-[150px]">
                      {candidate.combinedScore !== undefined && candidate.combinedScore > 0 && (
                        <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-right w-full">
                          <div className="flex items-center justify-end gap-1.5 text-green-700 font-bold">
                            <Brain size={16} />
                            <span>{Math.round(candidate.combinedScore * 100)}% Match</span>
                          </div>
                          <p className="text-[10px] text-green-600 mt-1 uppercase tracking-wider font-semibold">
                            {candidate.matchReason || 'Độ tương quan AI'}
                          </p>
                        </div>
                      )}
                      <button className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                        Xem chi tiết hồ sơ
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <AppPagination
                page={page}
                totalPages={Math.ceil(total / limit)}
                total={total}
                limit={limit}
                onPageChange={setPage}
                activeLinkClassName="!bg-green-600 !text-white !border-green-600"
              />
            </>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Search size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-800">Không tìm thấy sinh viên phù hợp</h3>
              <p className="text-gray-500 max-w-sm mx-auto mt-2">
                Hãy thử thay đổi từ khóa tìm kiếm hoặc lọc theo ngành học khác để tìm thấy ứng viên tiềm năng.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateSearchPage;
