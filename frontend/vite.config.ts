import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

export default defineConfig({
  plugins: [react(), {
    name: 'ar-model-content-type',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0].endsWith('.usdz')) res.setHeader('Content-Type', 'model/vnd.usdz+zip');
        next();
      });
    },
  }],
  server: {
    port: 5173,
    host: "0.0.0.0",
    https: process.env.PHONE_AR_HTTPS === '1' ? {
      cert: readFileSync(new URL('./certs/phone.pem', import.meta.url)),
      key: readFileSync(new URL('./certs/phone-key.pem', import.meta.url)),
    } : undefined,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/ws": { target: "ws://127.0.0.1:8000", ws: true },
    },
  },
});
