import { useState, useEffect } from "react";
import { companyApi, type CompanyItem } from "@/api/api/services/company.api";
import { useAuth } from "@/hooks/useAuth";
import SampleInput from "@/components/common/Input/SampleInput";
import SampleButton from "@/components/common/Button/SampleButton";
import { ArrowLeft, Search, Building2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onBack: () => void;
}

export const JoinCompanyForm = ({ onBack }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const search = async () => {
      if (!searchTerm.trim()) {
        setCompanies([]);
        return;
      }
      setLoading(true);
      try {
        const res = await companyApi.getAll({ name: searchTerm, limit: 5 });
        setCompanies(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(search, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleJoin = async () => {
    if (!selectedCompany || !user) return;
    setLoading(true);
    setError("");
    try {
      await companyApi.joinRequest(selectedCompany.id, Number(user.id));
      setRequestSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gửi yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (requestSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Đã gửi yêu cầu!</h2>
          <p className="text-gray-600 mb-6">
            Yêu cầu tham gia công ty <span className="font-semibold">{selectedCompany?.name}</span> đã được gửi. Vui lòng chờ quản trị viên của công ty duyệt.
          </p>
          <SampleButton onClick={() => navigate("/login")} className="w-full bg-blue-600">
            Trở về Đăng nhập
          </SampleButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-[#f0f4f8]">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden relative">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        <div className="p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Tìm kiếm Công ty</h2>
            <p className="text-gray-500 mt-2">Tìm công ty của bạn trên hệ thống và gửi yêu cầu tham gia</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập tên công ty..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
            {loading ? (
              <p className="text-center text-gray-500 py-4">Đang tìm kiếm...</p>
            ) : companies.length > 0 ? (
              companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company)}
                  className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${
                    selectedCompany?.id === company.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  {company.logo ? (
                    <img src={company.logo} alt={company.name} className="w-12 h-12 object-contain rounded-md border" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                      <Building2 size={24} />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-800">{company.name}</h4>
                    {company.industry && <p className="text-sm text-gray-500">{company.industry}</p>}
                  </div>
                </div>
              ))
            ) : searchTerm ? (
              <p className="text-center text-gray-500 py-4">Không tìm thấy công ty nào phù hợp.</p>
            ) : (
              <p className="text-center text-gray-500 py-4">Nhập tên công ty để bắt đầu tìm kiếm.</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          <SampleButton
            onClick={handleJoin}
            disabled={!selectedCompany || loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-medium disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Gửi yêu cầu tham gia"}
          </SampleButton>
        </div>
      </div>
    </div>
  );
};
