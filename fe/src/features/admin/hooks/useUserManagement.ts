import { useState, useEffect, useCallback } from "react";
import { userApi, type UserItem } from "@/api/api/services/user.api";

const PAGE_SIZE = 20;

export function useUserManagement(defaultRole?: string) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [roleTarget, setRoleTarget] = useState<UserItem | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetch = useCallback(
    async (pg: number, em: string) => {
      setLoading(true);
      try {
        const res = await userApi.getAll({
          page: pg,
          limit: PAGE_SIZE,
          role: defaultRole,
          email: em || undefined,
        });
        setUsers(res.data ?? []);
        setTotal(res.total ?? 0);
      } catch {
        showToast("Không thể tải danh sách người dùng", "error");
      } finally {
        setLoading(false);
      }
    },
    [defaultRole],
  );

  useEffect(() => {
    fetch(1, "");
  }, [defaultRole, fetch]);

  const applySearch = () => {
    setEmail(emailInput);
    setPage(1);
    fetch(1, emailInput);
  };

  const clearSearch = () => {
    setEmail("");
    setEmailInput("");
    setPage(1);
    fetch(1, "");
  };

  const goPage = (p: number) => {
    setPage(p);
    fetch(p, email);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userApi.remove(deleteTarget.id);
      showToast("Đã xóa tài khoản");
      setDeleteTarget(null);
      fetch(page, email);
    } catch {
      showToast("Xóa thất bại", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!roleTarget) return;
    setRoleSaving(true);
    try {
      await userApi.updateRole(roleTarget.id, newRole);
      showToast("Đã cập nhật vai trò");
      setRoleTarget(null);
      fetch(page, email);
    } catch {
      showToast("Cập nhật thất bại", "error");
    } finally {
      setRoleSaving(false);
    }
  };

  const handleApproveRecruiter = async (id: number) => {
    setLoading(true);
    try {
      await userApi.approveRecruiter(id);
      showToast("Đã duyệt nhà tuyển dụng");
      fetch(page, email);
    } catch {
      showToast("Duyệt thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRecruiter = async (id: number) => {
    setLoading(true);
    try {
      await userApi.rejectRecruiter(id, "Từ chối bởi admin");
      showToast("Đã từ chối nhà tuyển dụng");
      fetch(page, email);
    } catch {
      showToast("Từ chối thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    users,
    total,
    page,
    loading,
    emailInput,
    setEmailInput,
    email,
    applySearch,
    clearSearch,
    goPage,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    roleTarget,
    setRoleTarget,
    roleSaving,
    handleUpdateRole,
    handleApproveRecruiter,
    handleRejectRecruiter,
    toast,
    totalPages,
    PAGE_SIZE,
    refresh: () => fetch(page, email),
  };
}
