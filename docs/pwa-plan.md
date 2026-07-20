# Plan PWA — GrupEB (SIGEB)

> Documento de contexto y plan de trabajo para convertir el frontend en PWA (instalable + offline + notificaciones push), acotado a: **Login → Home → Cotizar → Pedido → Usuarios → Proveedores → Catálogos administrativo → Expo**.
> Generado a partir de una sesión de planeación — no se ha tocado código todavía. Léelo completo antes de empezar, hay una sección de **supuestos a confirmar** al final.

---

## 1. Objetivo

Dar de alta capacidades PWA en `GrupEB_Frontend` (Vite + React 19 + TS) sin afectar `GrupEB_Backend` (Node/Express + TS + PostgreSQL) salvo lo estrictamente necesario para notificaciones push.

Las tres capacidades pedidas:
1. **Instalable** (manifest + service worker, ícono en escritorio/celular).
2. **Offline real** (no solo el shell de la app — también poder ver datos cacheados y crear/editar mientras no hay red, con sincronización automática al reconectar).
3. **Notificaciones push** (requiere cambios de backend).

---

## 2. Alcance confirmado

### 2.1 Pantallas dentro del alcance
- **Login** (`/`)
- **Home** (`/home`)
- **Cotizar**: lista (`/cotizar`), editar plástico (`/cotizar/:id/editar`), editar papel (`/cotizar/:id/editar-papel`)
- **Pedido**: lista (`/pedido`), editar plástico (`/pedido/:id/editar`), editar papel (`/pedido/:id/editar-papel`)
- **Usuarios** (`/usuarios`)
- **Proveedores** (`/proveedores`)
- **Catálogos administrativo** (`/catalogos` — `src/pages/papel/catalogos.tsx`)
- **Expo** (`/expo` y sus componentes en `src/components/expo/*`, `src/hooks/expo/*`)

### 2.2 Fuera de alcance (no se toca, ni shell offline “completo” ni sync)
- Diseño / Orden de Diseño
- Anticipo y Liquidación
- Estado de Cuenta
- Seguimiento (planta)
- Envíos/Entregas (carrito, notas de remisión, paquetería, unidades)
- **Archivos / Gestor de Archivos** (descartado explícitamente — no lo usa ni Cotizar/Pedido ni Expo, y offline de archivos es mucho más pesado: habría que guardar blobs en IndexedDB y subirlos al reconectar)
- Backups

### 2.3 Endpoints/datos que hay que cachear (aunque su pantalla admin dedicada no esté siempre en foco)
Estos son los que Cotizar/Pedido/Expo consumen para funcionar, descubiertos revisando imports reales del código:

| Servicio frontend | Usado por | Notas |
|---|---|---|
| `clientesService` (`getClienteById`) | Cotizar, Pedido, Expo | lectura |
| `clientesService` (`updateCliente`) | Expo (`RegistroCliente.tsx`) | **escritura → va a la cola offline (outbox)**, decisión confirmada |
| `productosPlasticoService`, `catalogos-productos` | Cotizar, Pedido | lectura |
| `papel/papelCotizacionService` (`getOpcionesProductoPapel`, `getFoils`, `getTexturas`) | Cotizar papel, Expo | lectura |
| `papel/catalogoPapelInsumoService`, `papel/foil.service` | pantalla Catálogos administrativo | lectura |
| `proveedoresService` (`getTiposInsumo`, `buscarInsumos`) | Expo (`ModalProducto.tsx`) | lectura — este es el motivo real por el que Proveedores entra al alcance de datos |
| `tarifas.service`, `plastico/calculadorPrecioPlastico.service`, `papel/calculadorPrecioPapel.service` | Cotizar, Expo | cálculo de precios |
| `catalogos-produccion` | Cotizar papel | lectura |
| `usuariosService` | pantalla Usuarios | CRUD completo |
| `services/expo/expoService.ts` | Expo | propio del módulo, CRUD |
| `ventasservice` (`getVentaByPedido`) | Expo (`ListaCotizaciones.tsx`) | lectura |
| `correoService` (`enviarCorreoDocumento`) | Expo | **escritura → va a la cola offline (outbox)**, igual que el resto (decisión corregida, ver §6) |
| `generarPdfCotizacion`, `generarPdfPedido` | Cotizar, Pedido, Expo | 100% client-side (jsPDF), no dependen de red |

---

## 3. Decisiones de arquitectura

- **`vite-plugin-pwa` en modo `injectManifest`** (no `generateSW`) — necesitamos un service worker propio (`src/sw.ts`) para poder meter listeners de `push` / `notificationclick` y reglas de caché a medida. El plugin solo inyecta el precache del build ahí dentro.
- **IndexedDB vía `idb`** para la cola de operaciones pendientes (outbox), no `localStorage` (muy chico, síncrono, bloquea el hilo principal).
- **Sincronización manual por evento `online`**, no `Background Sync API` de Workbox — porque Safari/iOS no la soporta y hay que asumir uso en iPhone/iPad. Es menos automático pero funciona en todos los navegadores.
- **`web-push` + VAPID keys** en el backend para push (estándar, sin depender de Firebase/terceros).
- **Caveat iOS**: push solo funciona si la app está instalada a la pantalla de inicio (modo standalone) y con iOS ≥ 16.4. Hay que comunicárselo a los usuarios de iPhone.

---

## 4. Contexto técnico relevante (ya verificado en el código actual)

- **Frontend**: Vite 7, React 19, TS, `react-router-dom` 7, Tailwind 4. Sin PWA plugin instalado todavía. Sin `vite-env.d.ts`.
- **`vite.config.ts`** actual: solo `react()` y `tailwindcss()`.
- **`index.html`**: sin meta tags PWA todavía.
- **Auth frontend** (`src/services/api.ts`): token JWT en `localStorage`, se manda como header `Authorization: Bearer` en cada request (interceptor de axios). Si un 401 no viene de rutas de excepción (`/auth/`, `/backups/...`), borra sesión y redirige a `/`. Esto es relevante para la Fase 3: si el navegador está offline, axios va a fallar por red (no por 401), así que el interceptor actual no interfiere con la lógica de "encolar si no hay red" — hay que distinguir explícitamente error de red vs. error 401.
- **Backend**: Express 5 + `pg` (PostgreSQL) + JWT (cookie o header, ambos soportados por `auth.middleware.ts`) + helmet + rate limiting. `app.ts` monta ~40 routers bajo `/api/*`. Entry point real: `src/server.ts` (no `index.ts`).
- **Controladores relevantes ya localizados** (para engancharles el push en Fase 4):
  - `src/controllers/cotizaciones/cotizaciones.controller.ts`
  - `src/controllers/pedidos/pedidos.controller.ts`
  - `src/controllers/expo/expo.controller.ts` (+ `src/services/expo/catalogoPapelExpo.service.ts`, `src/repositories/expo/catalogoPapelExpo.repository.ts`)

---

## 5. Plan de trabajo por fases

### Fase 0 — Setup base del PWA
**Nuevos:**
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- `src/sw.ts` — service worker propio (precache del build + navigateFallback SPA)
- `src/pwa/registerSW.ts` — registro del SW

**Modificar:**
- `package.json` (frontend) — agregar `vite-plugin-pwa`, `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration`, `idb`
- `vite.config.ts` — `VitePWA({ strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', manifest: {...} })`
- `index.html` — meta tags PWA (`theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon`, etc.)
- `src/main.tsx` — invocar el registro del SW
- `.gitignore` — agregar `dev-dist/`

### Fase 1 — Instalabilidad con UX propia
**Nuevos:**
- `src/hooks/usePWAInstall.ts` — captura `beforeinstallprompt`
- `src/components/InstallButton.tsx`
- `src/components/PWAUpdatePrompt.tsx` — aviso de nueva versión disponible

**Modificar:**
- `src/layouts/Sidebar.tsx` — montar `InstallButton` y `PWAUpdatePrompt`

### Fase 2 — Offline de lectura
**Nuevos:**
- `src/hooks/useOnlineStatus.ts`
- `src/components/OfflineBanner.tsx`
- `src/components/RequiereConexion.tsx` — guard para las pantallas fuera de alcance (para que no truenen feo si el usuario navega ahí sin red)

**Modificar:**
- `src/sw.ts` — `registerRoute` con estrategia `NetworkFirst` + `ExpirationPlugin` para todos los endpoints listados en la sección 2.3
- `src/App.tsx` o `src/layouts/Sidebar.tsx` — montar `OfflineBanner`
- Páginas fuera de alcance (`Diseno.tsx`, `AnticipoLiquidacion.tsx`, `Seguimiento.tsx`, `Envios.tsx`, `EstadoCuenta.tsx`) — envolver con `RequiereConexion`

### Fase 3 — Offline de escritura + sincronización (outbox)
**Nuevos:**
- `src/offline/db.ts` — wrapper IndexedDB (`idb`) con store `outbox`
- `src/offline/outbox.ts` — encolar / leer / borrar operaciones pendientes
- `src/offline/useSyncOutbox.ts` — hook que escucha `online` y reproduce la cola contra `api`
- `src/components/SyncStatusIndicator.tsx` — "N cambios pendientes de sincronizar"

**Modificar (agregar detección de fallo de red → encolar en vez de fallar):**
- `src/services/cotizacionesService.ts`
- `src/services/pedidosService.ts`
- `src/services/clientesService.ts` (específicamente `updateCliente`, usado desde Expo)
- `src/services/expo/expoService.ts`
- `src/pages/Cotizar.tsx`, `src/pages/Pedido.tsx`
- `src/components/EditarPedido.tsx`, `src/pages/EditarCotizacionCompleta.tsx`, `src/pages/EditarCotizacionPapelCompleta.tsx`, `src/pages/EditarPedidoPapel.tsx`
- `src/components/expo/RegistroCliente.tsx`, `src/components/expo/ModalProducto.tsx`, `src/components/expo/ListaCotizaciones.tsx` — estado optimista / etiqueta "pendiente" en filas encoladas
- `src/services/correoService.ts` — detección de fallo de red → encolar `enviarCorreoDocumento`
- `src/pages/Usuarios.tsx`, `src/pages/ProveedoresPage.tsx`, `src/pages/papel/catalogos.tsx` — mismo tratamiento de encolado para sus operaciones de escritura (confirmado, ver §6 y §7.1)

### Fase 4 — Notificaciones push

**Backend — nuevos:**
- `src/config/webpush.ts` — configuración VAPID
- Migración SQL — tabla `push_subscriptions` (`usuario_id`, `endpoint`, `keys` jsonb, `created_at`)
- `src/controllers/push/push.controller.ts` — subscribe/unsubscribe
- `src/routes/push/push.routes.ts`
- `src/services/push/pushSender.ts` — `enviarPush(usuarioId, payload)`

**Backend — modificar:**
- `package.json` (backend) — agregar `web-push`
- `src/app.ts` — montar `/api/push`
- `.env.example` — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `src/controllers/cotizaciones/cotizaciones.controller.ts` — disparar push en aprobación/rechazo
- `src/controllers/pedidos/pedidos.controller.ts` — disparar push en creación/cambio de estado
- `src/controllers/expo/expo.controller.ts` — disparar push en eventos relevantes de Expo *(ver supuesto §7.2)*

**Frontend — nuevos:**
- `src/services/pushService.ts`
- `src/hooks/useNotificationPermission.ts`
- `src/components/NotificationOptIn.tsx`

**Frontend — modificar:**
- `src/sw.ts` — listeners `push` y `notificationclick`
- `src/pages/Home.tsx` — montar el opt-in
- variables de entorno — `VITE_VAPID_PUBLIC_KEY`

### Fase 5 — QA
- Auditoría Lighthouse PWA
- Instalación en Chrome desktop, Android, iOS Safari
- Offline: cortar red en DevTools, navegar Cotizar/Pedido/Expo, crear/editar algo offline, reconectar y verificar sync + resolución de conflictos (mensaje al usuario, no pérdida silenciosa)
- Push end-to-end: suscripción → evento backend → notificación → click → navega a la pantalla correcta

---

## 6. Decisiones ya tomadas en la sesión de planeación (changelog)

1. Alcance inicial: Login → Home → Cotizar → Pedido (excluyendo Diseño/Anticipo en adelante).
2. Se agregan al alcance: Usuarios, Proveedores, Catálogos administrativo, **y especialmente Expo**.
3. Se descubre que Expo llama directo a `clientesService`, `proveedoresService`, `papelCotizacionService`, calculadores de precio, `correoService` y `ventasservice` — no pasa por las pantallas admin.
4. Se confirma: notificaciones push sí se implementan, con cambios de backend incluidos (no hay problema).
5. Se confirma: `updateCliente` desde Expo **entra a la cola offline** (mismo patrón que cotizar/pedido).
6. ~~Se confirma: `enviarCorreoDocumento` (Expo) requiere conexión, no se encola.~~ **Corregido:** no hay razón técnica para bloquearlo — también entra a la cola offline (outbox), se envía solo al reconectar.
7. Se descarta: Archivos/Gestor de Archivos — no lo usa nadie en el alcance, y offline de archivos es demasiado costoso para el beneficio.
8. Se confirma: Usuarios/Proveedores/Catálogos administrativo usan el mismo patrón de encolado que el resto (sin excepción especial) — el único riesgo (validaciones de unicidad que no se pueden checar offline) ya lo cubre el manejo de conflictos de §7.3.
9. Se aclara: **push y el outbox son mecanismos independientes** — el encolado se activa por fallo de red al guardar, y se sincroniza con el evento `online` del navegador; push no interviene en ese flujo (ver §7.2).

---

## 7. Supuestos — resueltos / pendientes

### 7.1 Profundidad offline de Usuarios / Proveedores / Catálogos administrativo — RESUELTO
Se confirma el mismo patrón de encolado que el resto (sin excepciones especiales para creación de usuario, `toggleActivoUsuario`, etc.). El único riesgo real no es de diseño sino de **validaciones de unicidad** (ej. correo/código de usuario duplicado) que no se pueden checar contra el servidor estando offline — eso se resuelve con el mismo manejo de conflictos de §7.3 (avisar al usuario si el backend rechaza la operación encolada al sincronizar), no requiere una excepción aparte.

**Riesgo nuevo detectado por esta discusión — JWT expirado durante offline prolongado:** el JWT dura 10h (`auth.controller.ts`). Si un usuario pasa más de 10h sin conexión (plausible en una expo de todo el día sin señal) y su token expira antes de reconectar, las peticiones encoladas van a fallar con 401 al sincronizar, no por el motivo de negocio sino por sesión vencida. Falta decidir cómo manejarlo: ¿se le pide reloguear y se reintenta la cola automáticamente después, o se pierde el cambio? — **pendiente de definir en la Fase 3.**

### 7.2 Eventos que disparan push — PENDIENTE (aclarado el mecanismo)
Push y el outbox son independientes (ver §6.9) — esto solo trata de qué eventos de negocio deben notificar. Propuesta a validar:
- Cotización aprobada / rechazada
- Pedido creado / cambio de estado
- ¿Algún evento propio de Expo (ej. nueva cotización registrada en el módulo)?
- Opcional: notificación local de "tus cambios se sincronizaron" al vaciarse el outbox

### 7.3 Resolución de conflictos de sincronización — RESUELTO
Confirmado: por ahora basta con **avisar** al usuario si el backend rechaza una operación encolada (ej. el mismo pedido fue editado por alguien más, o una validación de unicidad falla). No hay merge automático.

### 7.4 Límite de tamaño de caché — RESUELTO (corregido, ver detalle por endpoint real)
Importante: `maxEntries` de Workbox cuenta **respuestas HTTP cacheadas por URL completa** (incluye query params), no registros dentro del JSON. `GET /pedidos` con 500 pedidos adentro sigue siendo 1 sola entrada.

Revisando los endpoints reales:
- `GET /cotizaciones` y `GET /pedidos` (`cotizacionesService.ts`, `pedidosService.ts`) son listas **planas sin parámetros** — siempre la misma URL, siempre 1 sola entrada que se sobreescribe con `NetworkFirst`. Aquí `maxEntries` casi no importa (basta con 2–5), lo relevante es `maxAgeSeconds: 1 día` — se prioriza frescura porque es lo que más le importa a un vendedor (estado de pedido, precio vigente), y una empresa de este tamaño normalmente sí tiene conexión al menos una vez al día para refrescar.
- Endpoints **parametrizados** son los que de verdad generan muchas entradas distintas — ahí sí importa `maxEntries`. Con `NetworkFirst` la entrada cacheada solo se usa cuando no hay red (si hay señal, siempre jala datos frescos), así que ser generoso aquí no tiene casi costo (JSON liviano) y sí ayuda a cubrir más escenarios de campo sin conexión — para una empresa de este tamaño conviene aflojar el límite en vez de apretarlo:
  - `GET /pedidos/historial/:clienteId` — 1 entrada por cliente consultado → `maxEntries: 100` (cubre semanas de actividad de campo), `maxAgeSeconds: 1 día`
  - `buscarInsumos` en `proveedoresService.ts` (`params: { q }`, usado desde `ModalProducto.tsx` en Expo) — 1 entrada por texto de búsqueda distinto → **hay que debouncear la búsqueda en el componente** para no generar una entrada por cada tecla, y poner `maxEntries: 150–200` (el catálogo de insumos de una empresa así probablemente ni llega a esa cantidad de términos distintos), `maxAgeSeconds: 7 días` (los insumos cambian poco)
  - Igual aplica a cualquier búsqueda parametrizada que se agregue en Usuarios/Proveedores/Catálogos administrativo al implementar la Fase 3
- Catálogos sin parámetros que cambian poco (productos, precios, foils/texturas): `maxEntries: 10–20` sigue siendo de sobra (no hay tantas URLs distintas posibles), `maxAgeSeconds: 7 días`
- No es una preocupación de espacio en disco (solo JSON, muy liviano) — el límite es para evitar mostrar datos demasiado viejos como si fueran vigentes, no por storage.

---

## 8. Riesgos y limitaciones generales
- iOS: push y algunas APIs de storage se comportan distinto en modo standalone vs. Safari normal.
- El interceptor de axios actual (`api.ts`) redirige a login en cualquier 401 fuera de rutas exceptuadas — hay que verificar que un error de **red** (offline) nunca se confunda con un 401 real dentro de la lógica de encolado.
- Expandir el alcance a Usuarios/Proveedores/Catálogos administrativo/Expo multiplica la superficie de la Fase 3 (outbox) — es la fase más pesada del plan completo.
- **JWT de 10h vs. offline prolongado** (ver §7.1) — la cola puede intentar sincronizar con un token ya vencido tras una jornada larga sin señal; falta definir el manejo (re-login + reintento automático es lo más probable).

---

## 9. Cómo arrancar (checklist para la próxima sesión)
1. Definir el manejo de JWT expirado durante sync (único punto realmente abierto de la sección 7, junto con la lista final de eventos de push en §7.2).
2. Ejecutar Fase 0 completa y verificar que la app se instale correctamente (Lighthouse) antes de seguir.
3. Fase 1 y 2 pueden ir juntas.
4. Fase 3 (outbox) se implementa módulo por módulo — sugerido: Cotizar/Pedido primero (ya validado el patrón), luego Expo (incluye `correoService` y `updateCliente`), luego Usuarios/Proveedores/Catálogos.
5. Fase 4 (push) al final, es independiente del resto y se puede paralelizar si hay más de una persona trabajando.
