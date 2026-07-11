export interface FoilProveedorInfo {
  idfoil_proveedor: number;
  idproveedor: number;
  proveedor_nombre: string;
  codigo: string | null;
  precio: number | null;
  notas: string | null;
  minimo_compra: number | null;
  unidad: string | null;
}

export interface FoilPresentacion {
  idfoil_presentacion?: number;
  presentacion: string;
}

export interface Foil {
  idfoil: number;
  colorfoil: string;
  codigofoil: string | null;
  clavefoil: string | null;
  activo: boolean;
  created_at: string;
  // ✅ NUEVO — Clave producto SAT
  producto_sat_idproducto_sat: number | null;
  producto_sat_clave?: number | null;
  producto_sat_nombre?: string | null;
  presentaciones: FoilPresentacion[];
  proveedores: FoilProveedorInfo[];
}

export interface FoilForm {
  colorfoil: string;
  codigofoil: string;
  precio: string;
  notas: string;
  minimo_compra: string;
  unidad: string | null;
  // ✅ NUEVO — Clave producto SAT
  producto_sat_idproducto_sat: number | null;
  proveedores_ids: number[];
  presentaciones: string[];
}

export const newFoilForm = (): FoilForm => ({
  colorfoil: "",
  codigofoil: "",
  precio: "",
  notas: "",
  minimo_compra: "",
  unidad: null,
  producto_sat_idproducto_sat: null,
  proveedores_ids: [],
  presentaciones: [],
});