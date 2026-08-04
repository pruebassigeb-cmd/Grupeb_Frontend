// src/services/cotizadorLibre/cotizadorLibreCatalogo.service.ts
import api from "../api";
import type {
  CategoriaCotizadorLibre,
  TipoCatalogoItem,
  MedidaPapelItem,
  MedidaPlasticoItem,
  DetalleProductoPapelResponse,
  DetalleProductoPlasticoResponse,
} from "../../types/cotizadorLibre/cotizadorLibre.types";

export const getTiposCotizadorLibre = async (
  categoria: CategoriaCotizadorLibre
): Promise<TipoCatalogoItem[]> => {
  const { data } = await api.get<TipoCatalogoItem[]>(
    "/cotizador-libre/catalogo/tipos",
    { params: { categoria } }
  );
  return data;
};

export const getMedidasPapelCotizadorLibre = async (
  idTipo: number
): Promise<MedidaPapelItem[]> => {
  const { data } = await api.get<MedidaPapelItem[]>(
    "/cotizador-libre/catalogo/medidas",
    { params: { categoria: "papel", idTipo } }
  );
  return data;
};

export const getMedidasPlasticoCotizadorLibre = async (
  idTipo: number
): Promise<MedidaPlasticoItem[]> => {
  const { data } = await api.get<MedidaPlasticoItem[]>(
    "/cotizador-libre/catalogo/medidas",
    { params: { categoria: "plastico", idTipo } }
  );
  return data;
};

export const getDetalleProductoPapelCotizadorLibre = async (
  idproductoPapel: number
): Promise<DetalleProductoPapelResponse> => {
  const { data } = await api.get<DetalleProductoPapelResponse>(
    `/cotizador-libre/catalogo/papel/producto/${idproductoPapel}`
  );
  return data;
};

export const getDetalleProductoPlasticoCotizadorLibre = async (
  idconfiguracionPlastico: number
): Promise<DetalleProductoPlasticoResponse> => {
  const { data } = await api.get<DetalleProductoPlasticoResponse>(
    `/cotizador-libre/catalogo/plastico/producto/${idconfiguracionPlastico}`
  );
  return data;
};