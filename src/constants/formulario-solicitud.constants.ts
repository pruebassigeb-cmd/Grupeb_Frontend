// src/constants/formulario-solicitud.constants.ts
import type { CreateClienteRequest } from "../types/clientes.types";

export const MONEDAS = [
  { codigo: "MXN", nombre: "Peso mexicano (MXN)" },
  { codigo: "USD", nombre: "Dólar estadounidense (USD)" },
  { codigo: "EUR", nombre: "Euro (EUR)" },
  { codigo: "JPY", nombre: "Yen japonés (JPY)" },
  { codigo: "GBP", nombre: "Libra esterlina (GBP)" },
  { codigo: "CNY", nombre: "Yuan chino (CNY)" },
  { codigo: "CAD", nombre: "Dólar canadiense (CAD)" },
  { codigo: "CHF", nombre: "Franco suizo (CHF)" },
  { codigo: "AUD", nombre: "Dólar australiano (AUD)" },
  { codigo: "INR", nombre: "Rupia india (INR)" },
];

export const clienteVacio: CreateClienteRequest = {
  empresa: "",
  correo: "",
  telefono: "",
  atencion: "",
  razon_social: "",
  impresion: "",
  celular: "",
  regimen_fiscal_idregimen_fiscal: 0,
  metodo_pago_idmetodo_pago: 0,
  forma_pago_idforma_pago: 0,
  rfc: "",
  correo_facturacion: "",
  uso_cfdi: "",
  moneda: "MXN",
  domicilio: "",
  numero: "",
  colonia: "",
  codigo_postal: "",
  poblacion: "",
  estado: "",
  envio_domicilio: "",
  envio_numero: "",
  envio_colonia: "",
  envio_codigo_postal: "",
  envio_poblacion: "",
  envio_estado: "",
  envio_referencia: "",
};

export const ESTADO_INICIAL_PRODUCTO_MEDIDAS = {
  altura: "",
  ancho: "",
  fuelleFondo: "",
  fuelleLateral1: "",
  fuelleLateral2: "",
  refuerzo: "",
};