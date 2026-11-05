import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias:
        mode === "production"
          ? [
              {
                find: /^\.\/demo$/,
                replacement: fileURLToPath(
                  new URL("./src/demo-disabled.ts", import.meta.url),
                ),
              },
            ]
          : [],
    },
    server: {
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://localhost:5183",
          changeOrigin: true,
          secure: true,
        },
        "/uploads": {
          target: env.API_PROXY_TARGET || "http://localhost:5183",
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
