import React from "react";
import { useDarkMode } from "../../hooks/useDarkMode";

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useDarkMode();
  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="px-3 py-1 rounded border bg-gray-200 dark:bg-gray-800 dark:text-white text-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
      aria-label="Chuyển đổi chế độ sáng/tối"
    >
      {isDark ? "🌙 Tối" : "☀️ Sáng"}
    </button>
  );
};

export default ThemeToggle;
