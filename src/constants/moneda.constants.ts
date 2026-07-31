// src/constants/moneda.constants.ts
//
// Monedas operativas soportadas en cotización/pedido/anticipo-liquidación/
// estados de cuenta. Distinto de MONEDAS en formulario-solicitud.constants.ts,
// que es la lista de 10 monedas del perfil de facturación del cliente (un
// feature separado que no se toca).
import type { Moneda } from "../utils/formatMoney";

export const MONEDAS_OPERACION: { value: Moneda; label: string }[] = [
  { value: "MXN", label: "Pesos mexicanos (MXN)" },
  { value: "USD", label: "Dólares americanos (USD)" },
];

export const MONEDA_DEFAULT: Moneda = "MXN";
