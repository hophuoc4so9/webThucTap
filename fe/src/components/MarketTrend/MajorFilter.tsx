import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useMajors } from "@/hooks/useMajors";

interface MajorFilterProps {
  onMajorSelect: (major: string | null) => void;
  selectedMajor: string | null;
}

export function MajorFilter({ onMajorSelect, selectedMajor }: MajorFilterProps) {
  const majors = useMajors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredMajors = useMemo(() => {
    if (!searchText.trim()) return majors.slice(0, 10);

    const normalized = searchText.trim().toLowerCase();
    return majors.filter(m =>
      m.name.toLowerCase().includes(normalized) ||
      m.group.toLowerCase().includes(normalized)
    ).slice(0, 20);
  }, [searchText, majors]);

  return (
    <div className="relative w-full sm:w-64">
      <div className="relative">
        <input
          type="text"
          placeholder="Tìm ngành học..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (e.target.value && !isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full px-4 py-2.5 pr-10 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:ring-1 focus:ring-blue-100 outline-none transition-colors"
        />
        {selectedMajor ? (
          <button
            onClick={() => {
              setSearchText("");
              setIsOpen(false);
              onMajorSelect(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        ) : (
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {filteredMajors.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Không tìm thấy ngành học
            </div>
          ) : (
            filteredMajors.map((major) => (
              <button
                key={major.code}
                onClick={() => {
                  onMajorSelect(major.name);
                  setSearchText(major.name);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  selectedMajor === major.name ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                }`}
              >
                <div className="font-medium">{major.name}</div>
                <div className="text-xs text-gray-500">{major.group}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
