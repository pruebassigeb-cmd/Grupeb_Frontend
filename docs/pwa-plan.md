# Plan PWA — GrupEB (SIGEB)

> Documento de contexto y plan de trabajo para convertir el frontend en PWA (instalable + offline + notificaciones push), acotado a: **Login → Home → Cotizar → Pedido → Usuarios → Proveedores → Catálogos administrativo → Expo → Dar de alta productos (Plástico y Papel)**.
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
- **Dar de alta productos — Plástico** (`/plastico`, agregado en Fase 2 tras confirmar que también necesita PWA)
- **Dar de alta productos — Papel** (`/papel`, agregado junto con Plástico)

### 2.2 Fuera de alcance (no se toca, ni shell offline “completo” ni sync)
- Diseño / Orden de Diseño
- Anticipo y Liquidación
- Estado de Cuenta
- Seguimiento (planta)
- Envíos/Entregas (carrito, notas de remisión, paquetería, unidades)
- **Gestor de Archivos** (`/archivos`, la pantalla administrativa) — sigue descartada, nadie la usa dentro del alcance
- Backups

**Matiz importante sobre "archivos":** aunque la pantalla `/archivos` está fuera de alcance, el **endpoint `POST /archivos/upload`** (subir una imagen/documento) sí se usa *dentro* de pantallas que sí están en alcance — Expo (`ModalProducto.tsx`, `ModalCatalogoExpo.tsx`) y Plástico/Papel (`ArchivosProductoPlastico.tsx`, formularios de alta de papel) lo llaman para adjuntar fotos de producto. Es una escritura (POST/PUT), no una lectura — no lo resuelve el cacheo de la Fase 2. Se confirmó que **sí debe encolarse offline igual que el resto de la Fase 3** (guardar el archivo en IndexedDB y subirlo al reconectar), no solo requerir conexión. Ver Fase 3 para el diseño de esto — es la pieza más pesada de todo el plan porque implica manejar blobs, no solo JSON.

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
| `rolesService` (`getRoles`), `privilegiosService` (`getPrivilegios`) | `FormularioUsuario.tsx` (crear/editar usuario) | lectura — **faltaba en la implementación de Fase 2, corregido tras reporte** |
| `productosPlasticoService` (`getCalibres`), `plastico/catalogosPlasticoAdminService` (`getTiposProductoAdmin`, `getMaterialesAdmin`, `getCalibresAdmin`) | pantalla Plástico (`/plastico`, vía `useCatalogosPlastico`) | lectura |
| `papel/papel.service` (`fetchTamanosProducto`, `fetchCatalogosPapel`, `fetchProductosPapel`) | pantalla Papel (`/papel`) | lectura |
| `papel/preciosAcabadosPapel.service` (`getCostoMetroLaminado`) | formularios de alta de papel | lectura |
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

### Fase 2 — Offline de lectura — ✅ IMPLEMENTADA
**Nuevos:**
- `src/hooks/useOnlineStatus.ts`
- `src/components/OfflineBanner.tsx` — montado en `App.tsx` (no en Sidebar, para que cubra también el Login)
- `src/components/ConnectivityToast.tsx` — a diferencia de `OfflineBanner` (estado persistente mientras se está offline), este avisa el **momento** de la transición: toast al perder conexión y toast distinto al recuperarla (reutiliza `showAlert`/`CustomAlert`, que ya se auto-monta solo con importarlo — no fue necesario un componente `Modal` nuevo)
- `src/components/RequiereConexion.tsx` — guard para las pantallas fuera de alcance
- `src/pwa/warmApiCache.ts` — precalienta ~35 endpoints de lectura al iniciar sesión (o restaurar sesión) y cada vez que vuelve la conexión, para que Cotizar/Pedido/Usuarios/Proveedores/Catálogos/Expo/Plástico/Papel ya tengan datos guardados sin que el usuario visite cada pantalla primero. Tiene guard contra corridas duplicadas en paralelo.

**Modificado:**
- `src/sw.ts` — 4 buckets de `NetworkFirst` + `ExpirationPlugin`: `api-transaccional` (cotizaciones/pedidos), `api-historial-cliente`, `api-busqueda-insumos`, `api-catalogos` (todo lo demás, incluye ahora `/roles`, `/privilegios` y `/precios-acabados-papel` — faltaban en la primera pasada)
- `src/App.tsx` — monta `OfflineBanner`
- `src/context/AuthContext.tsx` — dispara `warmApiCache()` cuando hay `user?.id` + `navigator.onLine`, y de nuevo en el evento `online`
- Páginas fuera de alcance (`Diseno.tsx`, `AnticipoLiquidacion.tsx`, `Seguimiento.tsx`, `Envios.tsx`, `EstadoCuenta.tsx`) — envueltas con `RequiereConexion`

**Nota:** en esta fase se agregaron **Plástico (`/plastico`) y Papel (`/papel`)** al alcance (ver §2.1 y changelog #10) — sus dependencias de lectura (`getCalibres`, catálogos admin de plástico, `papel.service`, `preciosAcabadosPapel.service`) ya están cacheadas y precalentadas.

### Fase 3 — Offline de escritura + sincronización (outbox) — 🔶 EN PROGRESO

**Infraestructura core — ✅ implementada y verificada:**
- `src/offline/db.ts` — wrapper IndexedDB (`idb`), store `outbox` (keyPath `id`, índice `by-createdAt`)
- `src/offline/outbox.ts` — `ejecutarOEncolar()` (ejecuta la escritura; si falla por red, la guarda y lanza `OperacionEncoladaError`), `sincronizarOutbox()` (reproduce la cola FIFO, se detiene ante 401, descarta rechazos 4xx reales, deja en cola los 5xx/timeout para reintentar)
- `src/offline/useSyncOutbox.ts` — dispara sync al montar (si hay sesión + red) y en cada evento `online`
- `src/components/SyncStatusIndicator.tsx` — montado en `App.tsx`; **único** componente que llama `useSyncOutbox` (a propósito — si dos componentes distintos lo llamaran cada uno dispararía su propia sincronización en paralelo y se duplicarían las peticiones encoladas). Renderiza dos vistas según el estado: un **modal** centrado con spinner mientras `sincronizando === true` ("Sincronizando cambios"), y una insignia en la esquina inferior izquierda cuando solo hay pendientes sin sincronizar activamente ("N cambios pendientes de sincronizar")

**Patrón de diseño clave:** `ejecutarOEncolar()` no cambia el tipo de retorno de la función original (`Promise<T>`) — en el camino offline, lanza `OperacionEncoladaError` en vez de devolver un valor especial. Esto significa que los callers que **no** se actualicen todavía simplemente ven "un error más" en su catch existente (no se rompe nada), y los que sí se actualizan pueden capturar ese tipo específico para mostrar "se guardó, se sube solo" en vez de un error genérico. Permite ir cableando servicio por servicio sin tener que tocar todos los call sites de una vez.

**Verificado end-to-end en el sandbox de pruebas** (esto sí se pudo probar sin backend real, porque IndexedDB funciona localmente): se insertó una entrada de prueba directo en la base, se confirmó que `SyncStatusIndicator` la detecta ("1 cambio pendiente"), que el intento automático de sincronización la deja en la cola cuando falla (no la borra), y que registra `intentos`/`ultimoError` correctamente.

**Ya cableado:**
- `src/services/cotizacionesService.ts` — `crearCotizacion` usa `ejecutarOEncolar`
- `src/pages/Cotizar.tsx` — captura `OperacionEncoladaError` en `handleSubmit`, cierra el modal, refresca la lista y avisa (sin intentar generar el PDF, que necesita el folio real del servidor)
- `src/services/clientesService.ts` — `updateCliente` usa `ejecutarOEncolar`
- `src/pages/expo/expo.tsx` — `guardarConOpciones` captura `OperacionEncoladaError` al llamar `crearCotizacionExpo`, limpia el formulario y avisa (sin generar PDF/correo, que necesitan el folio real)
- `src/components/expo/ListaCotizaciones.tsx` — `handleGuardarClienteYContinuar` captura `OperacionEncoladaError` de `updateCliente`; avisa que el cliente se guardó pero **no** continúa hacia el modal de aprobar (esa acción sí requiere red)
- `src/components/ConnectivityToast.tsx` — toast al perder/recuperar conexión (no es parte del outbox en sí, pero se agregó en esta misma sesión de trabajo)
- **Expo completo (§ ronda 2):**
  - `crearClienteExpo`/`actualizarClienteExpo` (expoService) + los 3 puntos de escritura en `RegistroCliente.tsx` (`guardarYCotizar`, `soloGuardar`, `handleGuardar` dentro de `ModalProspectos`). Distinción importante: si el cliente **ya existía** (`clienteIdReal`), la edición se puede encolar y aun así continuar a cotizar (ya hay un id real); si es un cliente **nuevo**, no hay id todavía — no se puede armar una cotización sin conexión, se avisa y no se continúa.
  - `crearProductoCatalogo`/`actualizarProductoCatalogo` (expoService) + `ModalCatalogoExpo.tsx` (`guardarProd`). Limitación real: si el producto llevaba una foto pendiente de subir, esa foto **no se guarda** (la subida de archivos todavía no tiene outbox) — se avisa explícitamente al usuario en vez de perderla en silencio.
  - `aprobarCotizacionExpo` (expoService) + `expo.tsx` (`aprobarCotizacion`) — si se encola, no hay folio de pedido real todavía; se avisa y se retorna `null`.
- **Bug real encontrado y corregido — doble alert contradictorio:** `ListaCotizaciones.tsx` (`confirmarCorreoYAprobar`) llamaba a `onAprobar(...)` y, si regresaba `null`, mostraba **su propio** `alert("No se pudo aprobar el pedido.")` — encima del aviso amigable que ya mostraba `aprobarCotizacion` (en `expo.tsx`) para el caso encolado. El usuario veía primero el mensaje correcto y luego, inmediatamente, uno genérico de error pisándolo. Se quitó el alert redundante — `aprobarCotizacion` ya es responsable de avisar en todos los casos (encolado o rechazo real), el caller solo debe cortar el flujo en silencio si el resultado es `null`.
- **`src/services/correoService.ts`** (`enviarCorreoDocumento`) — usa `ejecutarOEncolar`. Resultó más simple de lo previsto: como ya convierte el PDF a base64 y lo manda como JSON normal (no `FormData`), cabe en el mismo patrón sin necesitar un store de Blobs aparte. Cableado en sus dos puntos de uso en Expo:
  - `src/hooks/useEnvioDocumentoPdf.ts` (`confirmarEnvioCorreo`) — hook compartido por `expo.tsx` **y** `ListaCotizaciones.tsx`, arreglar aquí cubrió ambos de una vez
  - `src/components/expo/RegistroCliente.tsx` (`confirmarAgradecimiento`) — correo de agradecimiento a prospectos, llamada directa aparte del hook
- `src/components/expo/ModalProducto.tsx` — revisado a fondo: su único punto de escritura propio es la subida de imagen (`subirImagenVinculada`, POST `/archivos/upload`), que se deja **sin encolar a propósito** (mismo motivo que la subida de archivos en general — necesita el store de Blobs que todavía no existe; el comportamiento actual ya es honesto: dice "no se pudo, intenta de nuevo" sin fingir éxito). El resto de su guardado (`guardar()`) delega a `onGuardar`, que ya estaba cubierto vía `ModalCatalogoExpo.tsx`.
- **Bug real encontrado y corregido — `crearCotizacionExpo` nunca quedó conectado.** Se había agregado el manejo de `OperacionEncoladaError` en `expo.tsx` (`guardarConOpciones`) dando por hecho que el servicio ya usaba `ejecutarOEncolar` — pero al revisar el código real, `crearCotizacionExpo` seguía siendo un `api.post` plano sin encolar. El usuario lo detectó probando offline: veía el error genérico ("Error al guardar cotización") en vez del aviso de "se guardó, se sincroniza sola". Corregido. **Lección:** de aquí en adelante, verificar con `grep ejecutarOEncolar src/services/` en vez de solo recordar/asumir qué se cableó en turnos anteriores.
- **Ampliación importante — tareas compuestas en el outbox (no solo "una petición HTTP genérica").** El usuario notó que, aun con `crearCotizacionExpo` bien encolado, el correo de la cotización **nunca se mandaba** al reconectar — y es porque nunca se llegó a encolar: `guardarConOpciones` cortaba el flujo antes de intentar el correo, ya que el PDF necesita el folio real que solo existe después de sincronizar. El usuario pidió explícitamente que el correo también se mande solo, en automático, una vez que la cotización tenga folio — sin pasos extra para el usuario. Esto no cabía en el patrón `ejecutarOEncolar` (una sola petición HTTP de una función existente), así que se extendió la arquitectura del outbox:
  - `src/offline/db.ts` / `outbox.ts` — `OutboxEntry` ahora tiene un campo `kind`. `kind: "http"` (el caso de siempre) se reproduce con una sola petición; cualquier otro `kind` es una **tarea compuesta** con lógica propia, resuelta por un manejador registrado vía `registrarManejadorOutbox(kind, fn)` y encolada vía `encolarPersonalizado(kind, data, descripcion)`. `sincronizarOutbox()` despacha según `kind`.
  - `src/offline/expoOutboxHandlers.ts` (nuevo) — registra el manejador `"cotizacion-expo-con-correo"`: hace `POST /expo/cotizaciones`, y si venía correo pendiente, con el folio real ya en mano vuelve a pedir `getCotizacionesExpo()`, arma el PDF y llama a `enviarCorreoDocumento` (que a su vez tiene su propio `ejecutarOEncolar` — si falla otra vez por red, se re-encola solo como entrada "http" normal, sin perder el combo entero). Se importa una sola vez desde `App.tsx` (efecto de carga del módulo) para que quede registrado sin importar en qué pantalla esté el usuario cuando dispare la sincronización.
  - `src/utils/expo/construirPayloadPdfCotizacionExpo.ts` (nuevo) — se **extrajo** de una función local dentro de `expo.tsx` (`construirPayloadPdfCotizacionDesdeBackData`) para poder reutilizarla tanto en el flujo online normal como en el manejador de sincronización, sin duplicar ~130 líneas de lógica de armado de PDF.
  - `src/pages/expo/expo.tsx` (`guardarConOpciones`) — cuando `crearCotizacionExpo` se encola Y se pidió enviar por correo, se **reemplaza** la entrada genérica "http" que ya había creado `ejecutarOEncolar` (se borra con `eliminarDeOutbox`) por la tarea compuesta, usando el correo del cliente ya disponible localmente (`clienteGuardado`, sin llamada de red extra).
  - **No se pudo verificar en vivo** — el entorno de pruebas esta vez sí alcanzó el backend real (401 en vez de "Network Error"), lo que rompió el truco de sesión falsa que venía usando; solo se verificó por build/lint/type-check. Falta que el usuario confirme el ciclo completo: crear cotización Expo con correo marcado sin conexión → reconectar → llega el correo.
- **Bug real encontrado — el evento `online` del navegador no es señal confiable de "ya hay internet de verdad".** El usuario probó el flujo de arriba y el correo seguía sin llegar; el diagnóstico (revisar consola al reconectar) mostró que **ninguno** de los dos `console.error` del manejador salía, solo errores genéricos de red — es decir, la tarea fallaba desde el primer paso (`POST /expo/cotizaciones`), no en la parte del correo. Causa: `useSyncOutbox` solo intentaba sincronizar **una vez**, justo cuando se disparaba el evento `online` — pero ese evento se dispara en cuanto el navegador detecta *alguna* interfaz de red activa, no que la conexión real (DNS, túnel, etc.) ya esté lista; si ese primer intento le gana la carrera a la conexión real, no había ningún otro disparador que reintentara.
  - **Corrección:** `src/offline/useSyncOutbox.ts` — mientras `pendientes > 0`, se reintenta solo cada 20s (`REINTENTO_MS`), además del intento inicial al montar y en cada evento `online`. Se limpia el intervalo si deja de haber pendientes o el componente se desmonta.
  - **No se pudo verificar el timing en vivo** — el entorno de pruebas ahora rechaza la sesión falsa en 1-2 segundos (401 real), no alcanza a llegar a los 20s del reintento. Verificado por build/lint/revisión de código (patrón estándar `setInterval` + `useEffect`) — falta que el usuario confirme que, tras un primer intento fallido, si espera ~20s sin tocar nada, se sincroniza solo.
- **Bug real y serio encontrado — el reintento sí funcionaba, pero reintentaba un rechazo permanente para siempre, y cada intento dejaba basura en la base de datos.** El usuario probó de nuevo y confirmó (con logs del backend) que el reintento periódico sí se disparaba, pero el servidor regresaba **500** para `POST /expo/cotizaciones` — no por estar caído, sino por una validación de negocio real: el producto de papel de prueba no tenía cantidades/precios válidos (`insertarProductoPapel`, `cotizacionPapel.helper.ts:1087`). El backend regresa ese rechazo como 500 en vez de 400, así que mi código lo trataba como "posiblemente temporal" y lo reintentaba cada 20s **para siempre**. Peor aún: el backend no envuelve la creación de la cotización en una transacción — cada intento fallido creaba una fila nueva de "solicitud" (folios **CO26059 a CO26063**, ids 332–336) antes de tronar en el producto de papel, dejando **5 registros huérfanos** en la base de datos real del usuario.
  - **Corrección aplicada (frontend):** `src/offline/outbox.ts` — nueva constante `MAX_INTENTOS = 5`. Una entrada que llega a ese número de fallos deja de reintentarse automáticamente (se salta en `sincronizarOutbox`, sin más llamadas de red), pero no se borra — queda visible para revisión manual. `contarPendientes()` ahora excluye las agotadas del conteo que ve el usuario (para no decir "pendiente" de algo que ya se dejó de intentar); se agregó `contarFallidosPermanentes()` para un futuro indicador de "N necesitan revisión" (todavía no tiene UI).
  - **Verificado:** se insertó una entrada con `intentos: 5` directo en IndexedDB junto con una fresca (`intentos: 0`) — el badge mostró correctamente "1 cambio pendiente" (solo contó la fresca), confirmando el filtro.
  - **Pendiente — no es un bug del frontend, es del backend:** la creación de cotización en `expo.controller.ts` (~línea 1764) necesita envolver la inserción de la solicitud + productos en una transacción de base de datos, para que un producto inválido haga rollback completo en vez de dejar la solicitud a medias. Y **hay 5 registros huérfanos reales (CO26059–CO26063) que hay que limpiar manualmente** — no se limpian solos.

**Pendiente de cablear (mismo patrón, servicio por servicio):**
- `src/services/pedidosService.ts` (`actualizarPedido`) + `src/components/EditarPedido.tsx`, `src/pages/EditarCotizacionCompleta.tsx`, `src/pages/EditarCotizacionPapelCompleta.tsx`, `src/pages/EditarPedidoPapel.tsx`
- `src/pages/Usuarios.tsx`, `src/pages/ProveedoresPage.tsx`, `src/pages/papel/catalogos.tsx`, `src/pages/Plastico.tsx`, `src/pages/papel/Papel.tsx` — mismo tratamiento para sus operaciones de escritura
- **`POST /archivos/upload`** (usado desde `ModalProducto.tsx`/`ModalCatalogoExpo.tsx` en Expo, y `ArchivosProductoPlastico.tsx`/formularios de alta de Papel) — el más pesado de esta fase: necesita su propio store `outbox-archivos` (Blobs) en `db.ts` (todavía no existe), subirlo al reconectar, y decidir qué mostrar mientras tanto (¿preview local del archivo aún no subido?)
- Etiqueta visual "pendiente" en las filas/registros encolados de cada pantalla (por ahora solo hay el indicador global de `SyncStatusIndicator`, no hay estado optimista por fila)

### Fase 4 — Notificaciones push — 🔶 EN PROGRESO, acotada a Expo

Por tiempo, se decidió avanzar a esta fase acotada **solo a Expo** en vez de todo el alcance original. El único evento activo hoy es la notificación **local** de "outbox de Expo sincronizado" (no requiere backend); la infraestructura de push real (VAPID, tabla, controller/rutas, sender) quedó lista para cuando se agreguen eventos de servidor, pero **nada la dispara todavía**. Detalle completo en `docs/pwa-implementation-status.md` §5. Ver también el punto 16 del changelog (§6).

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
- ~~`src/pages/Home.tsx` — montar el opt-in~~ **Cambiado:** se montó en `src/pages/expo/expo.tsx` en su lugar, porque el alcance actual de la Fase 4 es solo Expo, no toda la app.
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
7. ~~Se descarta: Archivos/Gestor de Archivos — no lo usa nadie en el alcance.~~ **Matizado luego (ver punto 10):** la *pantalla* `/archivos` sigue descartada, pero el *endpoint* `POST /archivos/upload` sí se usa desde Expo y Plástico/Papel.
8. Se confirma: Usuarios/Proveedores/Catálogos administrativo usan el mismo patrón de encolado que el resto (sin excepción especial) — el único riesgo (validaciones de unicidad que no se pueden checar offline) ya lo cubre el manejo de conflictos de §7.3.
9. Se aclara: **push y el outbox son mecanismos independientes** — el encolado se activa por fallo de red al guardar, y se sincroniza con el evento `online` del navegador; push no interviene en ese flujo (ver §7.2).
10. Se agrega al alcance: **Dar de alta productos — Plástico (`/plastico`) y Papel (`/papel`)** — se descubrió que usan el endpoint de subida de archivos igual que Expo, y el usuario confirmó que estas pantallas también necesitan ser parte del PWA.
11. Se confirma: la subida de archivos (`POST /archivos/upload`, usada por Expo y por Plástico/Papel para fotos de producto) **también se encola offline** (guardar el archivo en IndexedDB, subir al reconectar) — mismo criterio que el resto de la Fase 3, no una excepción de "requiere conexión". Falta diseñarlo en la Fase 3 (es la pieza más pesada del plan porque maneja blobs, no JSON).
12. Se corrige un olvido real de la Fase 2: `rolesService`/`privilegiosService` (usados por el formulario de Usuarios) no estaban en el cacheo ni en el precalentamiento — reportado por el usuario ("los privilegios no quedan cargados"), corregido.
13. **Bug real encontrado y corregido — el precalentamiento no cacheaba casi nada en la práctica.** El usuario reportó que ningún desplegable (clientes, catálogos de papel/plástico, proveedores, Expo) se veía offline pese al precalentamiento. Causa: un service worker recién registrado **no controla la pestaña que lo registró** hasta que termina de activarse (o hasta la siguiente recarga) — como `warmApiCache()` se dispara casi al instante tras el login, en la primera sesión las ~35 peticiones de precalentamiento pasaban directo a la red sin que el SW alcanzara a cachearlas. Corregido con dos cambios en conjunto:
    - `src/sw.ts`: se agrega `clientsClaim()` (de `workbox-core`) para que el SW tome control de la pestaña abierta apenas termina de activarse, sin esperar a una recarga.
    - `src/pwa/warmApiCache.ts`: ahora espera `navigator.serviceWorker.ready` (con timeout de 8s por seguridad) antes de disparar las peticiones de precalentamiento.
    - Verificado que el cambio no rompe nada ni se cuelga (build/lint limpios, se confirmó que el flujo completo corre sin errores nuevos) — **no se pudo confirmar en vivo que el caché se llene correctamente**, porque el entorno de pruebas no tiene salida real a internet. Pendiente de que el usuario lo confirme con una sesión real.
14. **Confirmado con datos reales del usuario (Network tab en producción, con backend real vía dev tunnel):** el fix de `clientsClaim()` + `serviceWorker.ready` sí funciona — se ven decenas de endpoints respondiendo con datos reales (`cors`, `application/json`, tamaños de bytes reales) justo tras el login. El único error real encontrado: `GET /api/tintas` → **404**. Se investigó y `getTintas()` (en `papelCotizacionService.ts`) le pega a una ruta que **no existe** como endpoint propio — "tintas" viene incluido dentro de la respuesta de `/catalogos-produccion`, no por separado (`catalogos-produccion.controller.ts`). Además, se confirmó que `getTintas` es **código muerto**: ninguna pantalla real de la app lo usa, solo lo llamaba el precalentamiento. Se quitó de `warmApiCache.ts`. No se tocó el backend ni se intentó adivinar la ruta correcta, porque no hay ninguna pantalla real que dependa de esto — si en el futuro se necesita el catálogo de tintas en algún formulario, hay que traerlo de `/catalogos-produccion` como ya lo hace el resto del código.
15. Se agrega al precalentamiento **`PreciosAcabadosPapel.tsx`** (`/precios-acabados-papel`, "Precios productos → Papel" en el menú) — el usuario aclaró que necesita esto sí o sí porque alimenta el cálculo de precios de Expo. Se agregó `getCatalogosPreciosAcabados` y, como `getMatrizPreciosAcabado(idAcabado)` es parametrizado, se resolvió con un patrón de "descubrir y abanicar": `calentarMatricesPreciosAcabados()` primero trae el catálogo de acabados y luego pide la matriz de **cada uno** encontrado, sin necesitar conocer los ids de antemano.
16. Al cerrar Expo en la Fase 3 (con los 3 `eliminar*` recién cableados), se preguntó si eso concluía Expo. Se aclaró que **no existe un "pedido de Expo" separado** — aprobar una cotización Expo ya alimenta el mismo sistema compartido de Pedido, y esa conversión ya estaba encolada. Lo que sí falta es el módulo compartido de Pedido en sí (`actualizarPedido` + sus 4 pantallas de editar), que el usuario identificó como necesario para cerrar el ciclo completo "vender en la expo → aprobar → ajustar el pedido" sin conexión — sigue pendiente (sección 2.4). Por tiempo, se decidió saltar a la **Fase 4 acotada solo a Expo** en vez de completar Pedido primero; el único evento de push elegido fue el local (outbox de Expo sincronizado), pero se pidió dejar lista la infraestructura de push real para más adelante. El usuario también pidió explícitamente no perder de vista la subida de archivos pendiente (sección 2.4) — sigue en la lista, no se ha tocado.

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
