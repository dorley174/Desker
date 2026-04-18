import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const isPages = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  base: isPages ? "/Desker/" : "/",
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