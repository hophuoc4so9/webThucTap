interface StatsRowProps {
  total: number;
  openCount: number;
  expiredCount: number;
}

export function StatsRow({ total, openCount, expiredCount }: StatsRowProps) {
  const items = [
    { label: "Tổng tin đăng", value: total, color: "blue" },
    { label: "Đang tuyển", value: openCount, color: "green" },
    { label: "Đã hết hạn", value: expiredCount, color: "gray" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, color }) => (
        <div
          key={label}
          className={`rounded-xl p-4 border border-gray-200
          ${color === "blue" ? "bg-blue-50" : color === "green" ? "bg-green-50" : "bg-gray-50"}`}
        >
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <p
            className={`text-2xl font-bold
            ${color === "blue" ? "text-blue-600" : color === "green" ? "text-green-600" : "text-gray-500"}`}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
