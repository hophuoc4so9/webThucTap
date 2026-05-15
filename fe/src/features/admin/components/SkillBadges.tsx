import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    approved: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    stopword: "bg-rose-500/20 text-rose-500 border-rose-500/30",
    alias: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    rejected: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", styles[status] || styles.pending)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const TypeBadge = ({ type }: { type: string }) => {
  const styles: Record<string, string> = {
    hard: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    soft: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    language: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    certificate: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    unknown: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    noise: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  };

  return (
    <span className={cn("px-2 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase border", styles[type] || styles.unknown)}>
      {type}
    </span>
  );
};
