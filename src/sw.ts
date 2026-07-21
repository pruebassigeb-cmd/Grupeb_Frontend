/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Sin esto, un SW recién activado NO controla la pestaña que lo registró
// hasta la siguiente recarga — las peticiones de esa sesión (incluido el
// precalentamiento de warmApiCache.ts) pasan de largo sin pasar por el
// cacheo. clientsClaim() hace que tome control de inmediato al activarse.
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

// ============================================================
// Runtime caching — datos de lectura para Cotizar/Pedido/Usuarios/
// Proveedores/Catálogos administrativo/Expo. Ver docs/pwa-plan.md
// §2.3 y §7.4 para el detalle de qué entra y por qué.
//
// Todas usan NetworkFirst: si hay red, siempre trae datos frescos;
// la copia cacheada solo se sirve cuando falla la red. El orden de
// registro importa (gana la primera ruta que haga match), por eso
// las más específicas van antes que el bucket genérico de catálogos.
// ============================================================

const DIA = 24 * 60 * 60;

// Listas transaccionales (cotizaciones, pedidos): se prioriza frescura,
// por eso maxAgeSeconds es más corto que el resto.
registerRoute(
  ({ url }) => /\/api\/(cotizaciones|pedidos)$/.test(url.pathname),
  new NetworkFirst({
    cacheName: "api-transaccional",
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: DIA })],
  })
);

// Historial de pedidos por cliente (Estado de Cuenta usa lo mismo, pero
// ese ya no aplica porque queda fuera de alcance): 1 entrada por cliente.
registerRoute(
  ({ url }) => /\/api\/pedidos\/historial\/[^/]+$/.test(url.pathname),
  new NetworkFirst({
    cacheName: "api-historial-cliente",
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: DIA })],
  })
);

// Búsqueda de insumos (Expo -> ModalProducto): 1 entrada por término
// de búsqueda distinto — requiere que el componente debouncee la
// búsqueda para no llenar esto con una entrada por tecla.
registerRoute(
  ({ url }) => url.pathname === "/api/proveedores/insumos",
  new NetworkFirst({
    cacheName: "api-busqueda-insumos",
    plugins: [new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 7 * DIA })],
  })
);

// Catálogos y datos de apoyo (cambian poco): clientes, usuarios,
// proveedores, productos, precios, catálogos de producción/papel,
// ventas y el módulo Expo.
const PREFIJOS_CATALOGOS = [
  "/api/clientes",
  "/api/usuarios",
  "/api/roles",
  "/api/privilegios",
  "/api/proveedores",
  "/api/tarifas",
  "/api/catalogos-productos",
  "/api/productos-plastico",
  "/api/productos-papel",
  "/api/foil",
  "/api/catalogos-papel",
  "/api/catalogos-produccion",
  "/api/precios-acabados-papel",
  "/api/catalogos/",
  "/api/cotizaciones/colores-asa",
  "/api/cotizaciones/medidas-troquel",
  "/api/colores-asa",
  "/api/ventas",
  "/api/expo",
];

registerRoute(
  ({ url }) => PREFIJOS_CATALOGOS.some((prefijo) => url.pathname.startsWith(prefijo)),
  new NetworkFirst({
    cacheName: "api-catalogos",
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * DIA })],
  })
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================================
// Notificaciones push — infraestructura lista para cuando el backend
// empiece a mandar push reales (Fase 4, ver docs/pwa-plan.md). Hoy el único
// disparador activo es la notificación LOCAL de "Expo sincronizado"
// (src/pwa/notificacionesLocales.ts), que llama a
// self.registration.showNotification() directo sin pasar por el evento
// "push" — ese evento es exclusivo de un push real mandado por el servidor.
// `notificationclick` sí aplica a ambos casos por igual.
// ============================================================

self.addEventListener("push", (event: PushEvent) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "GrupEB", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await (client as WindowClient).navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
