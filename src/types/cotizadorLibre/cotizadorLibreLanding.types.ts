// src/types/cotizadorLibre/cotizadorLibreLanding.types.ts

export const SECCIONES_LANDING_COTIZADOR_LIBRE = [
  "lineas",
  "bolsas_plastico",
  "cajas",
  "papel",
  "etiquetas",
  "liston",
  "proyectos_especiales",
] as const;

export type SeccionLandingCotizadorLibre = typeof SECCIONES_LANDING_COTIZADOR_LIBRE[number];

// Metadatos de presentación de cada sección (label visible + emoji del
// icono en la franja inferior). Puramente de UI — no vive en la BD, así que
// si agregas una sección nueva en el backend, agrégala aquí también.
export const SECCIONES_LANDING_META: Record<
  SeccionLandingCotizadorLibre,
  { label: string; icono: string }
> = {
  lineas:               { label: "Líneas de producto",         icono: "🎁" },
  bolsas_plastico:      { label: "Bolsas de plástico",         icono: "🛍️" },
  cajas:                { label: "Cajas",                      icono: "📦" },
  papel:                { label: "Papel y envoltura",          icono: "📜" },
  etiquetas:            { label: "Etiquetas y complementos",   icono: "🏷️" },
  liston:               { label: "Listones impresos",          icono: "🎀" },
  proyectos_especiales: { label: "Proyectos especiales",       icono: "⭐" },
};

export interface LandingSlotItem {
  id: number;
  seccion: SeccionLandingCotizadorLibre;
  titulo: string;
  orden: number;
  idArchivo: number | null;
  imagenUrl: string | null;
}