import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeContext, useThemeProvider } from "@/hooks/useTheme.ts";
import { Router } from "@/router/Router.tsx";
import "@/styles/app.css";

function App() {
  const themeValue = useThemeProvider();

  return (
    <ThemeContext.Provider value={themeValue}>
      <Router />
    </ThemeContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
