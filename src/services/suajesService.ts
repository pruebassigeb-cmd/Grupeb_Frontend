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

export interface MedidaTroquel {
  id_medidatro: number;
  medida:       string;
}

export const getSuajes = async (): Promise<Suaje[]> => {
  const response = await api.get("/suajes");
  return response.data;
};

export const getColoresAsa = async (): Promise<ColorAsa[]> => {
  const response = await api.get("/cotizaciones/colores-asa");
  return response.data;
};

export const getMedidasTroquel = async (): Promise<MedidaTroquel[]> => {
  const response = await api.get("/cotizaciones/medidas-troquel");
  return response.data;
};

// ✅ NUEVO — Cinta de seguridad: tipo de bolsa de envío, se elige igual que
// suaje/troquel. Reutiliza el mismo endpoint admin (solo requiere sesión
// para leer, igual que /troqueles y /asa-suaje).
export interface CintaSeguridad {
  id: number;
  nombre: string;
  medida: string | null;
}

export const getCintaSeguridad = async (): Promise<CintaSeguridad[]> => {
  const response = await api.get("/catalogos-productos/plastico/admin/cinta-seguridad", {
    params: { activo: "true" },
  });
  return response.data;
};