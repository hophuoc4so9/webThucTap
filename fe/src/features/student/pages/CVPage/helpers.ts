export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const FILE_COLOR: Record<string, string> = {
  pdf: "bg-red-50 text-red-600",
  doc: "bg-blue-50 text-blue-600",
  docx: "bg-blue-50 text-blue-600",
};

export const fileExt = (name?: string) =>
  name?.split(".").pop()?.toLowerCase() ?? "";
