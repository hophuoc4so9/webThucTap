import { Search, MapPin, Tag, X } from "lucide-react";
import { INDUSTRIES } from "../constants";

interface SearchBarProps {
  keyword: string;
  location: string;
  industry: string;
  hasFilter: boolean;
  onKeywordChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onClearKeyword: () => void;
  onClearLocation: () => void;
  onClearIndustry: () => void;
}

export function SearchBar({
  keyword,
  location,
  industry,
  hasFilter,
  onKeywordChange,
  onLocationChange,
  onIndustryChange,
  onSearch,
  onClear,
  onClearKeyword,
  onClearLocation,
  onClearIndustry,
}: SearchBarProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Tìm tên công việc, công ty..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
        <div className="relative sm:w-48">
          <MapPin
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Địa điểm..."
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
        <div className="relative sm:w-52">
          <Tag
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <select
            value={industry}
            onChange={(e) => onIndustryChange(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
          >
            <option value="">Tất cả ngành</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onSearch}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
        >
          <Search size={14} /> Tìm
        </button>
        {hasFilter && (
          <button
            onClick={onClear}
            className="px-3 py-2 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <X size={13} /> Xoá lọc
          </button>
        )}
      </div>

      {hasFilter && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          {keyword && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium">
              <Search size={10} /> {keyword}
              <button onClick={onClearKeyword}>
                <X size={10} />
              </button>
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium">
              <MapPin size={10} /> {location}
              <button onClick={onClearLocation}>
                <X size={10} />
              </button>
            </span>
          )}
          {industry && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium">
              <Tag size={10} /> {industry}
              <button onClick={onClearIndustry}>
                <X size={10} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
