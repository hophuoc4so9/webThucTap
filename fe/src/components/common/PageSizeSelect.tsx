interface PageSizeSelectProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  compact?: boolean;
}

export const PageSizeSelect = ({
  value,
  onChange,
  options = [6, 12, 24, 48],
  compact = false,
}: PageSizeSelectProps) => {
  return (
    <label
      className={`flex items-center text-gray-500 ${
        compact ? "gap-1.5 text-xs" : "gap-2 text-sm"
      }`}
    >
      <span className="whitespace-nowrap">Hiển thị</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
          compact ? "h-7 px-2 text-xs" : "px-2.5 py-1.5 text-sm"
        }`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="whitespace-nowrap">mục / trang</span>
    </label>
  );
};
