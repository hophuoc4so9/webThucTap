import { isExpired } from "../utils";

interface StatusBadgeProps {
  deadline?: string;
}

export function StatusBadge({ deadline }: StatusBadgeProps) {
  const expired = isExpired(deadline);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium
      ${expired ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${expired ? "bg-gray-400" : "bg-green-500"}`}
      />
      {expired ? "Hết hạn" : "Đang mở"}
    </span>
  );
}
