import { Building2, Settings } from "lucide-react";

interface CompanyNameBannerProps {
  companyName: string;
  editingName: boolean;
  nameInput: string;
  onNameInputChange: (v: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
}

export function CompanyNameBanner({
  companyName,
  editingName,
  nameInput,
  onNameInputChange,
  onSave,
  onCancelEdit,
  onStartEdit,
}: CompanyNameBannerProps) {
  if (!companyName || editingName) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Building2
            size={18}
            className="text-amber-500 flex-shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 mb-1">
              {editingName ? "Đổi tên công ty" : "Nhập tên công ty của bạn"}
            </p>
            <p className="text-xs text-amber-600 mb-3">
              Chỉ hiển thị các tin tuyển dụng thuộc công ty bạn.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={nameInput}
                onChange={(e) => onNameInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSave()}
                placeholder="Vd: FPT Software, VNG Corporation..."
                className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              />
              <button
                onClick={onSave}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Xác nhận
              </button>
              {editingName && (
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors"
                >
                  Huỷ
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm">
      <Building2 size={14} className="text-blue-500 flex-shrink-0" />
      <span className="font-semibold text-blue-700">{companyName}</span>
      <button
        onClick={onStartEdit}
        className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
      >
        <Settings size={11} /> Đổi
      </button>
    </div>
  );
}
