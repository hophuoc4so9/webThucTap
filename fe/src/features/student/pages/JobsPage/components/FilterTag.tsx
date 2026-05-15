import { X } from "lucide-react";

interface FilterTagProps {
  label: string;
  onRemove: () => void;
}

export function FilterTag({ label, onRemove }: FilterTagProps) {
  return (
    <span className="flex items-center gap-1 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-blue-200 transition-colors"
      >
        <X size={11} />
      </button>
    </span>
  );
}
