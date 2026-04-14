import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "@/store";
import { setCredentials } from "@/store/slices/authSlice";
import { userApi } from "@/api/api/services/user.api";

export const StudentRecruiterPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const userId = useMemo(() => Number(user?.id), [user?.id]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!userId || Number.isNaN(userId)) return;
      try {
        const profile = await userApi.getById(userId);
        if (!active) return;
        setCompanyName(profile.companyName ?? "");
        setCompanyWebsite(profile.companyWebsite ?? "");
        setStatus(profile.recruiterStatus ?? "none");
      } catch {
        if (!active) return;
        setError("Không tải được trạng thái nhà tuyển dụng");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const canEdit = status !== "approved";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const updated = await userApi.requestRecruiter(Number(user.id), {
        companyName,
        companyWebsite: companyWebsite || undefined,
        note: note || undefined,
      });
      dispatch(
        setCredentials({
          user: {
            id: user.id,
            email: updated.email,
            role: updated.role.toUpperCase() as "STUDENT" | "COMPANY" | "ADMIN",
            name: updated.name ?? user.name ?? null,
            recruiterStatus: updated.recruiterStatus,
            companyName: updated.companyName ?? null,
            companyWebsite: updated.companyWebsite ?? null,
          },
          token,
        }),
      );
      setStatus(updated.recruiterStatus ?? "pending");
      if (updated.recruiterStatus === "approved" || updated.role === "company") {
        setMessage("Tài khoản nhà tuyển dụng đã được xác minh. Đang chuyển hướng...");
        setTimeout(() => navigate("/company/dashboard"), 1200);
      } else {
        setMessage("Yêu cầu đã được gửi. Hệ thống đang chờ admin xác nhận.");
      }
    } catch {
      setError("Không gửi được yêu cầu nhà tuyển dụng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800">Đăng ký tài khoản nhà tuyển dụng</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gửi yêu cầu để hệ thống hoặc admin xác minh trước khi chuyển vai trò thành nhà tuyển dụng.
        </p>

        {loading ? (
          <div className="mt-6 text-sm text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
              Trạng thái hiện tại: <span className="font-semibold">{status}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên công ty / nhà tuyển dụng</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                placeholder="Ví dụ: Công ty TNHH ABC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website / domain công ty</label>
              <input
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                placeholder="https://abc.com"
              />
              <p className="mt-1 text-xs text-gray-500">Nếu email công ty khớp domain website, hệ thống có thể tự duyệt.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!canEdit}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                placeholder="Mô tả ngắn về công ty, nhu cầu tuyển dụng..."
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !canEdit}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {submitting ? "Đang gửi..." : status === "approved" ? "Đã xác minh" : "Gửi yêu cầu"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/student/profile")}
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Quay lại profile
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
