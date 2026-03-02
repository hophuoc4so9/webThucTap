export function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white animate-slide-in-left
      ${type === "success" ? "bg-green-500" : "bg-red-500"}`}
    >
      {type === "success" ? "✓" : "✕"} {message}
    </div>
  );
}
