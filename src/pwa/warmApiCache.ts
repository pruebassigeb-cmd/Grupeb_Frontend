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
 * Espera a que el service worker esté listo y controlando la pestaña antes
 * de disparar las peticiones — si no, en la primera visita (SW recién
 * registrándose) las peticiones pasan de largo sin cachearse, porque un SW
 * no controla la página que lo registró hasta que termina de activarse
 * (o hasta la siguiente recarga, si no se usa clientsClaim()).
 */
let calentando = false;

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

export function warmApiCache(): void {
  if (calentando) return;
  calentando = true;

  void ejecutar().finally(() => {
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
    getVentas,
    ...CAT_KEYS_INSUMO.map((key) => () => getCatalogoInsumo(key)),
  ];

  await Promise.allSettled(tareas.map((tarea) => tarea()));
}
