import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      registerType: "prompt",
      devOptions: {
        enabled: false,
      },
      injectManifest: {
        // El bundle principal hoy pesa >2 MiB (sin code-splitting) — se sube
        // el límite para que Workbox lo precachee. Ver aviso de Vite sobre
        // dividir el bundle; es un tema de rendimiento aparte del PWA.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Por defecto Workbox solo precachea js/css/html — se agregan las
        // imágenes (íconos del Home, logos, etc.) para que el shell offline
        // no muestre imágenes rotas.
        globPatterns: ["**/*.{js,css,html,png,svg,jpg,jpeg,webp,ico}"],
      },
      manifest: {
        name: "SIGEB - Sistema de Gestión",
        short_name: "SIGEB",
        description:
          "Sistema de gestión empresarial para pedidos, producción, envíos y control administrativo.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        lang: "es",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  build: {
    outDir: "dist",
  },
});