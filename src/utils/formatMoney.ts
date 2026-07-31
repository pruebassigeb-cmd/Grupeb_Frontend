// src/utils/formatMoney.ts
//
// Formateador único de dinero para toda la app (UI y PDFs). Reemplaza las
// implementaciones sueltas que existían por archivo (AnticipoLiquidacion,
// EstadoCuenta, generarPdfEstadoCuenta*, Pdfutils, Papel, etc.), todas con
// el mismo patrón es-MX de 2 decimales pero sin distinguir moneda.

export type Moneda = "MXN" | "USD";

const SIMBOLO: Record<Moneda, string> = {
  MXN: "$",
  USD: "US$",
};

export function formatMoney(
  amount: number | string | null | undefined,
  moneda: Moneda = "MXN",
): string {
  const n = Number(amount ?? 0);
  const valor = Number.isFinite(n) ? n : 0;
  const formateado = valor.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${SIMBOLO[moneda]}${formateado}`;
}
