import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const ExpandSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-100 pt-3 mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {title}
      </button>
      {open && (
        <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
          {children}
        </p>
      )}
    </div>
  );
};
