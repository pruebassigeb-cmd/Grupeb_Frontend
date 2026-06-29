import api from "../api";
import type { ClienteExpo, FilaProducto } from "../../types/expo/expo.types";

// ─── Tipos base ────────────────────────────────────────────────────────────────

export interface ProductoCatalogoExpo {
  idcatalogo_expo: number;
  nombre: string;
  categoria: "papel" | "plastico" | "carton";
  medida: string | null;
  material: string | null;
  calibre: string | null;
  tintas: string | null;
  laminacion: boolean;
  tipo_laminado: string | null;
  hs: boolean; tipo_hs: string | null;
  ar: boolean;
  textura: boolean; tipo_textura: string | null;
  uv: boolean;
  asa: boolean; tipo_asa: string | null;
  otro: string | null;
  precio_500: number | null;
  precio_1000: number | null;
  precio_3000: number | null;
  imagen_url: string | null;
}

export interface CatalogoSistema {
  plastico: any[];
  papel:    any[];
}

export interface DetalleExpo {
  idsolicitud_detalle: number;
  cantidad:        number;
  precio_total:    number;
  precio_unitario: number | null;
  aprobado:        boolean | null;
}

export interface ProductoExpoGuardado {
  idsolicitud_producto: number;
  tipo_material:   string;
  nombre:          string;
  medida:          string | null;
  material:        string | null;
  calibre:         string | null;
  tintas:          number | null;
  descripcion:     string | null;
  observacion:     string | null;
  id_asa:          number | null;
  asa_nombre:      string | null;
  idcat_laminado:  number | null;
  laminado_nombre: string | null;
  idfoil:          number | null;
  foil_nombre:     string | null;
  idcat_textura:   number | null;
  textura_nombre:  string | null;
  uv:              boolean;
  alto_relieve:    boolean;
  detalles:        DetalleExpo[];
}

export interface CotizacionExpoGuardada {
  idsolicitud:    number;
  no_cotizacion:  string | null;
  no_pedido:      string | null;
  estado:         "cotizacion" | "pedido";
  fecha:          string;
  cliente_id:     number;
  cliente:        string;
  celular:        string;
  correo:         string;
  impresion:      string;
  clasificacion:  string;
  intereses:      string[];
  observaciones:  string;
  ciudad:         string;
  estado_cliente: string;
  identificar:    string;
  productos:      ProductoExpoGuardado[];
}

export interface ItemAprobadoPayload {
  idsolicitud_producto: number;
  idsolicitud_detalle:  number;
}

// ═══════════════════════════════════════════════════════════
// CATÁLOGO
// ═══════════════════════════════════════════════════════════

export const getCatalogoPropio = async (): Promise<ProductoCatalogoExpo[]> => {
  const { data } = await api.get("/expo/catalogo/propio");
  return data;
};

export const getCatalogoSistema = async (): Promise<CatalogoSistema> => {
  const { data } = await api.get("/expo/catalogo/sistema");
  return data;
};

export const crearProductoCatalogo = async (payload: Omit<ProductoCatalogoExpo, "idcatalogo_expo">): Promise<ProductoCatalogoExpo> => {
  const { data } = await api.post("/expo/catalogo", payload);
  return data.producto;
};

export const actualizarProductoCatalogo = async (id: number, payload: Omit<ProductoCatalogoExpo, "idcatalogo_expo">): Promise<ProductoCatalogoExpo> => {
  const { data } = await api.put(`/expo/catalogo/${id}`, payload);
  return data.producto;
};

export const eliminarProductoCatalogo = async (id: number): Promise<void> => {
  await api.delete(`/expo/catalogo/${id}`);
};

// ═══════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════

export const getClientesExpo = async (): Promise<any[]> => {
  const { data } = await api.get("/expo/clientes");
  return data;
};

export const crearClienteExpo = async (clienteData: ClienteExpo): Promise<{ id: number; identificar: string; nombre: string }> => {
  let correo: string | null = null;
  if (clienteData.correoUsuario) {
    const ext = clienteData.correoExt === "__otro__" ? clienteData.correoExtCustom || "" : clienteData.correoExt;
    correo = `${clienteData.correoUsuario}@${ext}`;
  }
  const { data } = await api.post("/expo/clientes", {
    nombre:        clienteData.nombre,
    celular:       clienteData.celular       || null,
    correo,
    impresion:     clienteData.impresion     || null,
    ciudad:        clienteData.ciudad        || null,
    estado:        clienteData.estado        || null,
    clase:         clienteData.clase         || null,
    intereses:     clienteData.intereses,
    observaciones: clienteData.observaciones || null,
  });
  return data.cliente;
};

export const actualizarClienteExpo = async (id: number, clienteData: ClienteExpo): Promise<void> => {
  let correo: string | null = null;
  if (clienteData.correoUsuario) {
    const ext = clienteData.correoExt === "__otro__" ? clienteData.correoExtCustom || "" : clienteData.correoExt;
    correo = `${clienteData.correoUsuario}@${ext}`;
  }
  await api.put(`/expo/clientes/${id}`, {
    nombre:        clienteData.nombre,
    celular:       clienteData.celular       || null,
    correo,
    impresion:     clienteData.impresion     || null,
    ciudad:        clienteData.ciudad        || null,
    estado:        clienteData.estado        || null,
    clase:         clienteData.clase         || null,
    intereses:     clienteData.intereses,
    observaciones: clienteData.observaciones || null,
  });
};

export const eliminarClienteExpo = async (id: number): Promise<void> => {
  await api.delete(`/expo/clientes/${id}`);
};

// ═══════════════════════════════════════════════════════════
// COTIZACIONES
// ═══════════════════════════════════════════════════════════

export const getCotizacionesExpo = async (): Promise<CotizacionExpoGuardada[]> => {
  const { data } = await api.get("/expo/cotizaciones");
  return data;
};

export const aprobarCotizacionExpo = async (
  folio: string,
  itemsAprobados: ItemAprobadoPayload[]
): Promise<{ no_pedido: string; no_cotizacion: string }> => {
  const { data } = await api.patch(`/expo/cotizaciones/${folio}/aprobar`, { itemsAprobados });
  return data;
};

export const eliminarCotizacionExpo = async (folio: string): Promise<void> => {
  await api.delete(`/expo/cotizaciones/${folio}`);
};

// ═══════════════════════════════════════════════════════════
// crearCotizacionExpo
// ═══════════════════════════════════════════════════════════

export const crearCotizacionExpo = async (payload: {
  clienteId:    number;
  productos:    any[];
  comentarios?: string;
}): Promise<{ no_cotizacion: string; idsolicitud: number }> => {
  const { data } = await api.post("/expo/cotizaciones", payload);
  return data;
};

// ═══════════════════════════════════════════════════════════
// registrarProductoEnBlanco
//
// Cuando el usuario crea un producto "desde cero" en el modal
// (fuente undefined o nombre no en catálogo), lo registramos
// en catalogo_expo usando los datos completados en la FilaTabla
// ANTES de guardar la cotización.
//
// Devuelve el idcatalogo_expo asignado por el backend.
// ═══════════════════════════════════════════════════════════

export const registrarProductoEnBlanco = async (
  fila: FilaProducto,
  precio1: string,
  precio2: string,
  precio3: string,
): Promise<number> => {
  const p = fila.producto;
  const parseN = (v: string | undefined | null) => parseFloat(v || "0") || null;
  const parseP = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || null;

  // ── Parsear medida string → componentes ──────────────────────────────────
  // El usuario elige medida en MedidaSelect como string: "30+10x20 cm" o "30x20"
  // Lo descomponemos para pasarle altura/fuelle/ancho al backend
  const medidaStr = fila.medida || p.medida || null;
  let alturaCalc: number | null = null;
  let anchoCalc:  number | null = null;
  let fuelleCalc: number | null = null;

  if (medidaStr) {
    // Quitar " cm" al final y separar por "x"
    const clean = medidaStr.replace(/\s*cm\s*$/i, "").trim();
    // formato: "A+F+...xB" o "AxFxB" (medidas de papel vienen como "AxFxB cm")
    let vertStr: string, horizStr: string;
    const partes = clean.split("x");
    if (partes.length >= 3) {
      // "AxFxB cm" → ancho=A, fuelle=F, altura=B
      anchoCalc  = parseFloat(partes[0]) || null;
      fuelleCalc = parseFloat(partes[1]) || null;
      alturaCalc = parseFloat(partes[2]) || null;
    } else if (partes.length === 2) {
      // "A+FxB" o "AxB"
      vertStr  = partes[0];
      horizStr = partes[1];
      const verts = vertStr.split("+").filter(Boolean);
      alturaCalc = parseFloat(verts[0]) || null;
      fuelleCalc = parseFloat(verts[1]) || null;
      anchoCalc  = parseFloat(horizStr) || null;
    }
  }

  const esPlastico = p.categoria === "plastico";

  const payload = {
    nombre:        p.nombre || "Producto expo",
    categoria:     p.categoria,
    medida:        medidaStr,
    // Material y calibre — el usuario los llenó en FilaTabla
    material:      fila.material     || p.material     || null,
    calibre:       fila.calibre      || p.calibre      || null,
    tintas:        fila.tintas       || p.tintas        || null,
    // Tipo de producto — para plástico viene de tipoPlastico (Bolsa troquelada, etc.)
    // para papel/cartón viene de p.tipoProducto que se llenó en BuscadorProductoModal
    tipo_producto: fila.tipoPlastico || p.tipoProducto || p.tipo || null,
    laminacion:    fila.laminacion,
    tipo_laminado: fila.tipoLaminado || null,
    hs:            fila.hs,
    tipo_hs:       fila.tipoHs       || null,
    ar:            fila.ar,
    textura:       fila.textura,
    tipo_textura:  fila.tipoTextura  || null,
    uv:            fila.uv,
    asa:           fila.asa,
    tipo_asa:      fila.tipoAsa      || null,
    otro:          fila.otro         || null,
    precio_500:    parseP(precio1),
    precio_1000:   parseP(precio2),
    precio_3000:   parseP(precio3),
    imagen_url:    p.imagen          || null,
    origen:        "expo",
    // Medidas desglosadas:
    // Para plástico: vienen de p (llenadas en FilaTabla vía propagar)
    // Para papel/cartón: las calculamos desde la medida string
    altura:            parseN(p.altura)      ?? alturaCalc,
    ancho:             parseN(p.ancho)       ?? anchoCalc,
    fuelle:            !esPlastico ? (parseN(p.fuelle) ?? fuelleCalc) : null,
    fuelle_fondo:       esPlastico ? (parseN(p.fuelFondo)    ?? fuelleCalc) : null,
    fuelle_lateral_iz:  esPlastico ?  parseN(p.fuelLateral)  : null,
    fuelle_lateral_de:  esPlastico ?  parseN(p.fuelLateral2) : null,
    refuerzo:           esPlastico ?  parseN(p.refuerzo)     : null,
  };

  const { data } = await api.post("/expo/catalogo", payload);
  return data.producto.idcatalogo_expo as number;
};

// ═══════════════════════════════════════════════════════════
// mapearProductoAPayload
//
// FIX 1: cantidades reales desde cant1/cant2/cant3
// FIX 2: precio unitario incluye $/pig (extra) cuando modoExtra='precio'
// FIX 3: pigmento del plástico
// ═══════════════════════════════════════════════════════════

export const mapearProductoAPayload = (
  fila: FilaProducto,
  precio1: string,
  precio2: string,
  precio3: string,
  // FIX 1: recibe las cantidades reales elegidas en los dropdowns
  cant1: string = "500",
  cant2: string = "1,000",
  cant3: string = "3,000",
): any => {
  const p = fila.producto;

  // Parser precio string → número
  const parseP = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

  // FIX 2: sumar $/pig al precio unitario cuando modoExtra='precio'
  const extraNum = fila.modoExtra === "precio" ? (parseP(fila.extra || "0")) : 0;
  const p1 = parseP(precio1) + extraNum;
  const p2 = parseP(precio2) + extraNum;
  const p3 = parseP(precio3) + extraNum;

  // FIX 1: parsear cantidades reales (vienen como "1,000" → 1000)
  const parseCant = (s: string) => parseInt(s.replace(/,/g, ""), 10) || 0;
  const c1 = parseCant(cant1);
  const c2 = parseCant(cant2);
  const c3 = parseCant(cant3);

  // ── Producto de PAPEL (del sistema SIGEB) ───────────────────────────────
  if (p.fuente === "sistema" && p.categoria === "papel") {
    return {
      tipoCotizacion:  "papel",
      tipo_material:   "papel",
      idproducto_papel: p.idproducto_papel ?? p.id,
      nombre:           p.nombre,
      idgrupo_papel:    p.idgrupo_papel    ?? null,
      grupo_descripcion: p.grupo_descripcion ?? null,
      tintasId:         p.tintasId          ?? null,
      pantones:         fila.pantones       ?? null,
      tintasDentroId:   null,
      pantonesDentro:   null,
      carasId:          p.carasId           ?? null,
      id_asa:         fila.idAsa      ?? null,
      idcat_laminado: fila.idLaminado ?? null,
      idfoil:         fila.idFoil    ?? null,
      idcat_textura:  fila.idTextura  ?? null,
      uv:             fila.uv,
      alto_relieve:   fila.ar,
      observacion:    fila.otro       ?? null,
      descripcion:    p.nombre        ?? null,
      cantidades: [c1, c2, c3] as [number, number, number],
      precios:    [p1, p2, p3] as [number, number, number],
      herramental_descripcion: null,
      herramental_precio:      null,
      cargo_adicional_descripcion: null,
      cargo_adicional_precio:      null,
    };
  }

  // ── Producto EXPO de papel/cartón ──────────────────────────────────────
  if (p.fuente === "expo" && (p.categoria === "papel" || p.categoria === "carton")) {
    return {
      tipoCotizacion:   "expo_papel",
      tipo_material:    "expo",
      categoria:        p.categoria,
      nombre:           p.nombre || null,
      tintas_cantidad:  fila.tintas || p.tintas || 1,
      observacion:      fila.otro  || null,
      tipoLaminado:  fila.tipoLaminado || null,
      tipoHs:        fila.tipoHs       || null,
      tipoTextura:   fila.tipoTextura  || null,
      tipoAsa:       fila.tipoAsa      || null,
      uv:            fila.uv,
      ar:            fila.ar,
      hs:            fila.hs,
      cantidades: [c1, c2, c3],
      precios:    [p1, p2, p3],
    };
  }

  // ── Plástico del sistema o catálogo expo ────────────────────────────────
  return {
    tipoCotizacion:             "plastico",
    tipo_material:              "plastico",
    configuracion_plastico_id:  p.fuente === "sistema" ? (p.configuracion_plastico_id ?? p.id) : null,
    tintas_cantidad:            fila.tintas || p.tintas || 1,
    nombre:                     p.nombre   || null,
    observacion:                fila.otro  || null,
    id_laminado: fila.idLaminado ?? null,
    idfoil:      fila.idFoil    ?? null,
    id_textura:  fila.idTextura  ?? null,
    id_asa:      fila.idAsa     ?? null,
    tipoAsa:     fila.tipoAsa   || null,
    uv:          fila.uv,
    ar:          fila.ar,
    // FIX 3: pigmento del plástico
    pigmento:    fila.modoExtra === "pigmento" ? (fila.pigmento || null) : null,
    cantidades: [c1, c2, c3],
    precios:    [p1, p2, p3],
  };
};