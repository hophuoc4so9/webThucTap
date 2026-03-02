import { MapPin, X } from "lucide-react";
import { FieldGroup } from "./FieldGroup";
import type { NhomNganh } from "./FieldGroup";

const LOCATIONS = [
  "Hồ Chí Minh",
  "Đồng Nai",
  "Tây Ninh",
  
];

interface FilterSidebarProps {
  fieldGroups: NhomNganh[];
  industries: string[];
  location: string;
  onToggleIndustry: (val: string) => void;
  onClearIndustries: () => void;
  onSetLocation: (loc: string) => void;
}

export function FilterSidebar({
  fieldGroups,
  industries,
  location,
  onToggleIndustry,
  onClearIndustries,
  onSetLocation,
}: FilterSidebarProps) {
  return (
    <aside className="w-60 flex-shrink-0 space-y-4 self-start sticky top-20">
      {/* Lĩnh vực — multi-select checkboxes */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-700">
            Lĩnh vực
            {industries.length > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {industries.length}
              </span>
            )}
          </span>
          {industries.length > 0 && (
            <button
              onClick={onClearIndustries}
              className="text-blue-400 hover:text-blue-600 transition-colors flex items-center gap-0.5 text-xs"
            >
              <X size={11} /> Bỏ chọn
            </button>
          )}
        </div>

        <div className="max-h-[520px] overflow-y-auto">
          {fieldGroups.map((group) => (
            <FieldGroup
              key={group.nhom}
              group={group}
              selected={industries}
              onToggle={onToggleIndustry}
            />
          ))}
        </div>
      </div>

      {/* Địa điểm */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <MapPin size={14} className="text-blue-500" /> Địa điểm
        </p>
        <div className="flex flex-wrap gap-1.5">
          {["", ...LOCATIONS].map((l) => (
            <button
              key={l || "__all__"}
              onClick={() => onSetLocation(l)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                location === l
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              {l || "Tất cả"}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export { LOCATIONS };
