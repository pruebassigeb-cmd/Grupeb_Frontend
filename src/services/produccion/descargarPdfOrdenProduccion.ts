import {
  getBultos,
  getOrdenProduccion,
  getProcesosOrden,
} from "./seguimientoService";
import type {
  BultosRespuesta,
  ProcesoRegistro,
  ProcesosOrdenRespuesta,
} from "./seguimientoService";
import { getPedidos } from "../pedidosService";
import type { OrdenProduccionData } from "../../utils/plastico/generarPdfOrdenProduccion";
import { generarPdfOrdenProduccion } from "../../utils/plastico/generarPdfOrdenProduccion";
import { generarPdfOrdenProduccionPapel } from "../../utils/papel/generarPdfOrdenProduccionPapel";
import { getImagenesDiseno } from "../diseno/ordenDisenoService";
import type {
  ClaveMaquinariaPapel,
  NombreProcesoOrdenPapel,
  OrdenProduccionPapelData,
  ProcesosPapelRuntimeMap,
} from "../../types/papel/ordenProduccionPapel.types";
import { esProductoOrdenPapel, f } from "../../utils/papel/ordenProduccionPapelPdf.helpers";

export type OpcionesDescargaOrdenProduccion = {
  idordenDiseno?: number | null;
  descripcion?: string | null;

  /**
   * Úsalo cuando la pantalla que dispara el PDF ya sabe el material.
   * Ejemplo: Seguimiento tiene pedido.tipo_producto === "papel", aunque
   * getOrdenProduccion todavía no regrese tipo_material en el producto.
   */
  forzarTipoMaterial?: "papel" | "plastico" | null;

  /**
   * Datos del producto provenientes de otra pantalla/listado. Sirve para
   * enriquecer la orden cuando getOrdenProduccion aún no devuelve todos
   * los campos de papel.
   */
  productoReferencia?: any | null;
};

type ImagenesDisenoPdf = { url_render: string | null; url_master: string | null };

const isObj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const pick = (...values: unknown[]): any =>
  values.find((v) => f(v) !== "") ?? null;

const numeroONull = (valor: unknown): number | null => {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "string" && valor.trim() === "") return null;

  const numero = typeof valor === "number"
    ? valor
    : typeof valor === "string"
      ? Number(valor.trim())
      : NaN;

  return Number.isFinite(numero) ? numero : null;
};

const primerNumero = (...valores: unknown[]): number | null => {
  for (const valor of valores) {
    const numero = numeroONull(valor);
    if (numero !== null) return numero;
  }
  return null;
};

const textoONull = (valor: unknown): string | null => {
  if (valor === null || valor === undefined) return null;
  if (isObj(valor)) {
    return textoONull(valor.nombre ?? valor.label ?? valor.valor);
  }

  const texto = String(valor).trim();
  return texto === "" ? null : texto;
};

const normalizarClaveProceso = (valor: unknown): string =>
  (textoONull(valor) ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

function buscarProceso(
  datos: ProcesosOrdenRespuesta,
  nombre: "extrusion" | "impresion" | "bolseo" | "asa_flexible"
): ProcesoRegistro | null {
  return datos.procesos.find((proceso) => {
    const tabla = normalizarClaveProceso(proceso.tabla);
    const nombreProceso = normalizarClaveProceso(proceso.nombre_proceso);
    if (tabla) return tabla === nombre;
    return nombreProceso === nombre;
  }) ?? null;
}

function registroDe(proceso: ProcesoRegistro | null): Record<string, unknown> {
  return isObj(proceso?.registro) ? proceso.registro : {};
}

function observacionesDe(proceso: ProcesoRegistro | null): string | null {
  const registro = registroDe(proceso);
  const candidatas = [
    registro.observaciones,
    proceso?.observaciones,
    ...(Array.isArray(proceso?.avances)
      ? proceso.avances.map((avance) => avance.observaciones)
      : []),
  ]
    .map(textoONull)
    .filter((valor): valor is string => valor !== null);

  return candidatas.length > 0
    ? Array.from(new Set(candidatas)).join(" | ")
    : null;
}

function totalAvancesComoRespaldo(proceso: ProcesoRegistro | null): number | null {
  if (!proceso) return null;

  const estado = normalizarClaveProceso(proceso.estado);
  const tieneActividad = (Array.isArray(proceso.avances) && proceso.avances.length > 0)
    || estado === "terminado"
    || estado === "finalizado";

  return tieneActividad ? numeroONull(proceso.total_avances) : null;
}

function maquinaYRepeticionImpresion(
  proceso: ProcesoRegistro | null,
  datos: ProcesosOrdenRespuesta
): { maquina: string | null; repeticion: string | null } {
  const registro = registroDe(proceso);
  let maquina = textoONull(registro.maquina);
  let repeticion = textoONull(registro.repeticion);

  if (maquina?.includes("|")) {
    const [nombre, repeticionEnMaquina] = maquina.split("|", 2).map((parte) => parte.trim());
    maquina = textoONull(nombre);
    repeticion ??= textoONull(repeticionEnMaquina);
  }

  const claveMaquina = normalizarClaveProceso(maquina);
  if (!repeticion && claveMaquina.includes("kidder")) {
    repeticion = textoONull(datos.repeticion_kidder);
  } else if (!repeticion && claveMaquina.includes("sicosa")) {
    repeticion = textoONull(datos.repeticion_sicosa);
  }

  return { maquina, repeticion };
}

function formatoNumeroCompacto(valor: unknown): string | null {
  const numero = numeroONull(valor);
  if (numero === null) return null;
  return Number.isInteger(numero) ? String(numero) : String(Number(numero.toFixed(2)));
}

function sumarCampoBultos(
  bultos: BultosRespuesta["bultos"],
  campo: "peso_producto" | "peso"
): number | null {
  let encontroValor = false;
  const total = bultos.reduce((acumulado, bulto) => {
    const valor = numeroONull(bulto[campo]);
    if (valor === null) return acumulado;
    encontroValor = true;
    return acumulado + valor;
  }, 0);

  return encontroValor ? Number(total.toFixed(2)) : null;
}

function resumirBultos(bultos: BultosRespuesta | null): Pick<
  OrdenProduccionData,
  "bultos_total" | "bultos_medidas" | "bultos_peso" | "bultos_piezas"
> {
  if (!bultos || !Array.isArray(bultos.bultos) || bultos.bultos.length === 0) {
    return {
      bultos_total: null,
      bultos_medidas: null,
      bultos_peso: null,
      bultos_piezas: null,
    };
  }

  const medidas = new Set<string>();
  for (const bulto of bultos.bultos) {
    const largo = formatoNumeroCompacto(bulto.largo);
    const ancho = formatoNumeroCompacto(bulto.ancho);
    const alto = formatoNumeroCompacto(bulto.alto);
    if (largo !== null || ancho !== null || alto !== null) {
      medidas.add(`${largo ?? "-"}x${ancho ?? "-"}x${alto ?? "-"} cm`);
    }
  }

  const totalKg = numeroONull(bultos.total_kg);
  const pesoProducto = primerNumero(
    sumarCampoBultos(bultos.bultos, "peso_producto"),
    bultos.modo_cantidad === "kilo" ? totalKg : null
  );
  const pesoEmpaquetado = sumarCampoBultos(bultos.bultos, "peso");
  const unidadesCapturadas = bultos.bultos
    .map((bulto) => numeroONull(bulto.cantidad_unidades))
    .filter((unidades): unidades is number => unidades !== null && unidades > 0);
  const sumaUnidades = unidadesCapturadas.reduce((total, unidades) => total + unidades, 0);
  const totalUnidadesApi = numeroONull(bultos.total_unidades);
  const partesPeso: string[] = [];
  if (pesoProducto !== null) partesPeso.push(`Prod. ${formatoNumeroCompacto(pesoProducto)} kg`);
  if (pesoEmpaquetado !== null) partesPeso.push(`Emp. ${formatoNumeroCompacto(pesoEmpaquetado)} kg`);

  return {
    bultos_total: primerNumero(bultos.total_bultos, bultos.bultos.length),
    bultos_medidas: medidas.size > 0 ? Array.from(medidas).join("; ") : null,
    bultos_peso: partesPeso.length > 0 ? partesPeso.join(" / ") : null,
    bultos_piezas: unidadesCapturadas.length > 0
      ? (totalUnidadesApi !== null && totalUnidadesApi > 0 ? totalUnidadesApi : sumaUnidades)
      : null,
  };
}

function datosProduccionEnBlanco(): Partial<OrdenProduccionData> {
  return {
    ext_merma: null,
    k_para_impresion: null,
    metros_extruidos: null,
    kilos_imprimir: null,
    metros_imprimir: null,
    imp_merma: null,
    kilos_impresos: null,
    metros_impresos: null,
    imp_maquina: null,
    imp_repeticion: null,
    ext_observaciones: null,
    imp_observaciones: null,
    bol_observaciones: null,
    asa_observaciones: null,
    kilos_bolsear: null,
    kilos_bolseados: null,
    kilos_bolseados2: null,
    bol_merma: null,
    bol_piezas_merma: null,
    piezas_bolseadas: null,
    asa_kilos_recibidos: null,
    asa_piezas_recibidas: null,
    asa_merma: null,
    asa_merma_kilos: null,
    asa_merma_piezas: null,
    asa_kilos_finales: null,
    asa_piezas_finales: null,
    asa_flexible_aplica: false,
    bultos_total: null,
    bultos_medidas: null,
    bultos_peso: null,
    bultos_piezas: null,
  };
}

function construirDatosProduccionRegistrados(
  procesos: ProcesosOrdenRespuesta,
  bultos: BultosRespuesta | null,
  modoCantidad: unknown
): Partial<OrdenProduccionData> {
  const extrusion = buscarProceso(procesos, "extrusion");
  const impresion = buscarProceso(procesos, "impresion");
  const bolseo = buscarProceso(procesos, "bolseo");
  const asaFlexible = buscarProceso(procesos, "asa_flexible");

  const ext = registroDe(extrusion);
  const imp = registroDe(impresion);
  const bol = registroDe(bolseo);
  const asa = registroDe(asaFlexible);
  const maquinaImpresion = maquinaYRepeticionImpresion(impresion, procesos);
  const porKilo = normalizarClaveProceso(modoCantidad) === "kilo";
  const totalExt = totalAvancesComoRespaldo(extrusion);
  const totalImp = totalAvancesComoRespaldo(impresion);
  const totalBol = totalAvancesComoRespaldo(bolseo);
  const totalAsa = totalAvancesComoRespaldo(asaFlexible);
  const estadoAsa = normalizarClaveProceso(asaFlexible?.estado);
  const asaAplica = !!asaFlexible
    && estadoAsa !== "no_aplica";

  const kilosBolseados = primerNumero(
    bol.kilos_bolseados,
    porKilo ? totalBol : null
  );
  const piezasBolseadas = primerNumero(
    bol.piezas_bolseadas,
    porKilo ? null : totalBol
  );

  return {
    ...datosProduccionEnBlanco(),
    kilos_extruir: numeroONull(ext.kilos_extruir),
    metros_extruir: numeroONull(ext.metros_extruir),
    ext_merma: numeroONull(ext.merma),
    k_para_impresion: primerNumero(ext.k_para_impresion, totalExt),
    metros_extruidos: numeroONull(ext.metros_extruidos),
    ext_observaciones: observacionesDe(extrusion),

    kilos_imprimir: numeroONull(imp.kilos_imprimir),
    metros_imprimir: numeroONull(imp.metros_imprimir),
    imp_merma: numeroONull(imp.merma),
    kilos_impresos: primerNumero(imp.kilos_impresos, totalImp),
    metros_impresos: numeroONull(imp.metros_impresos),
    imp_maquina: maquinaImpresion.maquina,
    imp_repeticion: maquinaImpresion.repeticion,
    imp_observaciones: observacionesDe(impresion),

    kilos_bolsear: numeroONull(bol.kilos_bolsear),
    kilos_bolseados: kilosBolseados,
    kilos_bolseados2: kilosBolseados,
    bol_merma: numeroONull(bol.kilos_merma),
    bol_piezas_merma: numeroONull(bol.piezas_merma),
    piezas_bolseadas: piezasBolseadas,
    bol_observaciones: observacionesDe(bolseo),

    asa_kilos_recibidos: numeroONull(asa.kilos_recibidos),
    asa_piezas_recibidas: numeroONull(asa.piezas_recibidas),
    asa_merma: numeroONull(asa.merma),
    asa_merma_kilos: numeroONull(asa.kilos_merma),
    asa_merma_piezas: numeroONull(asa.merma),
    asa_kilos_finales: primerNumero(asa.kilos_finales, porKilo ? totalAsa : null),
    asa_piezas_finales: primerNumero(asa.pzas_finales, porKilo ? null : totalAsa),
    asa_observaciones: observacionesDe(asaFlexible),
    asa_flexible_aplica: asaAplica,

    ...resumirBultos(bultos),
  };
}

async function cargarDatosProduccionRegistrados(
  idproduccion: number,
  noProduccion: string,
  modoCantidad: unknown
): Promise<Partial<OrdenProduccionData>> {
  const [resultadoProcesos, resultadoBultos] = await Promise.allSettled([
    getProcesosOrden(idproduccion),
    getBultos(idproduccion),
  ]);

  if (resultadoProcesos.status === "rejected") {
    const detalle = resultadoProcesos.reason instanceof Error
      ? `: ${resultadoProcesos.reason.message}`
      : "";
    throw new Error(
      `No se pudieron cargar los datos registrados de produccion para ${noProduccion}${detalle}`
    );
  }

  let bultos: BultosRespuesta | null = null;
  if (resultadoBultos.status === "fulfilled") {
    bultos = resultadoBultos.value;
  } else {
    const respuesta = isObj(resultadoBultos.reason)
      ? resultadoBultos.reason.response
      : null;
    const status = isObj(respuesta) ? numeroONull(respuesta.status) : null;

    // Una orden aún sin bultos puede responder 404. Cualquier otro fallo
    // impediría garantizar que la versión "con datos" esté completa.
    if (status !== 404) {
      throw new Error(
        `No se pudieron cargar los bultos registrados para ${noProduccion}.`
      );
    }
  }

  return construirDatosProduccionRegistrados(
    resultadoProcesos.value,
    bultos,
    modoCantidad
  );
}

function parseJsonSeguro<T>(valor: unknown, fallback: T): T {
  if (typeof valor !== "string") return (valor as T) ?? fallback;
  try {
    const parsed = JSON.parse(valor);
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function mergeProductoPapel(producto: any): any {
  const nestedCandidates = [
    producto?.producto_papel,
    producto?.papel,
    producto?.datos_papel,
    producto?.solicitud_producto_papel,
    producto?.detalle_papel,
  ].filter(isObj);

  return Object.assign({}, ...nestedCandidates, producto);
}

function normalizarProcesosAplica(valor: unknown): NombreProcesoOrdenPapel[] {
  const parsed = parseJsonSeguro<unknown>(valor, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(Boolean) as NombreProcesoOrdenPapel[];
}

function normalizarMaquinaria(valor: unknown): Partial<Record<ClaveMaquinariaPapel | string, any>> {
  const parsed = parseJsonSeguro<unknown>(valor, {});
  return isObj(parsed) ? parsed : {};
}

function maquinaDesdeCampos(...values: unknown[]): any | null {
  const nombre = pick(...values);
  return nombre ? { nombre } : null;
}

function normalizarMaquinariaDesdeProducto(p: any): Partial<Record<ClaveMaquinariaPapel | string, any>> {
  const maquinaria = {
    ...normalizarMaquinaria(p.maquinaria_seleccionada),
    ...normalizarMaquinaria(p.maquinaria),
    ...normalizarMaquinaria(p.maquinarias),
    ...normalizarMaquinaria(p.maquinas),
    ...normalizarMaquinaria(p.maquinas_seleccionadas),
  } as Partial<Record<ClaveMaquinariaPapel | string, any>>;

  const prep = maquinaDesdeCampos(
    p.maquina_hojeado_guillotina,
    p.maquina_preparacion_material,
    p.maquina_preparacion,
    p.hojeado_guillotina_maquina,
    p.hoj_guillotina_maquina,
    p.maquina_hojeado,
    p.maquina_guillotina,
    p.hojeadora,
    p.guillotina
  );

  if (prep && !maquinaria.hojeado_guillotina) {
    maquinaria.hojeado_guillotina = prep;
  }

  return maquinaria;
}

function normalizarMapaProcesos(valor: unknown): ProcesosPapelRuntimeMap | null {
  const parsed = parseJsonSeguro<unknown>(valor, null);
  if (!isObj(parsed) || Array.isArray(parsed)) return null;
  return parsed as ProcesosPapelRuntimeMap;
}

function idsComparables(producto: any): string[] {
  return [
    producto?.idsolicitud_producto,
    producto?.idcotizacion_producto,
    producto?.idsolicitud_producto_papel,
    producto?.idproducto_pedido,
    producto?.idproducto_papel,
    producto?.idproducto,
  ]
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map((v) => String(v));
}

function nombreComparable(producto: any): string {
  return String(
    producto?.nombre_producto ??
    producto?.nombre ??
    producto?.tipo_producto ??
    producto?.tipoProducto ??
    ""
  )
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buscarProductoReferenciaEnPedido(pedido: any, productoOrden: any): any | null {
  const productos = Array.isArray(pedido?.productos) ? pedido.productos : [];
  if (productos.length === 0) return null;

  const idsOrden = new Set(idsComparables(productoOrden));
  if (idsOrden.size > 0) {
    const porId = productos.find((p: any) => idsComparables(p).some((id) => idsOrden.has(id)));
    if (porId) return porId;
  }

  const noProduccion = String(productoOrden?.no_produccion ?? "").trim();
  if (noProduccion) {
    const porFolio = productos.find((p: any) => String(p?.no_produccion ?? "").trim() === noProduccion);
    if (porFolio) return porFolio;
  }

  const nombreOrden = nombreComparable(productoOrden);
  if (nombreOrden) {
    const porNombre = productos.find((p: any) => {
      const nombre = nombreComparable(p);
      return nombre && (nombre === nombreOrden || nombre.includes(nombreOrden) || nombreOrden.includes(nombre));
    });
    if (porNombre) return porNombre;
  }

  // Si el pedido solo tiene un producto, es seguro usarlo como respaldo.
  if (productos.length === 1) return productos[0];

  return null;
}

async function resolverProductoReferenciaPedido(
  noPedido: string,
  productoOrden: any,
  referenciaInicial?: any | null
): Promise<any | null> {
  if (referenciaInicial) return referenciaInicial;

  try {
    const pedidos = await getPedidos() as any[];
    const pedido = pedidos.find((p: any) => String(p?.no_pedido ?? "") === String(noPedido));
    return buscarProductoReferenciaEnPedido(pedido, productoOrden);
  } catch (e) {
    console.warn("No se pudo resolver producto de referencia para PDF:", e);
    return null;
  }
}

async function resolverImagenesDiseno(
  idordenDiseno?: number | null
): Promise<ImagenesDisenoPdf> {
  if (!idordenDiseno) {
    return { url_render: null, url_master: null };
  }

  try {
    const imagenes = await getImagenesDiseno(idordenDiseno);
    return {
      url_render: imagenes.url_render ?? null,
      url_master: imagenes.url_master ?? null,
    };
  } catch (e) {
    console.warn("No se pudieron cargar imágenes de diseño:", e);
    return { url_render: null, url_master: null };
  }
}

function construirDataPlastico(
  cabecera: any,
  producto: any,
  opciones: OpcionesDescargaOrdenProduccion,
  imagenes: ImagenesDisenoPdf,
  datosProduccion: Partial<OrdenProduccionData> = datosProduccionEnBlanco()
): OrdenProduccionData {
  return {
    no_pedido: cabecera.no_pedido,
    no_produccion: producto.no_produccion,
    fecha: cabecera.fecha,
    fecha_produccion: producto.fecha_produccion,
    fecha_aprobacion_diseno: producto.fecha_aprobacion_diseno,
    observaciones_diseno: producto.observaciones_diseno ?? null,
    cliente: cabecera.cliente,
    empresa: cabecera.empresa,
    telefono: cabecera.telefono,
    correo: cabecera.correo,
    impresion: cabecera.impresion,
    prioridad: cabecera.prioridad ?? false,
    nombre_producto: producto.nombre_producto,
    descripcion: opciones.descripcion ?? producto.descripcion ?? null,
    categoria: producto.categoria,
    material: producto.material,
    calibre: producto.calibre,
    medida: producto.medida,
    altura: producto.altura,
    ancho: producto.ancho,
    fuelle_fondo: producto.fuelle_fondo,
    fuelle_lat_iz: producto.fuelle_lat_iz,
    fuelle_lat_de: producto.fuelle_lat_de,
    refuerzo: producto.refuerzo,
    por_kilo: producto.por_kilo,
    medidas: producto.medidas,
    tintas: producto.tintas,
    caras: producto.caras,
    pigmentos: producto.pigmentos,
    pantones: producto.pantones,
    asa_suaje: producto.asa_suaje,
    color_asa_nombre: producto.color_asa_nombre ?? null,
    medida_troquel: producto.medida_troquel ?? null,
    observacion: producto.observacion,
    perforacion: producto.perforacion ?? false,
    cantidad: producto.cantidad,
    kilogramos: producto.kilogramos,
    modo_cantidad: producto.modo_cantidad,
    repeticion_extrusion: producto.repeticion_extrusion ?? null,
    repeticion_metro: producto.repeticion_metro ?? null,
    metros: producto.metros ?? null,
    ancho_bobina: producto.ancho_bobina ?? null,
    repeticion_kidder: producto.repeticion_kidder ?? null,
    repeticion_sicosa: producto.repeticion_sicosa ?? null,
    fecha_entrega: producto.fecha_entrega ?? null,
    kilos: producto.kilos ?? null,
    kilos_merma: producto.kilos_merma ?? null,
    pzas: producto.pzas ?? null,
    pzas_merma: producto.pzas_merma ?? null,
    kilos_extruir: producto.kilos_extruir ?? null,
    metros_extruir: producto.metros_extruir ?? null,
    // Prioridad invertida a propósito: `producto.url_render/url_master`
    // (desde getOrdenProduccion) ya vienen resueltos en el backend a partir
    // de la revisión marcada como versión final (es_version_final) y en
    // base64 listo para jsPDF. `imagenes` (resolverImagenesDiseno) usa la
    // revisión de mayor número de versión — no necesariamente la marcada
    // como final — y regresa URLs que el navegador debe convertir por su
    // cuenta, lo que puede fallar por CORS. Se deja solo como respaldo.
    url_render: producto.url_render ?? imagenes.url_render ?? null,
    url_master: producto.url_master ?? imagenes.url_master ?? null,
    ...datosProduccion,
  };
}

function construirDataPapel(
  cabecera: any,
  productoOriginal: any,
  opciones: OpcionesDescargaOrdenProduccion,
  imagenes: ImagenesDisenoPdf
): OrdenProduccionPapelData {
  const p = mergeProductoPapel(productoOriginal);
  const medidas = isObj(p.medidas) ? p.medidas : {};
  const procesosPapel =
    normalizarMapaProcesos(p.procesos_papel) ??
    normalizarMapaProcesos(p.registros_papel) ??
    normalizarMapaProcesos(p.procesos_registros) ??
    normalizarMapaProcesos(p.procesos);

  // Registros runtime reales (merma/entregadas/máquina/observaciones).
  // El backend los manda en `registros_procesos` (subquery nuevo de
  // getOrdenProduccion). Se preservan tal cual para que
  // obtenerRegistroProcesoPapel los lea por su primera clave.
  const registrosProcesos =
    normalizarMapaProcesos(p.registros_procesos) ??
    normalizarMapaProcesos(p.procesos_runtime) ??
    procesosPapel;

  return {
    ...p,
    tipo_material: "papel",
    tipoCotizacion: "papel",

    no_pedido: cabecera.no_pedido,
    no_produccion: p.no_produccion,
    fecha: cabecera.fecha,
    fecha_produccion: p.fecha_produccion ?? null,
    fecha_aprobacion_diseno: p.fecha_aprobacion_diseno ?? null,
    observaciones_diseno: p.observaciones_diseno ?? null,
    fecha_entrega: p.fecha_entrega ?? null,
    prioridad: cabecera.prioridad ?? false,

    cliente: cabecera.cliente,
    empresa: cabecera.empresa,
    telefono: cabecera.telefono,
    correo: cabecera.correo,
    impresion: cabecera.impresion,

    idsolicitud_producto: p.idsolicitud_producto ?? p.idcotizacion_producto ?? null,
    idproducto_papel: p.idproducto_papel ?? null,
    nombre_producto: pick(p.nombre_producto, p.nombre, p.tipo_producto, p.tipoProductoNombre, "Producto papel"),
    descripcion: opciones.descripcion ?? p.descripcion ?? null,

    cantidad: p.cantidad ?? p.cantidad_orden ?? null,
    kilogramos: p.kilogramos ?? null,
    modo_cantidad: p.modo_cantidad ?? "unidad",

    medida: pick(p.medida, p.medidasFormateadas, p.medida_papel),
    ancho: pick(p.ancho, medidas.ancho),
    fuelle: pick(p.fuelle, p.fuelle_fondo, medidas.fuelle),
    fuelle_fondo: pick(p.fuelle_fondo, p.fuelle, medidas.fuelle),
    altura: pick(p.altura, medidas.altura),
    material: pick(p.material, p.tipo_papel, p.primer_tipo_papel, p.grupo_descripcion),
    calibre: pick(p.calibre, p.primer_calibre),
    grupo_descripcion: pick(p.grupo_descripcion, p.grupo, p.material_grupo),

    tintas: p.tintas ?? p.tintas_frente ?? null,
    tintasId: p.tintasId ?? p.tintas_id ?? null,
    pantones: p.pantones ?? p.pantones_frente ?? null,
    tintasDentro: p.tintasDentro ?? p.tintas_dentro ?? p.tintas_interiores ?? 0,
    tintas_dentro: p.tintas_dentro ?? p.tintasDentro ?? p.tintas_interiores ?? 0,
    tintasDentroId: p.tintasDentroId ?? p.tintas_dentro_id ?? null,
    pantonesDentro: p.pantonesDentro ?? p.pantones_dentro ?? p.pantones_interiores ?? null,
    pantones_dentro: p.pantones_dentro ?? p.pantonesDentro ?? p.pantones_interiores ?? null,
    caras: p.caras ?? null,

    asa_tipo: pick(p.asa_tipo, p.asa, p.asa_suaje, p.tipo_asa),
    asa_suaje: pick(p.asa_suaje, p.asa_tipo, p.asa, p.tipo_asa),
    color_asa_nombre: pick(p.color_asa_nombre, p.asa_color, p.color_asa),
    asa_color: pick(p.asa_color, p.color_asa_nombre, p.color_asa),
    asa_medida: pick(p.asa_medida, p.medida_asa, p.tamano_asa),
    medida_asa: pick(p.medida_asa, p.asa_medida, p.tamano_asa),

    laminado_acabado: pick(p.laminado_acabado, p.laminado_nombre, p.laminado),
    laminado: pick(p.laminado, p.laminado_acabado, p.laminado_nombre),
    foil_nombre: pick(p.foil_nombre, p.foil, p.colorfoil, p.codigofoil),
    foil: pick(p.foil, p.foil_nombre, p.colorfoil, p.codigofoil),
    textura_nombre: pick(p.textura_nombre, p.textura),
    textura: pick(p.textura, p.textura_nombre),
    uv: p.uv ?? false,
    alto_relieve: p.alto_relieve ?? false,

    tipo_pegue: pick(p.tipo_pegue, p.tipo_pegado, p.tipo_pegado_nombre),
    tipo_pegado: pick(p.tipo_pegado, p.tipo_pegue, p.tipo_pegado_nombre),
    pegamento: pick(p.pegamento, p.pegamento_nombre),
    suaje: pick(p.suaje, p.suaje_nombre, p.suaje_numero),
    suaje_nombre: pick(p.suaje_nombre, p.suaje, p.suaje_numero),
    matrix: pick(p.matrix, p.matrix_nombre),
    rendimiento: pick(p.rendimiento, p.hoj_rendimiento),
    refuerzo: pick(p.refuerzo, p.refuerzo_medida, p.refuerzo_material),
    refuerzo_material: pick(p.refuerzo_material, p.refuerzo),
    refuerzo_medida: pick(p.refuerzo_medida, p.refuerzo),
    base: pick(p.base, p.base_medida),
    base_medida: pick(p.base_medida, p.base),
    tipo_caja: pick(p.tipo_caja, p.empaque, p.caja),
    empaque: pick(p.empaque, p.tipo_caja, p.caja),
    cantidad_por_caja: pick(p.cantidad_por_caja, p.pzs_caja, p.piezas_por_caja),
    pzs_caja: pick(p.pzs_caja, p.cantidad_por_caja, p.piezas_por_caja),

    bobina_cm: pick(p.bobina_cm, p.hoj_bobina),
    pliego_hojeado: pick(p.pliego_hojeado, p.hoj_corte),
    pliegos_guillotina: pick(p.pliegos_guillotina, p.pliego),
    corte_guillotina: pick(p.corte_guillotina, p.corte),
    corte: pick(p.corte, p.corte_guillotina),
    hoj_bobina: pick(p.hoj_bobina, p.bobina_cm),
    hoj_corte: pick(p.hoj_corte, p.pliego_hojeado),
    hoj_rendimiento: pick(p.hoj_rendimiento, p.rendimiento),
    hoj_guillotina: pick(p.hoj_guillotina, p.corte_guillotina),
    hoj_hilo: pick(p.hoj_hilo, p.hilo),
    pliego: pick(p.pliego, p.pliego_hojeado, p.pliegos_guillotina),

    metodo_hojeado: p.metodo_hojeado ??
      p.metodoHojeado ??
      p.metodo_preparacion ??
      p.metodoPreparacion ??
      p.preparacion_material ??
      p.preparacionMaterial ??
      null,
    lleva_armado: p.lleva_armado ?? null,
    procesos_aplican: normalizarProcesosAplica(p.procesos_aplican),
    maquinaria_seleccionada: normalizarMaquinariaDesdeProducto(p),

    // Registros runtime: clave principal que lee el PDF, más respaldos.
    registros_procesos: registrosProcesos ?? undefined,
    procesos_papel: procesosPapel,
    registros_papel: normalizarMapaProcesos(p.registros_papel),
    procesos_registros: normalizarMapaProcesos(p.procesos_registros),

    observacion: p.observacion ?? null,
    // El dato de `p` (productoOrden, desde getOrdenProduccion) ya viene
    // resuelto en el backend a partir de la revisión marcada como versión
    // final (es_version_final) y en base64 listo para jsPDF — es la fuente
    // confiable. `imagenes` (resolverImagenesDiseno/getImagenesDiseno) usa
    // la revisión de MAYOR número de versión (no necesariamente la
    // marcada como final) y regresa URLs firmadas que el navegador debe
    // convertir por su cuenta, lo que puede fallar por CORS. Se deja solo
    // como respaldo si el backend no trajo nada.
    url_render: p.url_render ?? imagenes.url_render ?? null,
    url_master: p.url_master ?? imagenes.url_master ?? null,
  };
}

export async function descargarPdfOrdenProduccionUniversal(
  noPedido: string,
  noProduccion: string,
  guardarEnS3 = true,
  opciones: OpcionesDescargaOrdenProduccion = {}
): Promise<void> {
  const data = await getOrdenProduccion(noPedido);
  const productoOrden = data.productos.find((p: any) => p.no_produccion === noProduccion);

  if (!productoOrden) {
    throw new Error(`Producto con folio ${noProduccion} no encontrado`);
  }

  // Detectar papel ANTES de mezclar con la referencia.
  const esPapel = opciones.forzarTipoMaterial === "papel"
    || (opciones.forzarTipoMaterial !== "plastico" && esProductoOrdenPapel(productoOrden));

  const imagenes = await resolverImagenesDiseno(opciones.idordenDiseno);

  // ── RAMA PAPEL ────────────────────────────────────────────────────────
  // El productoOrden de papel ya viene COMPLETO desde getOrdenProduccion
  // (ficha + estimados + registros_procesos). NO se mezcla con la
  // referencia de getPedidos() porque esa puede venir incompleta y
  // sobrescribir/ensuciar los datos buenos del endpoint (tu propio
  // contexto lo advierte). Solo se cae a la referencia si por alguna
  // razón el producto no se reconoció como papel arriba.
  if (esPapel) {
    console.log("PRODUCTO ORDEN COMPLETO", JSON.stringify(productoOrden, null, 2));
    const dataPapel = construirDataPapel(data, productoOrden, opciones, imagenes);

    // Debug temporal: confirma qué llega antes de dibujar. Comenta/quita
    // en producción.
    //console.log("DATA PAPEL PDF", dataPapel);
    console.log("PRODUCTOS DEL ENDPOINT", data.productos);
    console.log("BUSCANDO no_produccion =", noProduccion);

    await generarPdfOrdenProduccionPapel(dataPapel, guardarEnS3);
    return;
  }

  // ── RAMA PLÁSTICO (o material no resuelto como papel) ────────────────
  const referencia = await resolverProductoReferenciaPedido(
    noPedido,
    productoOrden,
    opciones.productoReferencia
  );

  // La referencia va primero y la orden después para que los datos
  // operativos de producción no se pierdan, pero sí podamos enriquecer.
  const producto = { ...(referencia ?? {}), ...productoOrden };

  // Respaldo: si el forzado no era plástico y la referencia sí parece
  // papel (caso raro donde el endpoint no lo marcó pero el listado sí),
  // generamos el PDF de papel con la unión.
  const usarPdfPapelPorReferencia = opciones.forzarTipoMaterial !== "plastico"
    && esProductoOrdenPapel(referencia);

  if (usarPdfPapelPorReferencia) {
    await generarPdfOrdenProduccionPapel(
      construirDataPapel(data, producto, opciones, imagenes),
      guardarEnS3
    );
    return;
  }

  // La orden de producción SIEMPRE se genera con los datos reales
  // registrados en planta (avances de extrusión/impresión/bolseo/asa
  // flexible). Ya no existe la variante "en blanco" — antes de que
  // arranque cualquier proceso, cargarDatosProduccionRegistrados()
  // simplemente devuelve el mismo formato con los campos vacíos, así que
  // el PDF sale igual de "en blanco" al inicio y se va llenando solo
  // conforme avanza la producción, sin necesitar un artefacto aparte.
  const idproduccion = numeroONull(producto.idproduccion);
  if (idproduccion === null) {
    throw new Error(
      `No se puede generar el PDF de ${noProduccion}: la orden no tiene idproduccion.`
    );
  }

  let datosProduccion: Partial<OrdenProduccionData> = await cargarDatosProduccionRegistrados(
    idproduccion,
    noProduccion,
    producto.modo_cantidad
  );

  // Los campos de entrada son de sólo lectura en la captura. Algunos
  // backends guardan únicamente la salida final, así que se reconstruyen
  // con la misma cadena de traspaso usada por el formulario de producción.
  datosProduccion = {
    ...datosProduccion,
    kilos_extruir: primerNumero(
      datosProduccion.kilos_extruir,
      producto.kilos_extruir,
      producto.kilos_merma,
      producto.kilogramos
    ),
    metros_extruir: primerNumero(
      datosProduccion.metros_extruir,
      producto.metros_extruir,
      producto.metros_merma,
      producto.metros
    ),
    kilos_imprimir: primerNumero(
      datosProduccion.kilos_imprimir,
      datosProduccion.k_para_impresion
    ),
    metros_imprimir: primerNumero(
      datosProduccion.metros_imprimir,
      datosProduccion.metros_extruidos
    ),
    kilos_bolsear: primerNumero(
      datosProduccion.kilos_bolsear,
      datosProduccion.kilos_impresos
    ),
    asa_kilos_recibidos: primerNumero(
      datosProduccion.asa_kilos_recibidos,
      datosProduccion.kilos_bolseados
    ),
    asa_piezas_recibidas: primerNumero(
      datosProduccion.asa_piezas_recibidas,
      datosProduccion.piezas_bolseadas
    ),
  };

  await generarPdfOrdenProduccion(
    construirDataPlastico(data, producto, opciones, imagenes, datosProduccion),
    guardarEnS3
  );
}
