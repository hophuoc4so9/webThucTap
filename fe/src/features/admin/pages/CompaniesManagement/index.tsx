import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, Building2, ExternalLink } from "lucide-react";
import { companyApi, type CompanyItem } from "@/api/api/services/company.api";
import { AppPagination } from "@/components/common/AppPagination";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const CompaniesManagement = () => {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await companyApi.getAllAdmin({
        page,
        limit,
        status: statusFilter,
        name: searchQuery,
      });
      setCompanies(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      setToast({ msg: "Lỗi khi tải danh sách công ty", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, limit, statusFilter, searchQuery]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleApprove = async (id: number) => {
    try {
      await companyApi.approve(id);
      setToast({ msg: "Đã duyệt công ty thành công", type: "success" });
      fetchCompanies();
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || "Lỗi khi duyệt", type: "error" });
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt("Nhập lý do từ chối (tuỳ chọn):");
    if (reason === null) return; // User cancelled
    try {
      await companyApi.reject(id, reason);
      setToast({ msg: "Đã từ chối công ty", type: "success" });
      fetchCompanies();
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || "Lỗi khi từ chối", type: "error" });
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6 min-h-screen bg-white">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Xét duyệt Công ty</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng: <span className="font-semibold">{total}</span> công ty
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchQuery(searchInput);
                  setPage(1);
                }
              }}
              placeholder="Tìm kiếm công ty..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Công ty</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thông tin liên hệ</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Giấy phép KD</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">Đang tải...</td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">Không có dữ liệu</td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {c.logo ? (
                          <img src={c.logo} alt={c.name} className="w-10 h-10 rounded border object-contain bg-white" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                            <Building2 size={20} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.industry || "Chưa cập nhật lĩnh vực"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        <p><strong>Email:</strong> {c.companyEmail || "N/A"}</p>
                        <p><strong>SĐT:</strong> {c.phone || "N/A"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.businessLicense ? (
                        <a
                          href={c.businessLicense}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <ExternalLink size={14} /> Xem giấy phép
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Không có file</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status || "pending"]}`}>
                        {STATUS_LABELS[c.status || "pending"]}
                      </span>
                      {c.status === "rejected" && c.rejectReason && (
                        <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={c.rejectReason}>
                          Lý do: {c.rejectReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(c.id)}
                            title="Duyệt"
                            className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(c.id)}
                            title="Từ chối"
                            className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <AppPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};

export { CompaniesManagement };
