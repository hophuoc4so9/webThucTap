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
  source: string;
  salaryMin?: number;
  salaryMax?: number;
  onToggleIndustry: (val: string) => void;
  onClearIndustries: () => void;
  onSetLocation: (loc: string) => void;
  onSetSource: (src: string) => void;
  onSetSalaryMin: (value?: number) => void;
  onSetSalaryMax: (value?: number) => void;
}

export function FilterSidebar({
  fieldGroups,
  industries,
  location,
  source,
  salaryMin,
  salaryMax,
  onToggleIndustry,
  onClearIndustries,
  onSetLocation,
  onSetSource,
  onSetSalaryMin,
  onSetSalaryMax,
}: FilterSidebarProps) {
  const SOURCE_OPTIONS = ["", "manual", "linkedin", "topcv", "itviec", "careerbuilder"];

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

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Nguồn tin</p>
        <select
          value={source}
          onChange={(e) => onSetSource(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Tất cả nguồn</option>
          {SOURCE_OPTIONS.filter(Boolean).map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Mức lương (VND)</p>
        <div className="space-y-2">
          <input
            type="number"
            min={0}
            value={salaryMin ?? ""}
            onChange={(e) =>
              onSetSalaryMin(
                e.target.value.trim() === "" ? undefined : Number(e.target.value),
              )
            }
            placeholder="Lương tối thiểu"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            min={0}
            value={salaryMax ?? ""}
            onChange={(e) =>
              onSetSalaryMax(
                e.target.value.trim() === "" ? undefined : Number(e.target.value),
              )
            }
            placeholder="Lương tối đa"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
    </aside>
  );
}

export { LOCATIONS };
