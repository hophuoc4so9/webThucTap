import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  RefreshCw,
  MoreVertical,
  Check,
  X,
  UserCheck,
} from "lucide-react";
import type { RootState } from "@/store";
import { companyApi } from "@/api/api/services/company.api";
import type { CompanyMemberItem } from "@/api/api/services/company.api";

export function EmployeesPage() {
  const { user } = useSelector((s: RootState) => s.auth);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [members, setMembers] = useState<CompanyMemberItem[]>([]);
  const [requests, setRequests] = useState<CompanyMemberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const company = await companyApi.getMemberCompany(Number(user.id));
      if (company) {
        setCompanyId(company.id);
        const [membersRes, requestsRes] = await Promise.all([
          companyApi.getMembers(company.id),
          companyApi.getJoinRequests(company.id),
        ]);
        setMembers(membersRes);
        setRequests(requestsRes);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApproveJoin = async (id: number) => {
    setActionLoading(id);
    try {
      await companyApi.approveJoin(id);
      fetchData();
    } catch (err) {
      alert("Lỗi khi duyệt yêu cầu");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectJoin = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) return;
    setActionLoading(id);
    try {
      await companyApi.rejectJoin(id);
      fetchData();
    } catch (err) {
      alert("Lỗi khi từ chối yêu cầu");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (id: number, role: "admin" | "member") => {
    setActionLoading(id);
    try {
      await companyApi.updateMemberRole(id, role);
      fetchData();
    } catch (err) {
      alert("Lỗi khi cập nhật quyền");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá thành viên này khỏi công ty?")) return;
    setActionLoading(id);
    try {
      await companyApi.removeMember(id);
      fetchData();
    } catch (err) {
      alert("Lỗi khi xoá thành viên");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOwnership = async (memberId: number) => {
    if (!companyId) return;
    if (!confirm("CẢNH BÁO: Bạn sẽ mất quyền chủ sở hữu sau khi chuyển nhượng. Bạn có chắc chắn muốn tiếp tục?")) return;
    setActionLoading(memberId);
    try {
      await companyApi.transferOwnership(companyId, memberId);
      fetchData();
    } catch (err) {
      alert("Lỗi khi chuyển quyền sở hữu");
    } finally {
      setActionLoading(null);
    }
  };

  const currentUserMember = members.find((m) => m.userId === Number(user?.id));
  const isOwner = currentUserMember?.role === "owner";
  const isAdmin = isOwner || currentUserMember?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Quản lý nhân viên</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Phân quyền và quản lý thành viên trong công ty
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        {/* Pending Requests */}
        {requests.length > 0 && isAdmin && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-2">
              <UserPlus size={16} /> Yêu cầu tham gia mới ({requests.length})
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {requests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
                      {req.user?.name?.[0] || req.user?.email?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{req.user?.name || "Chưa cập nhật tên"}</p>
                      <p className="text-xs text-gray-400">{req.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveJoin(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Check size={14} /> Chấp nhận
                    </button>
                    <button
                      onClick={() => handleRejectJoin(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X size={14} /> Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Members */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Users size={16} /> Danh sách nhân viên ({members.length})
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Nhân viên</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Vai trò</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${
                          member.role === 'owner' ? 'bg-red-50 text-red-600' : 
                          member.role === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                        }`}>
                          {member.user?.name?.[0] || member.user?.email?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">
                            {member.user?.name || "Chưa cập nhật tên"}
                            {member.userId === Number(user?.id) && <span className="ml-2 text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase font-normal tracking-wider">Bạn</span>}
                          </p>
                          <p className="text-xs text-gray-400">{member.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {member.role === "owner" && (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">
                            <ShieldCheck size={12} /> Chủ sở hữu
                          </span>
                        )}
                        {member.role === "admin" && (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">
                            <Shield size={12} /> Quản trị viên
                          </span>
                        )}
                        {member.role === "member" && (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200">
                            <Users size={12} /> Thành viên
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && member.role !== "owner" && member.userId !== Number(user?.id) && (
                        <div className="flex items-center justify-end gap-2">
                          {/* Owner only actions */}
                          {isOwner && (
                            <>
                              <button
                                onClick={() => handleTransferOwnership(member.id)}
                                disabled={actionLoading === member.id}
                                className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Chuyển quyền sở hữu"
                              >
                                <UserCheck size={16} />
                              </button>
                              <button
                                onClick={() => handleUpdateRole(member.id, member.role === "admin" ? "member" : "admin")}
                                disabled={actionLoading === member.id}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title={member.role === "admin" ? "Gỡ quyền Admin" : "Nâng cấp Admin"}
                              >
                                {member.role === "admin" ? <ShieldAlert size={16} /> : <Shield size={16} />}
                              </button>
                            </>
                          )}
                          
                          {/* Remove member */}
                          {(isOwner || (isAdmin && member.role === "member")) && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={actionLoading === member.id}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xoá khỏi công ty"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default EmployeesPage;
