import React from "react";
import { Globe } from "lucide-react";

export function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xs text-gray-700 font-medium">{value}</p>
      </div>
    </div>
  );
}

export function WebsiteRow({ website }: { website: string }) {
  return (
    <div className="flex items-start gap-2">
      <Globe size={14} className="text-red-400 mt-1 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 mb-0.5">Website</p>
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-red-500 hover:underline break-all leading-snug"
        >
          {website.replace(/^https?:\/\//, "")}
        </a>
      </div>
    </div>
  );
}
