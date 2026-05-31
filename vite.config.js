import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  base: "/cos30043/s105292789/project/dist",
  plugins: [vue()],

  server: {
    proxy: {
      "/api": {
        target: "https://modern-web-application-backend-production.up.railway.app",
        changeOrigin: true,
        secure: true,
      },
      "/socket.io": {
        target: "https://modern-web-application-backend-production.up.railway.app",
        changeOrigin: true,
        ws: true,
        secure: true,
      },
    },
  },
});
