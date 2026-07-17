import type {
  Catalogs,
  CatKey,
  ProductoPapelListItem,
  ProductoPapelForm,
} from "../../types/papel/papel.types";

const BASE = import.meta.env.VITE_API_URL;

// NUEVO: "Tamaño del producto" ahora es FK a cat_tamano_producto — el mismo
// catálogo que alimenta la matriz de costos (acabado_costo). En vez de
// duplicar el endpoint, se reutiliza GET /precios-acabados-papel/catalogos
// (ya existente en precios_acabados_papel.controller.ts) y solo se usa el
// arreglo "tamanos" de su respuesta.
// AJUSTA esta ruta si el mount real en app.ts es distinto a
// "/precios-acabados-papel".
export interface TamanoProductoOpcion {
  id: number;
  clave: string;
  nombre: string;
  activo: boolean;
}

export const fetchTamanosProducto = async (): Promise<TamanoProductoOpcion[]> => {
  const res = await fetch(`${BASE}/precios-acabados-papel/catalogos`, {
    headers: headers(),
  });
  if (!res.ok) return leerError(res, "Error al cargar tamaños de producto");
  const data = await res.json();
  return Array.isArray(data?.tamanos) ? data.tamanos : [];
};

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

const normalizarItem = (item: any) => {
  const pkKey = Object.keys(item).find(
    key => key.startsWith("idcat_") && key !== "idcat_punto"
  );
  const id =
    item.id ??
    item.idrollo_lam ??
    (pkKey ? item[pkKey] : undefined) ??
    item.idcat_punto ??
    item.idmatrix;

  return {
    id,
    nombre:
      item.nombre ??
      item.medida_matrix ??
      (item.puntos != null ? String(item.puntos) : ""),
    medida: item.medida,
    medida_ancho:
      item.medida_ancho == null ? undefined : Number(item.medida_ancho),
    numero_maquina: item.numero_maquina,
    tipo_maquina: item.tipo_maquina ?? null,
    altura: item.altura,
    puntos: item.puntos,
    idcat_punto: item.idcat_punto,
  };
};

const normalizarCatalogos = (raw: Record<string, any[]>): Catalogs => {
  const resultado: Record<string, any[]> = {};
  for (const [key, items] of Object.entries(raw)) {
    resultado[key] = items.map(normalizarItem);
  }
  return resultado as Catalogs;
};

async function leerError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => null);
  throw new Error(data?.error ?? fallback);
}

export const fetchCatalogosPapel = async (): Promise<Catalogs> => {
  const res = await fetch(`${BASE}/catalogos-papel`, { headers: headers() });
  if (!res.ok) return leerError(res, "Error al cargar catalogos");
  return normalizarCatalogos(await res.json());
};

export const fetchCatalogosInactivos = async (): Promise<Catalogs> => {
  const res = await fetch(`${BASE}/catalogos-papel/inactivos`, {
    headers: headers(),
  });
  if (!res.ok) return leerError(res, "Error al cargar catalogos inactivos");
  return normalizarCatalogos(await res.json());
};

export const agregarItemCatalogo = async (
  catalogo: CatKey,
  nombre: string,
  medida?: string,
  numero_maquina?: string,
  altura?: string,
  idcat_punto?: number | null,
  tipo_maquina?: string | null
) => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      nombre,
      medida,
      numero_maquina,
      altura,
      idcat_punto,
      tipo_maquina,
    }),
  });
  if (!res.ok) return leerError(res, "Error al agregar item");
  return normalizarItem(await res.json());
};

export const editarItemCatalogo = async (
  catalogo: CatKey,
  id: number,
  nombre: string,
  medida?: string,
  numero_maquina?: string,
  altura?: string,
  idcat_punto?: number | null,
  tipo_maquina?: string | null
): Promise<void> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      nombre,
      medida,
      numero_maquina,
      altura,
      idcat_punto,
      tipo_maquina,
    }),
  });
  if (!res.ok) await leerError(res, "Error al editar item");
};

export const eliminarItemCatalogo = async (
  catalogo: CatKey,
  id: number
): Promise<void> => {
  const res = await fetch(`${BASE}/catalogos-papel/${catalogo}/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) await leerError(res, "Error al eliminar item");
};

export const reactivarItemCatalogo = async (
  catalogo: CatKey,
  id: number
): Promise<void> => {
  const res = await fetch(
    `${BASE}/catalogos-papel/${catalogo}/${id}/reactivar`,
    { method: "PATCH", headers: headers() }
  );
  if (!res.ok) await leerError(res, "Error al reactivar item");
};

export const fetchProductosPapel = async (): Promise<
  ProductoPapelListItem[]
> => {
  const res = await fetch(`${BASE}/productos-papel`, { headers: headers() });
  if (!res.ok) return leerError(res, "Error al cargar productos de papel");
  return res.json();
};

export const fetchProductoPapelById = async (id: number): Promise<any> => {
  const res = await fetch(`${BASE}/productos-papel/${id}`, {
    headers: headers(),
  });
  if (!res.ok) return leerError(res, "Error al cargar el producto");
  return res.json();
};

export const crearProductoPapel = async (
  data: ProductoPapelForm
): Promise<{ idproducto_papel: number }> => {
  const res = await fetch(`${BASE}/productos-papel`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mapFormToApi(data)),
  });
  if (!res.ok) return leerError(res, "Error al registrar el producto");
  return res.json();
};

export const actualizarProductoPapel = async (
  id: number,
  data: ProductoPapelForm
): Promise<void> => {
  const res = await fetch(`${BASE}/productos-papel/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(mapFormToApi(data)),
  });
  if (!res.ok) await leerError(res, "Error al actualizar el producto");
};

export const eliminarProductoPapel = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE}/productos-papel/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) await leerError(res, "Error al eliminar el producto");
};

const mapFormToApi = (form: ProductoPapelForm) => ({
  idcat_tipo_producto_papel: form.idcat_tipo_producto_papel,
  descripcion_papel: form.descripcion || null,
  ancho: form.ancho || null,
  fuelle: form.fuelle || null,
  altura: form.altura || null,
  medida: form.medida || null,
  tamano_asa_default: form.tamanoAsaDefault.trim() || null,
  // NUEVO: tamaño del producto (Mini/Chico/Mediano/Grande/Extragrande).
  // NUEVO: tamano_prod ahora es FK (idcat_tamano_producto), ya no texto.
  tamano_prod: form.idcat_tamano_producto ?? null,
  costo_laminado: form.costoLaminado ?? null,
  grupos: form.grupos.map(grupo => ({
    precio_sugerido: grupo.precioSugerido
      ? parseFloat(grupo.precioSugerido)
      : null,
    materiales: grupo.materiales.map(material => ({
      idcat_tipo_papel: material.idcat_tipo_papel,
      idcat_calibre: material.idcat_calibre,
      pliego: material.pliego || null,
      rendimiento: material.rendimiento || null,
      corte: material.corte || null,
      hojeado: {
        bobina: material.hojeado.bobina || null,
        corte: material.hojeado.corte || null,
        rendimiento: material.hojeado.rendimiento || null,
        guillotina: material.hojeado.guillotina || null,
        hilo: material.hojeado.hilo || null,
        bobina_extra: material.hojeado.bobinaExtra || null,
      },
    })),
  })),
  suaje: {
    numero: form.suaje.numero || null,
    pzs: form.suaje.pzs || null,
    tamano: form.suaje.tamano || null,
    corte1_tipo: form.suaje.corte1Tipo || null,
    corte1_medida: form.suaje.corte1Medida || null,
    idcat_corte: form.suaje.idcat_corte,
    idcat_punto_corte: form.suaje.idcat_punto_corte,
    dobles1_tipo: form.suaje.dobles1Tipo || null,
    dobles1_medida: form.suaje.dobles1Medida || null,
    idcat_doble: form.suaje.idcat_doble,
    idcat_punto_doble: form.suaje.idcat_punto_doble,
    metros: form.suaje.metros || null,
    idcat_matrix: form.suaje.idcat_matrix,
    tiempo_arreglo: form.suaje.tiempoArreglo
      ? parseInt(form.suaje.tiempoArreglo)
      : null,
    idcat_sacabocados: form.suaje.idcat_sacabocados,
    cantidad_sacabocado: form.suaje.cantidad_sacabocado
      ? parseInt(form.suaje.cantidad_sacabocado)
      : null,
    idcat_perforado: form.suaje.idcat_perforado,
    cantidad_perforado: form.suaje.cantidad_perforado
      ? parseInt(form.suaje.cantidad_perforado)
      : null,
    herramental_desbarbe: form.suaje.herramentalDesbarbe,
    no_desbarbe:
      form.suaje.herramentalDesbarbe && form.suaje.noDesbarbe.trim()
        ? form.suaje.noDesbarbe.trim()
        : null,
  },
  acabados: {
    idcat_tipo_pegado: form.acabados.idcat_tipo_pegado,
    idcat_pegamento: form.acabados.idcat_pegamento,
    laminados: form.acabados.laminados,
    // FK real hacia public.rollo_lam(idrollo_lam).
    idrollo_lam: form.acabados.idrollo_lam,
    // NUEVO: "Desarrollo para laminado" — número de captura libre, se manda
    // parseado como float igual que el resto de los campos numéricos.
    desarrollo_laminado: form.acabados.desarrolloLaminado?.trim()
      ? parseFloat(form.acabados.desarrolloLaminado.replace(",", "."))
      : null,
    asas: form.acabados.asas,
    idcat_refuerzo_material: form.acabados.idcat_refuerzo_material,
    idcat_refuerzo_medidas: form.acabados.idcat_refuerzo_medidas,
    idcat_base_material: form.acabados.idcat_base_material,
    base_medida: form.acabados.base_medida || null,
    idcat_empaque: form.acabados.idcat_empaque,
    pzs_caja: form.acabados.pzs_caja
      ? parseInt(form.acabados.pzs_caja)
      : null,
  },
  maquinaria: {
    hojeado_guillotina: form.maquinaria.hojeado_guillotina,
    impresora: form.maquinaria.impresora,
    hs_ar: form.maquinaria.hs_ar,
    suaje_maquina: form.maquinaria.suaje_maquina,
    uv: form.maquinaria.uv,
    laminado_maquina: form.maquinaria.laminado_maquina,
    texturizadora: form.maquinaria.texturizadora,
    empaque_maquina: form.maquinaria.empaque_maquina,
    empalme: form.maquinaria.empalme,
    armado: form.maquinaria.armado,
    asas_maquina: form.maquinaria.asas_maquina,
    desbarbe: form.maquinaria.desbarbe,
  },
});