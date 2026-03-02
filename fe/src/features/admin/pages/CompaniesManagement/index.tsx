import { Search, Trash2, ShieldCheck, X } from "lucide-react";
import { useUserManagement } from "../../hooks/useUserManagement";

const ROLE_LABELS: Record<string, string> = {
  student: "Sinh viên",
  company: "Công ty",
  admin: "Quản trị viên",
};

const ROLE_BADGE: Record<string, string> = {
  student: "bg-blue-100 text-blue-700",
  company: "bg-green-100 text-green-700",
  admin: "bg-purple-100 text-purple-700",
};

const CompaniesManagement = () => {
  const vm = useUserManagement("company");
  const roleOptions = ["student", "admin"] as const;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-white">
      {vm.toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            vm.toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {vm.toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">
            Quản lý Công ty
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng: <span className="font-semibold">{vm.total}</span> tài khoản
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={vm.emailInput}
              onChange={(e) => vm.setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && vm.applySearch()}
              placeholder="Tìm kiếm email..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black w-64"
            />
          </div>
          <button
            onClick={vm.applySearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Tìm
          </button>
          {vm.email && (
            <button
              onClick={vm.clearSearch}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                Vai trò
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vm.loading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  Đang tải...
                </td>
              </tr>
            ) : vm.users.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              vm.users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-500">{u.id}</td>
                  <td className="px-6 py-4 text-sm text-black font-medium">
                    {u.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title="Đổi vai trò"
                        onClick={() => vm.setRoleTarget(u)}
                        className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                      <button
                        title="Xóa tài khoản"
                        onClick={() => vm.setDeleteTarget(u)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {vm.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Trang {vm.page} / {vm.totalPages} &nbsp;•&nbsp; {vm.total} kết quả
          </span>
          <div className="flex gap-1">
            <button
              disabled={vm.page <= 1}
              onClick={() => vm.goPage(vm.page - 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              &laquo; Trước
            </button>
            <button
              disabled={vm.page >= vm.totalPages}
              onClick={() => vm.goPage(vm.page + 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Sau &raquo;
            </button>
          </div>
        </div>
      )}

      {vm.deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-black">
              Xác nhận xóa
            </h3>
            <p className="text-sm text-gray-600">
              Bạn có chắc muốn xóa tài khoản{" "}
              <span className="font-semibold">{vm.deleteTarget.email}</span>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => vm.setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-black hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={vm.handleDelete}
                disabled={vm.deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {vm.deleting ? "Đang xóa..." : "Xóa tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}

      {vm.roleTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-black">
              Đổi vai trò
            </h3>
            <p className="text-sm text-gray-500">
              Tài khoản:{" "}
              <span className="font-medium text-black">
                {vm.roleTarget.email}
              </span>
            </p>
            <p className="text-sm text-gray-500">Chọn vai trò mới:</p>
            <div className="flex flex-col gap-2">
              {roleOptions.map((r) => (
                <button
                  key={r}
                  disabled={vm.roleSaving}
                  onClick={() => vm.handleUpdateRole(r)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-black hover:bg-gray-50 disabled:opacity-60 transition-colors text-left"
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
            <button
              onClick={() => vm.setRoleTarget(null)}
              className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { CompaniesManagement };
