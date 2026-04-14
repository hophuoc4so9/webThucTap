import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store";
import { setCredentials } from "@/store/slices/authSlice";
import { userApi } from "@/api/api/services/user.api";

export const StudentProfilePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const userId = useMemo(() => Number(user?.id), [user?.id]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!userId || Number.isNaN(userId)) {
        setError("Không xác định được người dùng");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const profile = await userApi.getById(userId);
        if (!active) return;
        setName(profile.name ?? "");
        setEmail(profile.email ?? "");
      } catch {
        if (!active) return;
        setError("Không tải được thông tin profile");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await userApi.updateProfile(Number(user.id), { name });
      dispatch(
        setCredentials({
          user: {
            id: user.id,
            email: updated.email,
            role: user.role,
            name: updated.name ?? null,
          },
          token,
        }),
      );
      setMessage("Cập nhật profile thành công");
    } catch {
      setError("Cập nhật profile thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800">Profile sinh viên</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý thông tin cá nhân của bạn.</p>

        {loading ? (
          <div className="mt-6 text-sm text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={email}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
