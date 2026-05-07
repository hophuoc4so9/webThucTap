import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, Building2, ExternalLink, Eye, Globe, Mail, Phone, MapPin, Briefcase as JobIcon } from "lucide-react";
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
  const [sortByJobs, setSortByJobs] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    companyId: number | null;
  }>({ open: false, companyId: null });

  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await companyApi.getAllAdmin({
        page,
        limit,
        status: statusFilter,
        name: searchQuery,
        sortByJobs: sortByJobs || undefined,
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
  }, [page, limit, statusFilter, searchQuery, sortByJobs]);

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

  const handleReject = async () => {
    if (!rejectModal.companyId) return;

    try {
      setRejectLoading(true);

      await companyApi.reject(rejectModal.companyId, rejectReason);

      setToast({ msg: "Đã từ chối công ty", type: "success" });

      setRejectModal({ open: false, companyId: null });
      setRejectReason("");

      fetchCompanies();
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.message || "Lỗi khi từ chối",
        type: "error",
      });
    } finally {
      setRejectLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6 min-h-screen bg-white">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý công ty</h1>
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

          <select
            value={sortByJobs}
            onChange={(e) => {
              setSortByJobs(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Sắp xếp mặc định</option>
            <option value="DESC">Nhiều việc làm nhất</option>
            <option value="ASC">Ít việc làm nhất</option>
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Số việc làm</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Giấy phép KD</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">Đang tải...</td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">Không có dữ liệu</td>
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
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700">{(c as any).jobCount || 0}</span>
                        <span className="text-xs text-gray-400">tin tuyển dụng</span>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCompany(c);
                            setIsDetailOpen(true);
                          }}
                          title="Xem chi tiết"
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        {c.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(c.id)}
                              title="Duyệt"
                              className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setRejectModal({ open: true, companyId: c.id });
                                setRejectReason("");
                              }}
                              title="Từ chối"
                              className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
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

      {/* Detail Modal */}
      {isDetailOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Chi tiết công ty</h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XCircle size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-24 h-24 rounded-xl border p-2 flex-shrink-0 bg-white">
                  {selectedCompany.logo ? (
                    <img
                      src={selectedCompany.logo}
                      alt={selectedCompany.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                      <Building2 size={40} />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedCompany.name}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[selectedCompany.status || "pending"]}`}>
                      {STATUS_LABELS[selectedCompany.status || "pending"]}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe size={16} className="text-gray-400" />
                      <a href={selectedCompany.website || "#"} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline truncate">
                        {selectedCompany.website || "Chưa cập nhật"}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <JobIcon size={16} className="text-gray-400" />
                      <span>{selectedCompany.industry || "Chưa cập nhật lĩnh vực"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={16} className="text-gray-400" />
                      <span>{selectedCompany.companyEmail || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={16} className="text-gray-400" />
                      <span>{selectedCompany.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span>{selectedCompany.address || "Chưa cập nhật địa chỉ"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Mô tả công ty</h4>
                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {selectedCompany.description || "Không có mô tả."}
                </div>
              </div>

              {/* Business License */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Giấy phép kinh doanh</h4>
                {selectedCompany.businessLicense ? (
                  <div className="space-y-3">
                    <a
                      href={selectedCompany.businessLicense}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline"
                    >
                      <ExternalLink size={16} /> Mở trong tab mới
                    </a>
                    <div className="border rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center p-4 min-h-[200px]">
                      <img
                        src={selectedCompany.businessLicense}
                        alt="Business License"
                        className="max-w-full h-auto shadow-lg rounded-lg border bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-gray-50 rounded-xl text-center text-sm text-gray-400 italic">
                    Công ty này chưa tải lên giấy phép kinh doanh.
                  </div>
                )}
              </div>

              {/* Footer Actions in Modal */}
              {selectedCompany.status === "pending" && (
                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                  <button
                    onClick={() => {
                      setRejectModal({ open: true, companyId: selectedCompany.id });
                      setRejectReason("");
                      setIsDetailOpen(false);
                    }}
                    className="px-6 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-colors"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedCompany.id);
                      setIsDetailOpen(false);
                    }}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-md shadow-green-200"
                  >
                    Phê duyệt công ty
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {
        rejectModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">

              {/* Header */}
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                Từ chối công ty
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Nhập lý do từ chối (có thể bỏ trống)
              </p>

              {/* Textarea */}
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                autoFocus
                placeholder="Ví dụ: Thông tin không hợp lệ, giấy phép không rõ ràng..."
                className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() =>
                    setRejectModal({ open: false, companyId: null })
                  }
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-100 transition"
                >
                  Huỷ
                </button>

                <button
                  onClick={handleReject}
                  disabled={rejectLoading}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {rejectLoading ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>

  );
};

export { CompaniesManagement };
