import api from "./api";

export interface Suaje {
  idsuaje:       number;
  tipo:          string;
  idproductos:   number;
  tipo_producto: string;
}

export interface ColorAsa {
  id_color: number;
  color:    string;
}

export const getSuajes = async (): Promise<Suaje[]> => {
  const response = await api.get("/suajes");
  return response.data;
};

export const getColoresAsa = async (): Promise<ColorAsa[]> => {
  const response = await api.get("/cotizaciones/colores-asa");
  return response.data;
};