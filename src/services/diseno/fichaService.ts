import api from "../api";

// ============================================================
// TIPOS
// ============================================================

export interface UbicacionFicha {
  idficha_ubicacion?: number;
  zona: string | null;
  descripcion_libre: string | null;
  imagen_id: number | null;
  pin_x: number | null;
  pin_y: number | null;
}

export type TipoElemento = "acabado" | "red_social" | "texto";

export interface DetalleFicha {
  idficha_detalle?: number;
  tipo_elemento: TipoElemento;
  nombre: string;
  detalle: string | null;
  url: string | null;
  orden?: number;
  ubicaciones: UbicacionFicha[];
}

export interface PantoneFicha {
  idficha_pantone?: number;
  orden?: number;
  codigo: string;
  hex_referencia: string | null;
  cara: "fuera" | "dentro" | null;
}

export interface ImagenFicha {
  idficha_imagen: number;
  archivo_id: number;
  public_id: string;
  vista: string;
  es_principal: boolean;
  url?: string;
}

export interface FichaDiseno {
  idficha: number;
  orden_diseno_id: number;
  no_pedido: string;
  no_orden_diseno: string | null;
  tipo_material: "papel" | "plastico";
  familia: string;
  especificacion: Record<string, any>;
  compromiso_entrega: string | null;
  fecha_conclusion: string | null;
  comentarios: string | null;
  version: number;
  estado: "borrador" | "publicada" | "aprobada";
  escala_pin?: number;
  created_at: string;
  creado_por: number | null;
  pantones: PantoneFicha[];
  imagenes: ImagenFicha[];
  detalles: DetalleFicha[];
}

export interface ZonaProducto {
  idcat_zona: number;
  clave: string;
  nombre: string;
  orden: number;
  personalizada?: boolean;
}

export interface OpcionCatalogo {
  idcatalogo_acabado: number;
  nombre: string;
  aplica_a: "papel" | "plastico" | "ambos";
  veces_usado: number;
}

// ============================================================
// LECTURA
// ============================================================

export const getFicha = async (ordenId: number): Promise<FichaDiseno | null> => {
  try {
    const res = await api.get(`/ficha/orden/${ordenId}`);
    return res.data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const getZonas = async (familia = "bolsa"): Promise<ZonaProducto[]> => {
  const res = await api.get(`/ficha/zonas/${familia}`);
  return res.data;
};

export const getSugerenciasAcabado = async (
  q = ""
): Promise<{ nombre: string; veces: number }[]> => {
  const res = await api.get("/ficha/sugerencias", { params: { q } });
  return res.data;
};

export const getRedesCliente = async (idclientes: number) => {
  const res = await api.get(`/ficha/redes-cliente/${idclientes}`);
  return res.data;
};

// ============================================================
// ESCRITURA
// ============================================================

export const crearFicha = async (
  ordenId: number,
  datos?: { compromiso_entrega?: string | null }
): Promise<FichaDiseno> => {
  const res = await api.post(`/ficha/orden/${ordenId}`, datos ?? {});
  return res.data;
};

export const guardarFicha = async (
  idficha: number,
  datos: {
    compromiso_entrega?: string | null;
    fecha_conclusion?: string | null;
    comentarios?: string | null;
    escala_pin?: number;
    pantones: PantoneFicha[];
    detalles: DetalleFicha[];
  }
): Promise<FichaDiseno> => {
  const res = await api.put(`/ficha/${idficha}`, datos);
  return res.data;
};

export const publicarFicha = async (
  idficha: number
): Promise<{ version: number; mensaje: string }> => {
  const res = await api.post(`/ficha/${idficha}/publicar`);
  return res.data;
};

export const agregarImagenFicha = async (
  idficha: number,
  datos: { archivo_id: number; vista?: string; es_principal?: boolean }
) => {
  const res = await api.post(`/ficha/${idficha}/imagen`, datos);
  return res.data;
};

export const guardarRedCliente = async (
  idclientes: number,
  datos: { red: string; usuario?: string; url?: string }
) => {
  const res = await api.post(`/ficha/redes-cliente/${idclientes}`, datos);
  return res.data;
};

// ============================================================
// CATÁLOGO AMPLIABLE
//
// El desplegable arranca con una semilla y crece con el uso. Lo
// que el usuario agregue queda disponible para todas las fichas
// siguientes, ordenado por frecuencia.
// ============================================================

export const getCatalogoAcabados = async (
  material?: "papel" | "plastico"
): Promise<OpcionCatalogo[]> => {
  const res = await api.get("/ficha/catalogo-acabados", {
    params: material ? { material } : {},
  });
  return res.data;
};

export const agregarOpcionCatalogo = async (datos: {
  nombre: string;
  aplica_a?: "papel" | "plastico" | "ambos";
}): Promise<OpcionCatalogo> => {
  const res = await api.post("/ficha/catalogo-acabados", datos);
  return res.data;
};

export const agregarZona = async (
  familia: string,
  nombre: string
): Promise<ZonaProducto> => {
  const res = await api.post(`/ficha/zonas/${familia}`, { nombre });
  return res.data;
};

// ============================================================
// SINCRONÍA CON EL PRODUCTO
// ============================================================

export interface CambioSnapshot {
  campo: string;
  antes: any;
  ahora: any;
}

/** Solo consulta: no modifica la ficha. */
export const getCambiosProducto = async (
  idficha: number
): Promise<{ hayCambios: boolean; cambios: CambioSnapshot[] }> => {
  const res = await api.get(`/ficha/${idficha}/cambios-producto`);
  return res.data;
};

/** Trae los datos actuales del producto. No toca la captura manual. */
export const refrescarFicha = async (
  idficha: number
): Promise<{ ficha: FichaDiseno; cambios: CambioSnapshot[]; mensaje: string }> => {
  const res = await api.post(`/ficha/${idficha}/refrescar`);
  return res.data;
};

// ============================================================
// PDF
//
// Se baja como blob con axios y no con un <a href> directo,
// porque así viaja el token de autenticación. Un enlace normal
// no manda el header Authorization.
// ============================================================

const obtenerBlobPdf = async (idficha: number, descargar: boolean) => {
  const res = await api.get(`/ficha/${idficha}/pdf`, {
    params: descargar ? { descargar: 1 } : {},
    responseType: "blob",
  });

  const nombre =
    res.headers["content-disposition"]?.match(/filename="(.+?)"/)?.[1] ??
    `ficha-${idficha}.pdf`;

  return { blob: res.data as Blob, nombre };
};

/** Abre el PDF en una pestaña nueva, sin descargarlo. */
export const verPdfFicha = async (idficha: number) => {
  const { blob } = await obtenerBlobPdf(idficha, false);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // Se libera tarde para que el visor alcance a leerlo.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

/** Fuerza la descarga con el nombre que manda el servidor. */
export const descargarPdfFicha = async (idficha: number) => {
  const { blob, nombre } = await obtenerBlobPdf(idficha, true);
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);
  return nombre;
};

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Numeración continua entre acabados y redes, igual que en el PDF.
 * Los acabados van primero.
 */
export const numerarDetalles = (detalles: DetalleFicha[]) =>
  detalles.map((d, i) => ({ ...d, numero: i + 1 }));

/**
 * Todos los pines de una imagen, listos para dibujar encima.
 */
export const pinesDeImagen = (detalles: DetalleFicha[], imagenId: number) => {
  const pines: {
    numero: number;
    x: number;
    y: number;
    nombre: string;
    esRed: boolean;
  }[] = [];

  detalles.forEach((d, i) => {
    d.ubicaciones.forEach((u) => {
      if (u.imagen_id === imagenId && u.pin_x !== null && u.pin_y !== null) {
        pines.push({
          numero: i + 1,
          x: Number(u.pin_x),
          y: Number(u.pin_y),
          nombre: d.nombre,
          esRed: d.tipo_elemento === "red_social",
        });
      }
    });
  });

  return pines;
};

export const contarSinUbicar = (detalles: DetalleFicha[]) =>
  detalles.filter((d) =>
    d.ubicaciones.every((u) => u.pin_x === null || u.pin_y === null)
  );