import React from "react";

/* ── Accent palette ─────────────────────────────────────────── */
const ACCENT = {
  blue: {
    border: "border-blue-200",
    bar: "bg-blue-500",
    title: "text-blue-700",
    bg: "bg-blue-50",
  },
  orange: {
    border: "border-orange-200",
    bar: "bg-orange-400",
    title: "text-orange-700",
    bg: "bg-orange-50",
  },
  green: {
    border: "border-green-200",
    bar: "bg-green-500",
    title: "text-green-700",
    bg: "bg-green-50",
  },
} as const;

interface SectionCardProps {
  title: string;
  accent?: keyof typeof ACCENT;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  accent = "blue",
  children,
}: SectionCardProps) {
  const c = ACCENT[accent];
  return (
    <div className={`bg-white rounded-xl border ${c.border} overflow-hidden`}>
      <div
        className={`flex items-center gap-3 px-5 py-3 ${c.bg} border-b ${c.border}`}
      >
        <span className={`w-1 h-4 rounded-full ${c.bar} flex-shrink-0`} />
        <h2 className={`font-semibold text-sm ${c.title}`}>{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/* ── Bullet list renderer ───────────────────────────────────── */
interface BulletListProps {
  text: string;
  color?: "default" | "green";
}

export function BulletList({ text, color = "default" }: BulletListProps) {
  const lines = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const dotClass = color === "green" ? "bg-green-500" : "bg-blue-400";
  const textClass = color === "green" ? "text-green-900" : "text-gray-700";

  return (
    <ul className="space-y-2">
      {lines.map((line, i) => (
        <li
          key={i}
          className={`flex items-start gap-2.5 text-sm ${textClass} leading-relaxed`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0 mt-[7px]`}
          />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
