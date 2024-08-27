import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/Plantegning-m-ler/",
  optimizeDeps: {
    include: ["pdfjs-dist"],
  },
  build: {
    outDir: "docs",
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});
