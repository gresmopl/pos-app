import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  base: isGitHubPages ? "/pos-app/" : "/",
  define: (() => {
    // Timestamp w strefie Europe/Warsaw (spojny miedzy buildem lokalnym i GitHub Actions w UTC)
    // toLocaleString("sv-SE") zwraca format "2026-04-13 11:47:00"
    const parts = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Warsaw" });
    const [date, time] = parts.split(" ");
    const [yyyy, mm, dd] = date.split("-");
    const [hh, mi] = time.split(":");
    const stamp = `${yyyy.slice(2)}${mm}${dd}.${hh}${mi}`;
    return {
      APP_VERSION: JSON.stringify(`${pkg.version}.${stamp}`),
    };
  })(),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
