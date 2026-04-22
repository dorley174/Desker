import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const isPages = process.env.GITHUB_ACTIONS === "true";
const configuredBase = process.env.VITE_APP_BASE_PATH;
const basePath = configuredBase || (isPages ? "/Desker/" : "/");

export default defineConfig({
  base: basePath,
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
