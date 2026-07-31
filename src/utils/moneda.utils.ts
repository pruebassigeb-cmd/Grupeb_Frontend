// src/utils/moneda.utils.ts
//
// Espejo del mismo archivo en el backend (GrupEB_Backend/src/utils/moneda.utils.ts).
// Convención fija en toda la app: tipoCambio = pesos MXN por 1 USD (ej. 18.50).
// USD = MXN / tipoCambio. MXN = USD * tipoCambio.
import type { Moneda } from "./formatMoney";

export function convertirMonto(
  monto: number,
  tipoCambio: number,
  direccion: "MXN_A_USD" | "USD_A_MXN",
): number {
  if (!tipoCambio || tipoCambio <= 0) {
    throw new Error("tipoCambio debe ser un número mayor a 0 para convertir");
  }
  const resultado =
    direccion === "MXN_A_USD" ? monto / tipoCambio : monto * tipoCambio;
  return Number(resultado.toFixed(2));
}

// Convierte un monto en MXN (como lo calculan siempre los motores de precio
// del backend) a la moneda del documento. Si la moneda es MXN, regresa el
// monto sin tocar. Si es USD pero todavía no hay tipoCambio capturado,
// regresa null — quien llama decide qué mostrar mientras tanto.
export function convertirDesdeMXN(
  montoMXN: number,
  moneda: Moneda,
  tipoCambio: number | null | undefined,
): number | null {
  if (moneda === "MXN") return Number(montoMXN.toFixed(2));
  if (!tipoCambio || tipoCambio <= 0) return null;
  return convertirMonto(montoMXN, tipoCambio, "MXN_A_USD");
}

// Convierte `monto` de la moneda `desde` a la moneda `hacia`. Si son la
// misma moneda regresa el monto sin tocar (no exige tipoCambio en ese caso).
// Usado para pagos registrados en la moneda contraria a la de la venta.
export function convertirEntreMonedas(
  monto: number,
  desde: Moneda,
  hacia: Moneda,
  tipoCambio: number | null | undefined,
): number | null {
  if (desde === hacia) return Number(monto.toFixed(2));
  if (!tipoCambio || tipoCambio <= 0) return null;
  return convertirMonto(monto, tipoCambio, desde === "MXN" ? "MXN_A_USD" : "USD_A_MXN");
}
