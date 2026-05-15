interface StatsRowProps {
  total: number;
  activeCount: number;
  expiredCount: number;
 
}

export function StatsRow({
  total,
  activeCount,
  expiredCount,
  
}: StatsRowProps) {
  const items = [
    { label: "Tổng tin", value: total, color: "blue" },
    { label: "Đang mở", value: activeCount, color: "green" },
    { label: "Hết hạn", value: expiredCount, color: "gray" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map(({ label, value, color }) => (
        <div
          key={label}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
          <p
            className={`text-2xl font-bold
            ${
              color === "blue"
                ? "text-blue-600"
                : color === "green"
                  ? "text-green-600"
                  : color === "red"
                    ? "text-red-600"
                    : "text-gray-500"
            }`}
          >
            {value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
