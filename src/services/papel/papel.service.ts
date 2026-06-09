import type { Catalogs, CatKey, ProductoPapelListItem, ProductoPapelForm } from "../../types/papel/papel.types";

const BASE = import.meta.env.VITE_API_URL;

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════════════════════════════════════

// Cada tabla retorna su PK con nombre específico (idcat_laminado, idcat_calibre, etc.)
// Este mapper normaliza todos a { id, nombre, medida? } para que el frontend los maneje igual
const normalizarItems = (items: any[]): { id: number; nombre: string; medida?: string }[] =>
  items.map(item => {
    // Buscar la clave que empiece con "idcat_" o sea el primer campo numérico
    const pkKey = Object.keys(item).find(k => k.startsWith("idcat_"));
    return {
      id:     pkKey ? item[pkKey] : item.id,
      nombre: item.nombre,
      medida: item.medida,
      numero_maquina: item.numero_maquina, // para catálogo de maquinaria, opcional en otros
    };
  });

export const fetchCatalogosPapel = async (): Promise<Catalogs> => {
  const res = await fetch(`${BASE}/catalogos-papel`, { headers: headers() });
  if (!res.ok) throw new Error("Error al cargar catálogos");
  const raw = await res.json();
  // Normalizar todos los catálogos
  const normalizado: any = {};
  for (const key of Object.keys(raw)) {
    normalizado[key] = normalizarItems(raw[key]);
  }
  return normalizado as Catalogs;
};

export const agregarItemCatalogo = async (
  catalogo: CatKey,
  nombre: string,
  medida?: string,
  numero_maquina?: string
): Promise<{ id: number; nombre: string; medida?: string }> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ nombre, medida, numero_maquina }),
  });
  if (!res.ok) throw new Error("Error al agregar item al catálogo");
  const raw = await res.json();
  const pkKey = Object.keys(raw).find(k => k.startsWith("idcat_"));
  return { id: pkKey ? raw[pkKey] : raw.id, nombre: raw.nombre, medida: raw.medida };
};

export const editarItemCatalogo = async (
  catalogo: CatKey,
  id: number,
  nombre: string,
  medida?: string,
  numero_maquina?: string
): Promise<void> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ nombre, medida, numero_maquina }),
  });
  if (!res.ok) throw new Error("Error al editar item del catálogo");
};

export const fetchCatalogosInactivos = async (): Promise<Catalogs> => {
  const res = await fetch(`${BASE}/catalogos-papel/inactivos`, { headers: headers() });
  if (!res.ok) throw new Error("Error al cargar catálogos inactivos");
  const raw = await res.json();
  const normalizado: any = {};
  for (const key of Object.keys(raw)) {
    normalizado[key] = normalizarItems(raw[key]);
  }
  return normalizado as Catalogs;
};

export const reactivarItemCatalogo = async (
  catalogo: CatKey,
  id: number
): Promise<void> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}/${id}/reactivar`, {
    method: "PATCH",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Error al reactivar item del catálogo");
};

export const eliminarItemCatalogo = async (
  catalogo: CatKey,
  id: number
): Promise<void> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Error al eliminar item del catálogo");
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTOS PAPEL
// ═══════════════════════════════════════════════════════════════════════════

export const fetchProductosPapel = async (): Promise<ProductoPapelListItem[]> => {
  const res = await fetch(`${BASE}/productos-papel`, { headers: headers() });
  if (!res.ok) throw new Error("Error al cargar productos de papel");
  return res.json();
};

export const fetchProductoPapelById = async (id: number): Promise<any> => {
  const res = await fetch(`${BASE}/productos-papel/${id}`, { headers: headers() });
  if (!res.ok) throw new Error("Error al cargar el producto");
  return res.json();
};

export const crearProductoPapel = async (data: ProductoPapelForm): Promise<{ idproducto_papel: number }> => {
  const res = await fetch(`${BASE}/productos-papel`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mapFormToApi(data)),
  });
  if (!res.ok) throw new Error("Error al registrar el producto");
  return res.json();
};

export const actualizarProductoPapel = async (id: number, data: ProductoPapelForm): Promise<void> => {
  const res = await fetch(`${BASE}/productos-papel/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(mapFormToApi(data)),
  });
  if (!res.ok) throw new Error("Error al actualizar el producto");
};

export const eliminarProductoPapel = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE}/productos-papel/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Error al eliminar el producto");
};

// ═══════════════════════════════════════════════════════════════════════════
// MAPPER — form → body que espera el backend
// ═══════════════════════════════════════════════════════════════════════════
const mapFormToApi = (form: ProductoPapelForm) => ({
  idcat_tipo_producto_papel: form.idcat_tipo_producto_papel,
  ancho:   form.ancho   || null,
  fuelle:  form.fuelle  || null,
  altura:  form.altura  || null,
  medida:  form.medida  || null,

  grupos: form.grupos.map((g) => ({
    precio_sugerido: g.precioSugerido ? parseFloat(g.precioSugerido) : null,
    materiales: g.materiales.map((m) => ({
      idcat_tipo_papel: m.idcat_tipo_papel,
      idcat_calibre:    m.idcat_calibre,
      pliego:           m.pliego      || null,
      rendimiento:      m.rendimiento || null,
      corte:            m.corte       || null,
      hojeado: {
        bobina:      m.hojeado.bobina      || null,
        corte:       m.hojeado.corte       || null,
        rendimiento: m.hojeado.rendimiento || null,
        guillotina:  m.hojeado.guillotina  || null,
        hilo:        m.hojeado.hilo        || null,
      },
    })),
  })),

  suaje: {
    numero:          form.suaje.numero         || null,
    pzs:             form.suaje.pzs            || null,
    tamano:          form.suaje.tamano         || null,
    corte1_tipo:     form.suaje.corte1Tipo     || null,
    corte1_medida:   form.suaje.corte1Medida   || null,
    dobles1_tipo:    form.suaje.dobles1Tipo    || null,
    dobles1_medida:  form.suaje.dobles1Medida  || null,
    metros:          form.suaje.metros         || null,
    matrix:          form.suaje.matrix         || null,
    tiempo_arreglo:  form.suaje.tiempoArreglo  ? parseInt(form.suaje.tiempoArreglo) : null,
    idcat_sacabocados:    form.suaje.idcat_sacabocados,
    cantidad_sacabocado:  form.suaje.cantidad_sacabocado ? parseInt(form.suaje.cantidad_sacabocado) : null,
    idcat_perforado:      form.suaje.idcat_perforado,
    cantidad_perforado:   form.suaje.cantidad_perforado  ? parseInt(form.suaje.cantidad_perforado)  : null,
  },

  acabados: {
    idcat_tipo_pegado:       form.acabados.idcat_tipo_pegado,
    idcat_pegamento:         form.acabados.idcat_pegamento,
    idcat_laminado:          form.acabados.idcat_laminado,
    asas:                    form.acabados.asas,
    idcat_refuerzo_material: form.acabados.idcat_refuerzo_material,
    idcat_refuerzo_medidas:  form.acabados.idcat_refuerzo_medidas,
    idcat_base_material:     form.acabados.idcat_base_material,
    base_medida:             form.acabados.base_medida || null,
    idcat_empaque:           form.acabados.idcat_empaque,
    pzs_caja:                form.acabados.pzs_caja ? parseInt(form.acabados.pzs_caja) : null,
  },

  maquinaria: {
    idcat_hojeado_guillotina: form.maquinaria.idcat_hojeado_guillotina,
    idcat_impresora:          form.maquinaria.idcat_impresora,
    idcat_hs_ar:              form.maquinaria.idcat_hs_ar,
    idcat_suaje_maquina:      form.maquinaria.idcat_suaje_maquina,
    idcat_uv:                 form.maquinaria.idcat_uv,
    idcat_textura:            form.maquinaria.idcat_textura,
    idcat_empalme:            form.maquinaria.idcat_empalme,
    idcat_armado:             form.maquinaria.idcat_armado,
    idcat_asas_maquina:       form.maquinaria.idcat_asas_maquina,
    idcat_desbarbe:           form.maquinaria.idcat_desbarbe,
  },
});