import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  base: isGitHubPages ? "/pos-app/" : "/",
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
    APP_BUILD_DATE: JSON.stringify(new Date().toISOString().slice(0, 10).replace(/-/g, ".")),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
