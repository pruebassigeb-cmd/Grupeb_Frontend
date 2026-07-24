import { getCotizaciones } from "../services/cotizacionesService";
import { getPedidos } from "../services/pedidosService";
import { getClientes } from "../services/clientesService";
import { getUsuarios } from "../services/usuariosService";
import { getRoles } from "../services/rolesService";
import { getPrivilegios } from "../services/privilegiosService";
import {
  getTiposInsumo,
  getRegimenesFiscales as getRegimenesFiscalesProveedor,
  getProductosSat,
  getProveedores,
} from "../services/proveedoresService";
import { getProductosPlastico, getCatalogosPlastico, getCalibres } from "../services/productosPlasticoService";
import {
  getTiposProductoAdmin,
  getMaterialesAdmin,
  getCalibresAdmin,
} from "../services/plastico/catalogosPlasticoAdminService";
import { getProductosPapel, getFoils, getColoresAsa } from "../services/papel/papelCotizacionService";
import { getCatalogoInsumo, type CatKeySincronizado } from "../services/papel/catalogoPapelInsumoService";
import { fetchTamanosProducto, fetchCatalogosPapel } from "../services/papel/papel.service";
import {
  getCostoMetroLaminado,
  getCatalogosPreciosAcabados,
  getMatrizPreciosAcabado,
} from "../services/papel/preciosAcabadosPapel.service";
import { getTarifas } from "../services/tarifas.service";
import { getCatalogosProduccion, getTarifasProduccion } from "../services/catalogosProduccionService";
import { getRegimenesFiscales, getMetodosPago, getFormasPago } from "../services/catalogosService";
import {
  getCatalogoPropio,
  getCatalogoSistema,
  getClientesExpo,
  getCotizacionesExpo,
} from "../services/expo/expoService";
import { getClienteById } from "../services/clientesService";
import { getVentas } from "../services/ventasservice";

const CAT_KEYS_INSUMO: CatKeySincronizado[] = [
  "tipo_papel",
  "pegamento",
  "laminado",
  "sacabocados",
  "perforado",
  "matrix",
];

/**
 * Calienta el runtime cache (Fase 2 del PWA) justo después de iniciar
 * sesión y cada vez que vuelve la conexión, para que Cotizar/Pedido/
 * Usuarios/Proveedores/Catálogos administrativo/Expo ya tengan datos
 * guardados sin que el usuario tenga que visitar cada pantalla primero.
 *
 * No bloquea nada ni reporta errores: si un endpoint falla (sin permiso,
 * sin red a medio camino, etc.) simplemente no queda cacheado todavía,
 * y se reintenta la próxima vez que haya sesión + conexión.
 *
 * Evita corridas duplicadas en paralelo (puede llamarse dos veces seguidas
 * si el navegador dispara un evento "online" espontáneo justo al cargar,
 * además del chequeo inicial de sesión).
 *
 * También evita corridas repetidas en poco tiempo (`INTERVALO_MINIMO_MS`):
 * cada corrida dispara ~30+ peticiones en paralelo (más las que se abren en
 * abanico, como cada matriz de precios o cada cliente de Expo), y el evento
 * `online` puede dispararse varias veces seguidas si la conexión parpadea
 * (ver Bug A en pwa-implementation-status.md) — sin este mínimo, cada
 * parpadeo repetía la ráfaga completa. Los catálogos cambian poco, así que
 * no hace falta refrescarlos con esa frecuencia.
 *
 * Espera a que el service worker esté listo y controlando la pestaña antes
 * de disparar las peticiones — si no, en la primera visita (SW recién
 * registrándose) las peticiones pasan de largo sin cachearse, porque un SW
 * no controla la página que lo registró hasta que termina de activarse
 * (o hasta la siguiente recarga, si no se usa clientsClaim()).
 */
let calentando = false;
let ultimaCorridaExitosa = 0;
const INTERVALO_MINIMO_MS = 2 * 60 * 1000;

async function esperarServiceWorkerListo(timeoutMs = 8000): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  await Promise.race([
    navigator.serviceWorker.ready.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/**
 * `getMatrizPreciosAcabado(id)` es parametrizado (PreciosAcabadosPapel.tsx,
 * usado para configurar los precios que alimentan el cálculo de Expo) — no
 * se puede precalentar sin saber antes qué acabados existen. Se lista el
 * catálogo primero y luego se trae la matriz de cada uno encontrado.
 */
async function calentarMatricesPreciosAcabados(): Promise<void> {
  const catalogos = await getCatalogosPreciosAcabados();
  await Promise.allSettled(
    catalogos.acabados.map((acabado) => getMatrizPreciosAcabado(acabado.id))
  );
}

/**
 * `getClienteById(id)` (detalle completo — RFC, domicilio, facturación) es
 * parametrizado, así que no se puede precalentar sin saber antes qué
 * clientes existen. Se usan los `cliente_id` que ya aparecen en las
 * cotizaciones de Expo: son justo los que se necesitan sin conexión al
 * "completar datos antes de convertir a pedido" (ListaCotizaciones.tsx),
 * que antes fallaba porque esa lectura nunca se había cacheado.
 */
async function calentarClientesDeCotizacionesExpo(): Promise<void> {
  const cotizaciones = await getCotizacionesExpo();
  const idsUnicos = Array.from(
    new Set(
      cotizaciones
        .map((c) => c.cliente_id)
        .filter((id): id is number => typeof id === "number")
    )
  );
  await Promise.allSettled(idsUnicos.map((id) => getClienteById(id)));
}

export function warmApiCache(): void {
  if (calentando) return;
  if (Date.now() - ultimaCorridaExitosa < INTERVALO_MINIMO_MS) return;
  calentando = true;

  void ejecutar()
    .then(() => {
      ultimaCorridaExitosa = Date.now();
    })
    .finally(() => {
      calentando = false;
    });
}

async function ejecutar(): Promise<void> {
  await esperarServiceWorkerListo();

  const tareas: Array<() => Promise<unknown>> = [
    getCotizaciones,
    getPedidos,
    getRoles,
    getPrivilegios,
    getClientes,
    getUsuarios,
    getTiposInsumo,
    () => getRegimenesFiscalesProveedor(),
    () => getProductosSat(),
    () => getProveedores(),
    getProductosPlastico,
    getCatalogosPlastico,
    getCalibres,
    getTiposProductoAdmin,
    getMaterialesAdmin,
    getCalibresAdmin,
    () => getProductosPapel(),
    getFoils,
    getColoresAsa,
    fetchTamanosProducto,
    fetchCatalogosPapel,
    getCostoMetroLaminado,
    getCatalogosPreciosAcabados,
    calentarMatricesPreciosAcabados,
    getTarifas,
    getCatalogosProduccion,
    getTarifasProduccion,
    getRegimenesFiscales,
    getMetodosPago,
    getFormasPago,
    getCatalogoPropio,
    getCatalogoSistema,
    getClientesExpo,
    getCotizacionesExpo,
    calentarClientesDeCotizacionesExpo,
    getVentas,
    ...CAT_KEYS_INSUMO.map((key) => () => getCatalogoInsumo(key)),
  ];

  await Promise.allSettled(tareas.map((tarea) => tarea()));
}
