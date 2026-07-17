// src/services/expo/expoService.ts
import api from "../api";
import type {
  ClienteExpo,
  FilaProducto,
  OpcionPrecioPapelCotizacionPayload,
  OpcionesRegistroExpoResponse,
} from "../../types/expo/expo.types";

export interface ProductoCatalogoExpo {
  idcatalogo_expo: number;
  nombre: string;
  descripcion?: string | null;
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
  precio_base?: number | null;
  costo_laminado?: number | null;
  id_tamano_producto?: number | null;
  tamano_producto?: string | null;
  idproducto_papel?: number | null;
  idgrupo_papel?: number | null;
  grupo_descripcion?: string | null;
  laminados_permitidos?: { idcat_laminado: number; nombre: string }[];
  asas_permitidas?: { idcat_tipo_asa: number; nombre: string }[];
  imagen_url: string | null;
  tipo_producto: string | null;
  tamano_prod?: string | null;
  pigmento?: string | null;
  // NUEVO: defaults de tintas — CANTIDAD (1-6), sin pantones.
  tintas_frente_default?: number | null;
  tintas_dentro_default?: number | null;
}

export interface CatalogoSistema {
  plastico:    any[];
  papel:       any[];
  coloresAsa:  { id: number; nombre: string }[];
  suajesPlast: { id: number; tipo: string }[];
}

export interface ClienteExpoAPI {
  idclientes:    number;
  nombre:        string | null;
  celular:       string | null;
  correo:        string | null;
  impresion:     string | null;
  ciudad:        string | null;
  estado:        string | null;
  clase:         string | null;
  intereses:     string[];
  observaciones: string | null;
  identificar:   string;
}

export interface DetalleExpo {
  idsolicitud_detalle: number;
  cantidad:        number;
  precio_total:    number;
  precio_unitario: number | null;
  aprobado:        boolean | null;
  precio_calculado_unitario?: number | null;
  precio_tablero_unitario?: number | null;
  cargo_extra_unitario?: number | null;
  ajuste_manual?: boolean | null;
  idcat_escala_costo?: number | null;
  escala_cantidad?: number | null;
  calculo_snapshot?: Record<string, unknown> | null;
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

export const getOpcionesRegistroExpo = async (): Promise<OpcionesRegistroExpoResponse> => {
  const { data } = await api.get<OpcionesRegistroExpoResponse>(
    "/expo/catalogo/opciones-registro"
  );
  return {
    papel: Array.isArray(data?.papel) ? data.papel : [],
    plastico: Array.isArray(data?.plastico) ? data.plastico : [],
    tamanos: Array.isArray(data?.tamanos) ? data.tamanos : [],
  };
};

export const crearProductoCatalogo = async (payload: Omit<ProductoCatalogoExpo, "idcatalogo_expo">): Promise<ProductoCatalogoExpo> => {
  const { data } = await api.post("/expo/catalogo", payload);
  return data.producto;
};

export const actualizarProductoCatalogo = async (id: number, payload: Omit<ProductoCatalogoExpo, "idcatalogo_expo">): Promise<ProductoCatalogoExpo> => {
  const { data } = await api.put(`/expo/catalogo/${id}`, payload);
  return data.producto;
};

export const eliminarProductoCatalogo = async (
  id: number,
  categoria: "papel" | "plastico" | "carton"
): Promise<void> => {
  await api.delete(`/expo/catalogo/${id}`, { params: { categoria } });
};

// ═══════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════

export const getClientesExpo = async (): Promise<ClienteExpoAPI[]> => {
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
// ═══════════════════════════════════════════════════════════
export const registrarProductoEnBlanco = async (
  fila: FilaProducto,
  precio1: string,
  precio2: string,
  precio3: string,
): Promise<{ id: number; fuente: "papel" | "plastico" }> => {
  const p = fila.producto;
  const parseN = (v: string | undefined | null) => parseFloat(v || "0") || null;
  const parsePrecioLocal = (v: string | undefined | null) => {
    const limpio = (v || "").replace(/[^0-9.]/g, "");
    return limpio ? (parseFloat(limpio) || null) : null;
  };

  const medidaStr = fila.medida || p.medida || null;
  let alturaCalc: number | null = null;
  let anchoCalc:  number | null = null;
  let fuelleCalc: number | null = null;

  if (medidaStr) {
    const clean = medidaStr.replace(/\s*cm\s*$/i, "").trim();
    let vertStr: string, horizStr: string;
    const partes = clean.split("x");
    if (partes.length >= 3) {
      anchoCalc  = parseFloat(partes[0]) || null;
      fuelleCalc = parseFloat(partes[1]) || null;
      alturaCalc = parseFloat(partes[2]) || null;
    } else if (partes.length === 2) {
      vertStr  = partes[0];
      horizStr = partes[1];
      const verts = vertStr.split("+").filter(Boolean);
      alturaCalc = parseFloat(verts[0]) || null;
      fuelleCalc = parseFloat(verts[1]) || null;
      anchoCalc  = parseFloat(horizStr) || null;
    }
  }

  const esPlastico = p.categoria === "plastico";

  if (esPlastico) {
    const payload = {
      nombre:        p.nombre || "Producto expo",
      tipo_producto: fila.tipoPlastico || p.tipoProducto || p.tipo || null,
      material:      fila.material || p.material || null,
      calibre:       fila.calibre  || p.calibre  || null,
      medida:        medidaStr,
      altura:            parseN(p.altura) ?? alturaCalc,
      ancho:             parseN(p.ancho)  ?? anchoCalc,
      fuelle_fondo:      parseN(p.fuelFondo) ?? fuelleCalc,
      fuelle_latIz:      parseN(p.fuelLateral),
      fuelle_latDe:      parseN(p.fuelLateral2),
      refuerzo:          parseN(p.refuerzo),
      precio_500:  parsePrecioLocal(precio1),
      precio_1000: parsePrecioLocal(precio2),
      precio_3000: parsePrecioLocal(precio3),
    };
    const { data } = await api.post("/productos-plastico/en-blanco-expo", payload);
    return { id: data.idconfiguracion_plastico as number, fuente: "plastico" };
  }

  const payload = {
    nombre:        p.nombre || "Producto expo",
    categoria:     p.categoria, // "papel" | "carton"
    medida:        medidaStr,
    material:      fila.material || p.material || null,
    calibre:       fila.calibre  || p.calibre  || null,
    tipo_producto: fila.tipoPlastico || p.tipoProducto || p.tipo || null,
    altura: parseN(p.altura) ?? alturaCalc,
    ancho:  parseN(p.ancho)  ?? anchoCalc,
    fuelle: parseN(p.fuelle) ?? fuelleCalc,
    precio_500:  parsePrecioLocal(precio1),
    precio_1000: parsePrecioLocal(precio2),
    precio_3000: parsePrecioLocal(precio3),
  };
  const { data } = await api.post("/productos-papel/en-blanco-expo", payload);
  return { id: data.idproducto_papel as number, fuente: "papel" };
};

// ═══════════════════════════════════════════════════════════
// Regla de costo de asa para papel/cartón
// ═══════════════════════════════════════════════════════════
// La opción de asa se sigue guardando normalmente mediante id_asa, pero el
// incremento de la matriz "asa" solo se aplica cuando el texto contiene
// "listón". Se ignoran mayúsculas y acentos.
const esAsaDeListon = (valor: unknown): boolean =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("liston");

// ═══════════════════════════════════════════════════════════
// mapearProductoAPayload
// ═══════════════════════════════════════════════════════════

export const mapearProductoAPayload = (
  fila: FilaProducto,
  precio1: string,
  precio2: string,
  precio3: string,
  cant1: string = "",
  cant2: string = "",
  cant3: string = "",
  columnasPrecio: 1 | 2 | 3 = 3,
): any => {
  const p = fila.producto;
  console.log("[PAYLOAD] fuente:", p.fuente, "categoria:", p.categoria, "nombre:", p.nombre);

  const parseP = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

  const extraNum = fila.modoExtra === "precio" ? parseP(fila.extra || "0") : 0;

  // Importante: "fila.asa" indica que sí hay una opción seleccionada y se
  // conserva para mostrarla/guardarla. Este boolean separado únicamente
  // decide si la tarifa de asa debe incrementar el precio de papel/cartón.
  const aplicaCostoAsaPapel =
    fila.asa && esAsaDeListon(fila.tipoAsa);

  // La cantidad de columnas visibles es la fuente de verdad del guardado.
  // Aunque React conserve valores antiguos en una columna oculta, aquí se
  // convierten explícitamente en cero para que nunca lleguen al backend.
  const p1raw = parseP(precio1);
  const p2raw = columnasPrecio >= 2 ? parseP(precio2) : 0;
  const p3raw = columnasPrecio >= 3 ? parseP(precio3) : 0;

  const p1 = p1raw > 0 ? p1raw + extraNum : 0;
  const p2 = p2raw > 0 ? p2raw + extraNum : 0;
  const p3 = p3raw > 0 ? p3raw + extraNum : 0;

  const parseCant = (s: string) => parseInt(s.replace(/,/g, ""), 10) || 0;
  const c1 = parseCant(cant1);
  const c2 = columnasPrecio >= 2 ? parseCant(cant2) : 0;
  const c3 = columnasPrecio >= 3 ? parseCant(cant3) : 0;

  const opcionesPrecioPapel: OpcionPrecioPapelCotizacionPayload[] = [
    {
      referencia: "precio1" as const,
      cantidad: c1,
      precio_tablero: p1raw,
      cargo_extra_unitario: extraNum,
      precio_final: p1,
    },
    {
      referencia: "precio2" as const,
      cantidad: c2,
      precio_tablero: p2raw,
      cargo_extra_unitario: extraNum,
      precio_final: p2,
    },
    {
      referencia: "precio3" as const,
      cantidad: c3,
      precio_tablero: p3raw,
      cargo_extra_unitario: extraNum,
      precio_final: p3,
    },
  ].filter(
    ({ cantidad, precio_tablero, precio_final }) =>
      cantidad > 0 &&
      precio_tablero > 0 &&
      precio_final > 0,
  );

  const paresCantidadPrecio = [
  { cantidad: c1, precio: p1 },
  { cantidad: c2, precio: p2 },
  { cantidad: c3, precio: p3 },
].filter(
  ({ cantidad, precio }) =>
    cantidad > 0 &&
    precio > 0
);

const cantidades = paresCantidadPrecio.map(
  ({ cantidad }) => cantidad
);

const precios = paresCantidadPrecio.map(
  ({ precio }) => precio
);

  // ── Papel del sistema SIGEB (o ya registrado en blanco desde Expo) ──────
  // Tintas se mandan como CANTIDAD, no id — el backend resuelve el id real
  // justo antes de insertar. Sin pantones.
  if ((p.categoria === "papel" || p.categoria === "carton") && (p.fuente === "sistema" || p.fuente === "expo")) {
    return {
      tipoCotizacion:   "papel",
      tipo_material:    "papel",
      idproducto_papel:  p.idproducto_papel ?? p.id,
      nombre:            p.nombre,
      idgrupo_papel:     p.idgrupo_papel     ?? null,
      grupo_descripcion: p.grupo_descripcion ?? null,
      tintasFrenteCantidad: fila.tintasFrente,
      tintasDentroCantidad: fila.usaTintasDentro ? fila.tintasDentro : null,
      carasId:           p.carasId           ?? null,
      id_asa:          fila.asa ? (fila.idAsa ?? null) : null,
      idcat_laminado:  fila.laminacion ? (fila.idLaminado ?? null) : null,
      idfoil:          fila.hs ? (fila.idFoil ?? null) : null,
      idcat_textura:   fila.textura ? (fila.idTextura ?? null) : null,
      laminacion:      fila.laminacion,
      hs:              fila.hs,
      textura:         fila.textura,
      asa:             aplicaCostoAsaPapel,
      uv:              fila.uv,
      alto_relieve:    fila.ar,
      observacion:     null,
      descripcion:     p.nombre        ?? null,
      cantidades: [c1, c2, c3] as [number, number, number],
      precios:    [p1, p2, p3] as [number, number, number],
      opciones_precio: opcionesPrecioPapel,
      herramental_descripcion:     null,
      herramental_precio:          null,
      cargo_adicional_descripcion: null,
      cargo_adicional_precio:      null,
    };
  }

  // ── Cartón "en blanco" desde Expo ───────────────────────────────────────
  if (p.fuente === "expo" && p.categoria === "carton") {
    return {
      tipoCotizacion:  "expo_papel",
      tipo_material:   "expo",
      categoria:       p.categoria,
      nombre:          p.nombre || null,
      tintasFrenteCantidad: fila.tintasFrente,
      tintasDentroCantidad: fila.usaTintasDentro ? fila.tintasDentro : null,
      observacion:     null,
      tipoLaminado:  fila.tipoLaminado || null,
      tipoHs:        fila.tipoHs       || null,
      tipoTextura:   fila.tipoTextura  || null,
      tipoAsa:       fila.tipoAsa      || null,
      uv:            fila.uv,
      ar:            fila.ar,
      hs:            fila.hs,
      cantidades,
      precios,
      opciones_precio: opcionesPrecioPapel,
    };
  }

  // ── Plástico (sistema, o ya registrado en blanco desde Expo) ────────────
  return {
    tipoCotizacion:            "plastico",
    tipo_material:             "plastico",
    configuracion_plastico_id: p.configuracion_plastico_id ?? p.id,
    tintasFrenteCantidad: fila.tintasFrente,
    nombre:                    p.nombre   || null,
    observacion:               null,
    id_laminado: fila.idLaminado ?? null,
    idfoil:      fila.idFoil     ?? null,
    id_textura:  fila.idTextura  ?? null,
    idsuaje:     fila.idSuaje   ?? null,
    id_color:    fila.idAsa     ?? null,
    uv:          fila.uv,
    ar:          fila.ar,
    pigmento:    fila.modoExtra === "pigmento" ? (fila.pigmento || null) : null,
    cantidades,
    precios,
  };
};