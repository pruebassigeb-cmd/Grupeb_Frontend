// src/types/formulario-solicitud.types.ts
import type { MedidaKey } from "./productos-plastico.types";

export interface Producto {
  productoId?: number;
  nombre: string;
  cantidades: [number, number, number];
  kilogramos: [number, number, number];
  precios: [number, number, number];
  calibre: string;
  tintas: number;
  tintasId: number;
  caras: number;
  carasId: number;
  material: string;
  medidas: Record<MedidaKey, string>;
  medidasFormateadas: string;
  porKilo?: string;
  idsuaje?: number | null;
  suajeTipo?: string | null;
  colorAsaId?: number | null;
  colorAsaNombre?: string | null;
  idMedidaTroquel?: number | null;
  medidaTroquelTexto?: string | null;
  observacion?: string;
  descripcion?: string | null; 
  perforacion?: boolean;
  pantones?: string | null;
  pigmentos?: string | null;
  modoCantidad: "unidad" | "kilo";
  herramental_descripcion?: string | null;
  herramental_precio?: number | null;
}

export interface DatosCotizacion {
  clienteId?: number;
  identificar?: string | null;
  cliente: string;
  telefono: string;
  correo: string;
  empresa: string;
  impresion?: string | null;
  celular?: string | null;
  razon_social?: string | null;
  rfc?: string | null;
  domicilio?: string | null;
  numero?: string | null;
  colonia?: string | null;
  codigo_postal?: string | null;
  poblacion?: string | null;
  estado_cliente?: string | null;
  envio_domicilio?: string | null;
  envio_numero?: string | null;
  envio_colonia?: string | null;
  envio_codigo_postal?: string | null;
  envio_poblacion?: string | null;
  envio_estado?: string | null;
  envio_referencia?: string | null;
  productos: Producto[];
  observaciones: string;
  perforacion?: boolean;
  tipo?: "cotizacion" | "pedido";
  prioridad?: boolean;
  sin_iva?: boolean;
}

export interface FormularioCotizacionProps {
  onSubmit: (datos: DatosCotizacion) => void;
  onCancel: () => void;
  catalogos: {
    tiposProducto: any[];
    materiales: any[];
    calibres: any[];
  };
  modo?: "cotizacion" | "pedido";
}

export type OpcionCP = {
  colonia: string;
  poblacion: string;
  estado: string;
};