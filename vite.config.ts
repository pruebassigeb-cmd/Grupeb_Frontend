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
      // "prompt" NO significa que se le pregunte nada al usuario: significa que
      // el plugin deja el service worker nuevo en "waiting" y le cede al cliente
      // la decisión de cuándo activarlo. PWAUpdatePrompt.tsx la toma solo, sin
      // botones — espera a que el usuario cambie de pantalla para no borrarle un
      // formulario a medio llenar. Con "autoUpdate" esa espera no es posible: el
      // SW nuevo se activaría de inmediato.
      registerType: "prompt",
      devOptions: {
        // Con esto `npm run dev` también levanta el service worker, así que el
        // ciclo completo de actualización automática se puede probar en local
        // sin tener que hacer `npm run build` + `npm run preview`.
        enabled: true,
        // El SW se sirve como módulo ES porque src/sw.ts se entrega sin
        // bundlear en desarrollo (importa workbox-* con imports normales).
        type: "module",
        // Obligatorio con `strategies: "injectManifest"`: en desarrollo el
        // plugin reemplaza `self.__WB_MANIFEST` por `[{ url: navigateFallback }]`,
        // y sin esto queda en `[]` — entonces el
        // `createHandlerBoundToURL("/index.html")` de src/sw.ts truena al
        // activarse con un error "non-precached-url".
        navigateFallback: "index.html",
        // Silencia el aviso de Workbox por no tener globPatterns en dev.
        suppressWarnings: true,
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
  // `virtual:pwa-register/react` carga workbox-window con un import dinámico,
  // así que en `npm run dev` Vite lo descubre tarde: reoptimiza dependencias a
  // media carga, tumba el módulo con un 504 "Outdated Optimize Dep" y el
  // registro del service worker falla en el primer arranque. Declararlo aquí
  // hace que se prebundlee desde el principio.
  optimizeDeps: {
    include: ["workbox-window"],
  },
  build: {
    outDir: "dist",
  },
});