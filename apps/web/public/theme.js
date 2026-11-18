// Dark unless the visitor chose light (src/theme.ts), applied before the page
// renders so it doesn't flash. A file, not an inline script: the CSP allows
// scripts from this site only.
try {
  if (localStorage.getItem("theme") !== "light") {
    document.documentElement.classList.add("dark");
  }
} catch {
  document.documentElement.classList.add("dark");
}
