import type { Catalogs, CatKey, ProductoPapelListItem, ProductoPapelForm } from "../../types/papel/papel.types";

const BASE = import.meta.env.VITE_API_URL;

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════════════════════════════════════
const normalizarItem = (item: any) => {
  // Si el backend ya alias el PK como "id" (cortes, dobles), úsalo directo.
  // Si no, detecta la primera columna idcat_* que NO sea idcat_punto
  // (en cortes/dobles idcat_punto es FK, no PK). Para el catálogo de puntos,
  // idcat_punto SÍ es el PK (fallback). Matrix usa idmatrix.
  const pkKey = Object.keys(item).find(k => k.startsWith("idcat_") && k !== "idcat_punto");
  const id =
    item.id
    ?? (pkKey ? item[pkKey] : undefined)
    ?? item.idcat_punto
    ?? item.idmatrix;

  return {
    id,
    nombre:         item.nombre ?? item.medida_matrix ?? (item.puntos != null ? String(item.puntos) : ""),
    medida:         item.medida,
    numero_maquina: item.numero_maquina,
    altura:         item.altura,
    puntos:         item.puntos,
    idcat_punto:    item.idcat_punto,
  };
};

const normalizarItems = (items: any[]): any[] => items.map(normalizarItem);

export const fetchCatalogosPapel = async (): Promise<Catalogs> => {
  const res = await fetch(`${BASE}/catalogos-papel`, { headers: headers() });
  if (!res.ok) throw new Error("Error al cargar catálogos");
  const raw = await res.json();
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
  numero_maquina?: string,
  altura?: string,
  idcat_punto?: number | null,
): Promise<any> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ nombre, medida, numero_maquina, altura, idcat_punto }),
  });
  if (!res.ok) throw new Error("Error al agregar item al catálogo");
  const raw = await res.json();
  return normalizarItem(raw);
};

export const editarItemCatalogo = async (
  catalogo: CatKey,
  id: number,
  nombre: string,
  medida?: string,
  numero_maquina?: string,
  altura?: string,
  idcat_punto?: number | null,
): Promise<void> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ nombre, medida, numero_maquina, altura, idcat_punto }),
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

export const reactivarItemCatalogo = async (catalogo: CatKey, id: number): Promise<void> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}/${id}/reactivar`, {
    method: "PATCH",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Error al reactivar item del catálogo");
};

export const eliminarItemCatalogo = async (catalogo: CatKey, id: number): Promise<void> => {
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
// MAPPER
// ═══════════════════════════════════════════════════════════════════════════
const mapFormToApi = (form: ProductoPapelForm) => ({
  idcat_tipo_producto_papel: form.idcat_tipo_producto_papel,
  descripcion_papel: form.descripcion || null,
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
        bobina_extra: m.hojeado.bobinaExtra || null,
      },
    })),
  })),

  suaje: {
    numero:         form.suaje.numero        || null,
    pzs:            form.suaje.pzs           || null,
    tamano:         form.suaje.tamano        || null,
    corte1_tipo:    form.suaje.corte1Tipo    || null,
    corte1_medida:  form.suaje.corte1Medida  || null,
    idcat_corte:        form.suaje.idcat_corte,
    idcat_punto_corte:  form.suaje.idcat_punto_corte,
    dobles1_tipo:   form.suaje.dobles1Tipo   || null,
    dobles1_medida: form.suaje.dobles1Medida || null,
    idcat_doble:        form.suaje.idcat_doble,
    idcat_punto_doble:  form.suaje.idcat_punto_doble,
    metros:         form.suaje.metros        || null,
    idcat_matrix:   form.suaje.idcat_matrix,
    tiempo_arreglo: form.suaje.tiempoArreglo ? parseInt(form.suaje.tiempoArreglo) : null,
    idcat_sacabocados:   form.suaje.idcat_sacabocados,
    cantidad_sacabocado: form.suaje.cantidad_sacabocado ? parseInt(form.suaje.cantidad_sacabocado) : null,
    idcat_perforado:     form.suaje.idcat_perforado,
    cantidad_perforado:  form.suaje.cantidad_perforado ? parseInt(form.suaje.cantidad_perforado) : null,
    herramental_desbarbe: !!form.suaje.herramentalDesbarbe,
    // no_desbarbe ahora es VARCHAR: se manda como string para conservar valores
    // alfanuméricos como "001A". No usar parseInt (rompería la letra).
    no_desbarbe:          form.suaje.herramentalDesbarbe && form.suaje.noDesbarbe.trim()
      ? form.suaje.noDesbarbe.trim()
      : null,
  },

  acabados: {
    idcat_tipo_pegado:       form.acabados.idcat_tipo_pegado,
    idcat_pegamento:         form.acabados.idcat_pegamento,
    laminados:               form.acabados.laminados,
    asas:                    form.acabados.asas,
    idcat_refuerzo_material: form.acabados.idcat_refuerzo_material,
    idcat_refuerzo_medidas:  form.acabados.idcat_refuerzo_medidas,
    idcat_base_material:     form.acabados.idcat_base_material,
    base_medida:             form.acabados.base_medida || null,
    idcat_empaque:           form.acabados.idcat_empaque,
    pzs_caja:                form.acabados.pzs_caja ? parseInt(form.acabados.pzs_caja) : null,
  },

  maquinaria: {
    hojeado_guillotina: form.maquinaria.hojeado_guillotina,
    impresora:          form.maquinaria.impresora,
    hs_ar:              form.maquinaria.hs_ar,
    suaje_maquina:      form.maquinaria.suaje_maquina,
    uv:                 form.maquinaria.uv,
    textura:            form.maquinaria.textura,
    empalme:            form.maquinaria.empalme,
    armado:             form.maquinaria.armado,
    asas_maquina:       form.maquinaria.asas_maquina,
    desbarbe:           form.maquinaria.desbarbe,
  },
});