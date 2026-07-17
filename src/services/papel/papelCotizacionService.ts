// src/services/papel/papelCotizacionService.ts
import api from "../api";
import type {
  ProductoPapelBusqueda,
  GrupoOpcion,
  AsaOpcion,
  LaminadoOpcion,
  FoilOpcion,
  TexturaOpcion,
  ColorAsaOpcion,
  MaquinariaProducto,
} from "../../types/papel/cotizacion-papel.types";

export interface ProductoPapelDetalleCotizacion {
  idproducto_papel: number;
  tamano_asa_default?: string | null;
  grupos: any[];
  acabados: any | null;
  maquinaria: MaquinariaProducto;
}

export const getProductosPapel = async (
  busqueda = ""
): Promise<ProductoPapelBusqueda[]> => {
  const { data } = await api.get("/productos-papel", {
    params: busqueda ? { q: busqueda } : undefined,
  });
  return Array.isArray(data) ? data : [];
};

export const getProductoPapelDetalle = async (
  idproductoPapel: number
): Promise<ProductoPapelDetalleCotizacion> => {
  const { data } = await api.get(`/productos-papel/${idproductoPapel}`);
  return {
    ...data,
    maquinaria: data.maquinaria ?? {},
  };
};

export const getOpcionesProductoPapel = async (idproductoPapel: number) => {
  const detalle = await getProductoPapelDetalle(idproductoPapel);
  return mapearOpciones(detalle);
};

export const mapearOpciones = (detalle: any): {
  grupos: GrupoOpcion[];
  asas: AsaOpcion[];
  laminados: LaminadoOpcion[];
} => {
  const grupos: GrupoOpcion[] = (detalle.grupos ?? []).map((grupo: any) => {
    const etiqueta = (grupo.materiales ?? [])
      .map((material: any) =>
        [material.tipo_papel, material.calibre].filter(Boolean).join(" ")
      )
      .filter(Boolean)
      .join(" + ");

    return {
      idgrupo_papel: Number(grupo.idgrupo_papel),
      etiqueta: etiqueta || `Grupo ${grupo.orden ?? ""}`.trim(),
      precio_sugerido:
        grupo.precio_sugerido != null
          ? Number(grupo.precio_sugerido)
          : null,
    };
  });

  const asas: AsaOpcion[] = (detalle.acabados?.asas ?? []).map((asa: any) => ({
    idcat_tipo_asa: Number(asa.idcat_tipo_asa ?? asa.id),
    nombre: asa.tipo_asa ?? asa.nombre,
  }));

  const laminados: LaminadoOpcion[] = (
    detalle.acabados?.laminados ?? []
  ).map((laminado: any) => ({
    idcat_laminado: Number(laminado.idcat_laminado ?? laminado.id),
    nombre: laminado.nombre,
  }));

  return { grupos, asas, laminados };
};

export const getFoils = async (): Promise<FoilOpcion[]> => {
  const { data } = await api.get("/foil");
  return Array.isArray(data) ? data : [];
};

export const getTexturas = async (): Promise<TexturaOpcion[]> => {
  const { data } = await api.get("/catalogos-papel");
  return (data.textura ?? []).map((item: any) => ({
    idcat_textura: Number(item.idcat_textura ?? item.id),
    nombre: item.nombre,
  }));
};

export const getColoresAsa = async (): Promise<ColorAsaOpcion[]> => {
  try {
    const { data } = await api.get("/cotizaciones/colores-asa");
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    if (error?.response?.status && error.response.status !== 404) throw error;
    const { data } = await api.get("/colores-asa");
    return Array.isArray(data) ? data : [];
  }
};

// ═══════════════════════════════════════════════════════════
// NUEVO — Catálogo real de tintas (tabla `tintas`), compartido por
// plástico y papel. Reemplaza el string libre "2x3" que usaba Expo por
// IDs reales, igual que ya hace FormularioProductoPapel.
// ═══════════════════════════════════════════════════════════
export interface TintaOpcion {
  id: number;
  cantidad: number;
}

export const getTintas = async (): Promise<TintaOpcion[]> => {
  const { data } = await api.get("/tintas");
  return Array.isArray(data)
    ? data.map((t: any) => ({
        id: Number(t.idtintas ?? t.id),
        cantidad: Number(t.cantidad),
      }))
    : [];
};