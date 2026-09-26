import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // LAN のスマホから開発サーバーを開けるようにする
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
