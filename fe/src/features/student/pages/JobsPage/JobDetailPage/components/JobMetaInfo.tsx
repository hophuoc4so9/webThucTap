import type { LucideIcon } from "lucide-react";

interface MetaItem {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}

interface JobMetaInfoProps {
  items: MetaItem[];
}

export function JobMetaInfo({ items }: JobMetaInfoProps) {
  const filtered = items.filter((m) => m.value);
  if (filtered.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
        Thông tin chung
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {filtered.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2">
            <Icon size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm text-gray-700 font-medium">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
