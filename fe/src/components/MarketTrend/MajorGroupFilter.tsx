import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useMajorGroups } from "@/hooks/useMajors";

interface MajorGroupFilterProps {
  onGroupSelect: (group: string | null) => void;
  selectedGroup: string | null;
}

export function MajorGroupFilter({ onGroupSelect, selectedGroup }: MajorGroupFilterProps) {
  const majorGroups = useMajorGroups();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block w-full sm:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto flex items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <span className="truncate">
          {selectedGroup ? `Nhóm: ${selectedGroup}` : "Chọn nhóm ngành"}
        </span>
        {selectedGroup ? (
          <X size={16} className="text-gray-400 hover:text-gray-600" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <button
            onClick={() => {
              onGroupSelect(null);
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors ${
              !selectedGroup ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
            }`}
          >
            Tất cả ngành (Overall)
          </button>

          {majorGroups.map((group: any) => (
            <button
              key={group.nhom}
              onClick={() => {
                onGroupSelect(group.nhom);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-t border-gray-100 ${
                selectedGroup === group.nhom ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
              }`}
            >
              <div className="font-medium">{group.nhom}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {group.nganh_hoc.length} ngành học
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
