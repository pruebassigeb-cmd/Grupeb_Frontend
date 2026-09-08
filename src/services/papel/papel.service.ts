import type {
  Catalogs,
  CatKey,
  ProductoPapelListItem,
  ProductoPapelForm,
  Suaje,
  Acabados,
  Maquinaria,
  MaterialEntry,
  ComponentePapel,
  ComponenteProceso,
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

// ═══════════════════════════════════════════════════════════════════════════
// PROCESO_CAT (Fase 5: productos especiales — ruta de procesos)
// ═══════════════════════════════════════════════════════════════════════════
// Nadie exponía este catálogo a un cliente hasta ahora — ver la nota en
// producto_papel.controller.ts (getProcesosCat). Vive dentro del router de
// /api/productos-papel, que ya estaba montado, registrado así:
//
//   router.get("/procesos/catalogo", authMiddleware, getProcesosCat);
//
// Son DOS segmentos a propósito. Con un solo segmento la ruta quedaba a
// merced del orden de registro frente a router.get("/:id", ...): si quedaba
// después, ":id" se la comía, el id llegaba no numérico y salía un 500. Con
// dos segmentos ya no puede pasar, y por eso en producto_papel.routes.ts
// puede ir debajo de "/:id" sin problema.
export interface ProcesoCatOpcion {
  idproceso_cat: number;
  nombre_proceso: string;
  familia: string;
  tabla: string;
}

export const fetchProcesosCat = async (): Promise<ProcesoCatOpcion[]> => {
  const res = await fetch(`${BASE}/productos-papel/procesos/catalogo`, { headers: headers() });
  if (!res.ok) return leerError(res, "Error al cargar el catálogo de procesos");
  return res.json();
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

// ═══════════════════════════════════════════════════════════════════════════
// IMAGEN DEL PRODUCTO (Fase 6: productos especiales)
// ═══════════════════════════════════════════════════════════════════════════
// No es una columna nueva: reutiliza el mismo sistema genérico de archivos
// que el alta normal ya usa para "imagen-suaje-papel" (tabla `archivos`,
// categoria libre, FK a idproducto_papel — ver producto_papel.controller.ts
// y SecArchivos en FormularioProductoPapelAlta.tsx). Aquí solo se agrega
// una categoria más sobre esa misma tabla para la foto del producto.
export const CATEGORIA_IMAGEN_PRODUCTO_ESPECIAL = "imagen-producto-especial";

export interface ArchivoProducto {
  id_archivo: number;
  nombre: string;
  url: string;
  categoria: string;
  tipo: string;
}

export const subirImagenProducto = async (
  idproducto_papel: number,
  file: File
): Promise<void> => {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("carpeta", "producto-especial");
  formData.append("subcarpeta", "imagen");
  formData.append("categoria", CATEGORIA_IMAGEN_PRODUCTO_ESPECIAL);
  formData.append("idproducto_papel", String(idproducto_papel));
  // Sin Content-Type a mano: con FormData el navegador arma el boundary del
  // multipart solo, igual que ya hace SecArchivos en el alta normal.
  const res = await fetch(`${BASE}/archivos/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    body: formData,
  });
  if (!res.ok) return leerError(res, "No se pudo subir la imagen del producto");
};

export const eliminarArchivoProducto = async (idArchivo: number): Promise<void> => {
  const res = await fetch(`${BASE}/archivos/${idArchivo}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
  });
  if (!res.ok) return leerError(res, "No se pudo eliminar la imagen");
};

// Baja los BYTES de un archivo servidos por la propia API, no por S3
// (Jose, 2026-09-04).
//
// Por qué no se usa la URL firmada: para meter la foto dentro del diagrama SVG
// hay que LEER sus bytes, y contra S3 eso lo bloquea CORS -- el bucket no
// publica Access-Control-Allow-Origin para el dominio de la app. Mostrarla en
// un <img> sí funciona (por eso se ve en pantalla); leerla, no.
//
// Este endpoint YA EXISTÍA: obtenerContenidoArchivo en archivo.controller.ts,
// creado en su momento por exactamente el mismo motivo (el visor de PDF
// necesitaba los bytes). Baja el objeto de S3 del lado del servidor -- donde
// CORS no aplica, porque es el SDK y no el navegador -- y lo reenvía desde el
// origen de la API, que sí tiene su CORS configurado.
//
// De paso es la opción más segura: la URL firmada nunca sale del servidor, y
// el acceso queda sujeto al token del usuario en vez de a una liga que sirve
// una hora para quien la tenga.
//
// Devuelve null en vez de tronar: si falla, el diagrama cae al dibujo
// predeterminado, que es justo lo que hace la pantalla cuando no hay imagen.
//
// OJO: la ruta se infirió del nombre del controlador. Si en archivo.routes.ts
// está registrada con otra ruta, hay que corregirla AQUÍ y en ningún otro lado.
export const fetchContenidoArchivo = async (idArchivo: number): Promise<Blob | null> => {
  try {
    const res = await fetch(`${BASE}/archivos/${idArchivo}/contenido`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTAS DEL PRODUCTO (Fase 6: productos especiales)
// ═══════════════════════════════════════════════════════════════════════════
// Lista real de observaciones generales del producto que el usuario escribe
// y guarda -- antes el panel "Notas" solo armaba texto a partir de los
// materiales, sin poder editarlo ni agregar nuevas (Jose). Tabla nueva
// `producto_papel_nota`, ver la migración que se le pasó por chat y los
// endpoints en producto_papel.controller.ts.
export interface NotaProducto {
  idnota_producto_papel: number;
  texto: string;
  created_at: string;
  updated_at: string | null;
}

export const fetchNotasProducto = async (idproducto_papel: number): Promise<NotaProducto[]> => {
  const res = await fetch(`${BASE}/productos-papel/${idproducto_papel}/notas`, { headers: headers() });
  if (!res.ok) return leerError(res, "Error al cargar las notas del producto");
  return res.json();
};

export const crearNotaProducto = async (
  idproducto_papel: number,
  texto: string
): Promise<NotaProducto> => {
  const res = await fetch(`${BASE}/productos-papel/${idproducto_papel}/notas`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ texto }),
  });
  if (!res.ok) return leerError(res, "No se pudo guardar la nota");
  return res.json();
};

export const actualizarNotaProducto = async (
  idnota: number,
  texto: string
): Promise<NotaProducto> => {
  const res = await fetch(`${BASE}/productos-papel/notas/${idnota}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ texto }),
  });
  if (!res.ok) return leerError(res, "No se pudo actualizar la nota");
  return res.json();
};

export const eliminarNotaProducto = async (idnota: number): Promise<void> => {
  const res = await fetch(`${BASE}/productos-papel/notas/${idnota}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) return leerError(res, "No se pudo eliminar la nota");
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

// ═══════════════════════════════════════════════════════════════════════════
// MAPEOS AUXILIARES (Fase 3)
// ═══════════════════════════════════════════════════════════════════════════
// suaje/acabados/maquinaria se mandan con el mismo shape tanto a nivel
// producto como, ahora, a nivel de cada componente de un producto especial
// (ver Scope en producto_papel.controller.ts) — por eso se extraen aquí en
// vez de repetir el objeto literal en los dos lugares.

const mapSuajeToApi = (suaje: Suaje) => ({
  numero: suaje.numero || null,
  pzs: suaje.pzs || null,
  tamano: suaje.tamano || null,
  corte1_tipo: suaje.corte1Tipo || null,
  corte1_medida: suaje.corte1Medida || null,
  idcat_corte: suaje.idcat_corte,
  idcat_punto_corte: suaje.idcat_punto_corte,
  dobles1_tipo: suaje.dobles1Tipo || null,
  dobles1_medida: suaje.dobles1Medida || null,
  idcat_doble: suaje.idcat_doble,
  idcat_punto_doble: suaje.idcat_punto_doble,
  metros: suaje.metros || null,
  idcat_matrix: suaje.idcat_matrix,
  tiempo_arreglo: suaje.tiempoArreglo ? parseInt(suaje.tiempoArreglo) : null,
  idcat_sacabocados: suaje.idcat_sacabocados,
  cantidad_sacabocado: suaje.cantidad_sacabocado
    ? parseInt(suaje.cantidad_sacabocado)
    : null,
  idcat_perforado: suaje.idcat_perforado,
  cantidad_perforado: suaje.cantidad_perforado
    ? parseInt(suaje.cantidad_perforado)
    : null,
  herramental_desbarbe: suaje.herramentalDesbarbe,
  no_desbarbe:
    suaje.herramentalDesbarbe && suaje.noDesbarbe.trim()
      ? suaje.noDesbarbe.trim()
      : null,
});

const mapAcabadosToApi = (acabados: Acabados) => ({
  idcat_tipo_pegado: acabados.idcat_tipo_pegado,
  idcat_pegamento: acabados.idcat_pegamento,
  // Campos propios del proceso "Pegado" de la ruta -- ver nota en Acabados.
  idcat_tipo_pegado_pegado: acabados.idcat_tipo_pegado_pegado,
  que_se_pega: acabados.queSePega?.trim() || null,
  laminados: acabados.laminados,
  // FK real hacia public.rollo_lam(idrollo_lam).
  idrollo_lam: acabados.idrollo_lam,
  // "Desarrollo para laminado" — número de captura libre, se manda
  // parseado como float igual que el resto de los campos numéricos.
  desarrollo_laminado: acabados.desarrolloLaminado?.trim()
    ? parseFloat(acabados.desarrolloLaminado.replace(",", "."))
    : null,
  asas: acabados.asas,
  idcat_refuerzo_material: acabados.idcat_refuerzo_material,
  idcat_refuerzo_medidas: acabados.idcat_refuerzo_medidas,
  idcat_base_material: acabados.idcat_base_material,
  base_medida: acabados.base_medida || null,
  idcat_empaque: acabados.idcat_empaque,
  pzs_caja: acabados.pzs_caja ? parseInt(acabados.pzs_caja) : null,
  lleva_uv: acabados.llevaUv,
  lleva_alto_relieve: acabados.llevaAltoRelieve,
  lleva_textura: acabados.llevaTextura,
  lleva_hot_stamping: acabados.llevaHotStamping,
});

const mapMaquinariaToApi = (maquinaria: Maquinaria) => ({
  hojeado_guillotina: maquinaria.hojeado_guillotina,
  impresora: maquinaria.impresora,
  hs_ar: maquinaria.hs_ar,
  alto_relieve_maquina: maquinaria.alto_relieve_maquina,
  suaje_maquina: maquinaria.suaje_maquina,
  uv: maquinaria.uv,
  laminado_maquina: maquinaria.laminado_maquina,
  texturizadora: maquinaria.texturizadora,
  empaque_maquina: maquinaria.empaque_maquina,
  empalme: maquinaria.empalme,
  armado: maquinaria.armado,
  asas_maquina: maquinaria.asas_maquina,
  desbarbe: maquinaria.desbarbe,
});

// client_key: identificador local (MaterialEntry.id) que viaja con cada
// material en esta petición — le permite a un proceso de un componente
// referenciarlo (proceso.materiales) aunque el material todavía no tenga
// iddetalle_material real (alta), y de forma consistente también en
// edición (materialClientKeyToId, en actualizarProductoPapel, indexa tanto
// por client_key como por el id real ya resuelto). Se manda siempre,
// incluso para productos normales, donde simplemente no se usa para nada.
const mapMaterialToApi = (material: MaterialEntry) => ({
  iddetalle_material: material.iddetalle_material ?? null,
  client_key: String(material.id),
  // A qué componente se asigna este material — null si el producto no es
  // especial o el material no se asignó a ningún componente (se guarda a
  // nivel producto, igual que hoy).
  componente_client_key:
    material.idComponenteAsignado != null
      ? String(material.idComponenteAsignado)
      : null,
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
  // NUEVO: medidas y método de preparación propios del material.
  ancho: material.ancho || null,
  fuelle: material.fuelle || null,
  altura: material.altura || null,
  medida: material.medida || null,
  metodo_preparacion: material.metodoPreparacion || null,
});

const mapComponenteProcesoToApi = (proceso: ComponenteProceso) => ({
  idcomponente_papel_proceso: proceso.idcomponente_papel_proceso ?? null,
  idproceso_cat: proceso.idproceso_cat,
  orden: proceso.orden,
  observaciones: proceso.observaciones || null,
  // Referencias por MaterialEntry.id, como string — el mismo valor que
  // client_key en el material correspondiente. El backend las resuelve con
  // materialClientKeyToId (ver upsertComponenteProcesos).
  materiales: proceso.materiales.map(String),
  veces: proceso.veces ?? 1,
});

const mapComponenteToApi = (comp: ComponentePapel) => ({
  idcomponente_papel: comp.idcomponente_papel ?? null,
  // Igual que en materiales: identificador local para que el backend pueda
  // resolver, dentro de esta misma petición, qué materiales y qué procesos
  // pertenecen a este componente aunque todavía no tenga id real.
  client_key: String(comp.id),
  tipo: comp.tipo,
  orden: comp.orden,
  nombre: comp.nombre || null,
  es_union: comp.esUnion,
  // 🔁 FASE 4: a qué componente de nivel superior alimenta este (otra
  // 'complementaria' o la 'union' raíz). Se manda SIEMPRE por client_key,
  // nunca por id real -- upsertComponentesShell en el backend resuelve
  // padre_client_key contra el mapa client_key→id que arma en su Paso 1
  // para TODOS los componentes de la petición (nuevos y ya existentes por
  // igual), así que no hace falta distinguir aquí entre padre nuevo o
  // preexistente. null en 'union'/'unica' (ver ComponentePapel.idComponentePadre).
  padre_client_key: comp.idComponentePadre != null ? String(comp.idComponentePadre) : null,
  procesos: comp.procesos.map(mapComponenteProcesoToApi),
  suaje: mapSuajeToApi(comp.suaje),
  acabados: mapAcabadosToApi(comp.acabados),
  maquinaria: mapMaquinariaToApi(comp.maquinaria),
});

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
    // Se reenvía el id existente (si lo hay) para que el backend actualice
    // el grupo/material en lugar de borrarlo y crear uno nuevo — así los
    // pedidos ya hechos, que guardan una referencia fija a este id, no se
    // quedan huérfanos cada vez que se edita el producto.
    idgrupo_papel: grupo.idgrupo_papel ?? null,
    precio_sugerido: grupo.precioSugerido
      ? parseFloat(grupo.precioSugerido)
      : null,
    materiales: grupo.materiales.map(mapMaterialToApi),
  })),
  suaje: mapSuajeToApi(form.suaje),
  acabados: mapAcabadosToApi(form.acabados),
  maquinaria: mapMaquinariaToApi(form.maquinaria),

  // NUEVO (Fase 2/3): productos especiales. Con esEspecial = false (caso
  // normal, default) componentes viaja vacío y el backend se comporta
  // exactamente igual que antes de Fase 2.
  //
  // Los ?? existen por los borradores: un formulario guardado en
  // localStorage ANTES de que existieran estos dos campos se restaura sin
  // ellos, y sin la guarda `form.componentes.map` truena al guardar. Pasa
  // en el alta normal igual que en la de especiales, así que se protege
  // aquí, en el único punto por el que pasan los dos.
  es_especial: form.esEspecial ?? false,
  componentes: (form.componentes ?? []).map(mapComponenteToApi),
});