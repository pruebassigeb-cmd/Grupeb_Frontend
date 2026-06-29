import { getOrdenProduccion } from "./seguimientoService";
import { getPedidos } from "./pedidosService";
import type { OrdenProduccionData } from "./generarPdfOrdenProduccion";
import { generarPdfOrdenProduccion } from "./generarPdfOrdenProduccion";
import { generarPdfOrdenProduccionPapel } from "./generarPdfOrdenProduccionPapel";
import { getImagenesDiseno } from "./ordenDisenoService";
import type {
  ClaveMaquinariaPapel,
  NombreProcesoOrdenPapel,
  OrdenProduccionPapelData,
  ProcesosPapelRuntimeMap,
} from "../types/papel/ordenProduccionPapel.types";
import { esProductoOrdenPapel, f } from "./papel/ordenProduccionPapelPdf.helpers";

type OpcionesDescargaOrdenProduccion = {
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
  imagenes: ImagenesDisenoPdf
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
    url_render: imagenes.url_render ?? producto.url_render ?? null,
    url_master: imagenes.url_master ?? producto.url_master ?? null,
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
    url_render: imagenes.url_render ?? p.url_render ?? null,
    url_master: imagenes.url_master ?? p.url_master ?? null,
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

  await generarPdfOrdenProduccion(
    construirDataPlastico(data, productoOrden, opciones, imagenes),
    guardarEnS3
  );
}