import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Recepten",
        short_name: "Recepten",
        description: "Mijn persoonlijke receptenverzameling",
        lang: "nl",
        start_url: "/",
        display: "standalone",
        background_color: "#fffaf3",
        theme_color: "#c2410c",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Never cache API responses; recipes must always be fresh.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
