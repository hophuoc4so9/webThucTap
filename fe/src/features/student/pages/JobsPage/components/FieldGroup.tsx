import { useState } from "react";

export interface NganhHoc {
  ten: string;
  id_news: string;
}
export interface NhomNganh {
  nhom: string;
  nganh_hoc: NganhHoc[];
}

interface FieldGroupProps {
  group: NhomNganh;
  selected: string[];
  onToggle: (val: string) => void;
}

export function FieldGroup({ group, selected, onToggle }: FieldGroupProps) {
  const checkedCount = group.nganh_hoc.filter((n) =>
    selected.includes(n.ten),
  ).length;
  const [open, setOpen] = useState(checkedCount > 0);

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Group header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
          checkedCount > 0
            ? "text-blue-600 bg-blue-50"
            : "text-gray-500 hover:bg-gray-50"
        }`}
      >
        <span className="flex items-center gap-1.5">
          {group.nhom}
          {checkedCount > 0 && (
            <span className="bg-blue-500 text-white rounded-full px-1.5 py-px text-[9px] font-bold leading-tight">
              {checkedCount}
            </span>
          )}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className={`transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Checkbox list */}
      {open && (
        <div className="pb-1 bg-white">
          {group.nganh_hoc.map((nganh) => {
            const checked = selected.includes(nganh.ten);
            return (
              <label
                key={nganh.id_news}
                className={`flex items-center gap-2.5 px-5 py-2 text-xs cursor-pointer transition-colors select-none ${
                  checked
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <span
                  onClick={() => onToggle(nganh.ten)}
                  className={`w-3.5 h-3.5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                    checked
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {checked && (
                    <svg
                      viewBox="0 0 10 8"
                      width={8}
                      height={8}
                      fill="none"
                      stroke="white"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="1 4 4 7 9 1" />
                    </svg>
                  )}
                </span>
                <span
                  onClick={() => onToggle(nganh.ten)}
                  className="leading-tight"
                >
                  {nganh.ten}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
