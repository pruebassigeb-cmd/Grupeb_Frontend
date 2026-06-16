// src/services/papel/papelCotizacionService.ts
// ─────────────────────────────────────────────────────────────────────────
// Centraliza las llamadas que el formulario de papel hacía inline.
// (Si usas la instancia axios `api.ts`, puedes cambiar los fetch por ella.)
// ─────────────────────────────────────────────────────────────────────────
import type {
  ProductoPapelBusqueda,
  ProductoPapelDetalle,
  OpcionesProductoPapel,
  GrupoOpcion,
  AsaOpcion,
  LaminadoOpcion,
  FoilOpcion,
  TexturaOpcion,
} from "../../types/papel/cotizacion-papel.types";

const BASE = import.meta.env.VITE_API_URL;
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

export async function getProductosPapel(query = ""): Promise<ProductoPapelBusqueda[]> {
  const res = await fetch(`${BASE}/productos-papel`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al cargar productos de papel");
  const data: ProductoPapelBusqueda[] = await res.json();

  const q = query.trim().toLowerCase();
  if (!q) return data;
  return data.filter(p =>
    (p.tipo_producto ?? "").toLowerCase().includes(q) ||
    (p.medida ?? "").toLowerCase().includes(q) ||
    (p.descripcion_papel ?? "").toLowerCase().includes(q) ||
    (p.primer_tipo_papel ?? "").toLowerCase().includes(q)
  );
}

export async function getProductoPapelDetalle(id: number): Promise<ProductoPapelDetalle> {
  const res = await fetch(`${BASE}/productos-papel/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al cargar el detalle del producto");
  return res.json();
}

export function mapearOpciones(det: ProductoPapelDetalle): OpcionesProductoPapel {
  const grupos: GrupoOpcion[] = (det.grupos ?? []).map(g => ({
    idgrupo_papel: g.idgrupo_papel,
    precio_sugerido: g.precio_sugerido != null ? parseFloat(String(g.precio_sugerido)) : null,
    etiqueta:
      (g.materiales ?? [])
        .map(m => [m.tipo_papel, m.calibre].filter(Boolean).join(" "))
        .filter(Boolean)
        .join(" + ") || `Opción ${g.orden ?? ""}`,
  }));

  const asas: AsaOpcion[] = (det.acabados?.asas ?? []).map(a => ({
    idcat_tipo_asa: a.idcat_tipo_asa,
    nombre: a.tipo_asa,
  }));

  const laminados: LaminadoOpcion[] = (det.acabados?.laminados ?? []).map(l => ({
    idcat_laminado: l.id,
    nombre: l.nombre,
  }));

  return { grupos, asas, laminados };
}

export async function getOpcionesProductoPapel(id: number): Promise<OpcionesProductoPapel> {
  return mapearOpciones(await getProductoPapelDetalle(id));
}

export async function getFoils(): Promise<FoilOpcion[]> {
  const res = await fetch(`${BASE}/foil`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al cargar foils");
  return res.json();
}

export async function getTexturas(): Promise<TexturaOpcion[]> {
  const res = await fetch(`${BASE}/cat-textura`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al cargar texturas");
  return res.json();
}