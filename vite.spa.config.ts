import path from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "spa",
  publicDir: path.resolve(__dirname, "public"),
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    "import.meta.env.VITE_FOLIO_SPA": JSON.stringify("1"),
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
