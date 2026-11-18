import { useCallback, useEffect, useState } from "react";

// Dark by default, as in the previous version; the header's button switches to
// light and back, remembered in this browser. public/theme.js applies the
// choice before React starts.

export type Theme = "light" | "dark";

function storedTheme(): Theme {
  try {
    return localStorage.getItem("theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Storage refused (private mode): the choice lasts for this page only.
    }
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    [],
  );
  return { theme, toggleTheme };
}
