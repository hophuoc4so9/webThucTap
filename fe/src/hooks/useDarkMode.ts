import { useEffect, useState } from "react";

export function useDarkMode() {
  const [isDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  const setIsDark: (dark: boolean) => void = () => {};

  return [isDark, setIsDark] as const;
}
