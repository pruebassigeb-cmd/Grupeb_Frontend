export interface Foil {
  idfoil: number;
  colorfoil: string;
  codigofoil: string | null;
  clavefoil: string | null;
  precio: number | null;
  notas: string | null;
  minimo_compra: number | null;
  unidad: string | null;
  activo: boolean;
  created_at: string;
  idproveedor_producto: number;
  proveedor_nombre?: string;
  idproveedor?: number;
  presentaciones: FoilPresentacion[];
}

export interface FoilPresentacion {
  idfoil_presentacion?: number;
  presentacion: string;
}

export interface FoilForm {
  colorfoil: string;
  codigofoil: string;
  precio: string;
  notas: string;
  minimo_compra: string;
  unidad: string;
  proveedor_idproveedor: number | null;
  presentaciones: string[];
}

export const newFoilForm = (): FoilForm => ({
  colorfoil: "",
  codigofoil: "",
  precio: "",
  notas: "",
  minimo_compra: "",
  unidad: "",
  proveedor_idproveedor: null,
  presentaciones: [],
});