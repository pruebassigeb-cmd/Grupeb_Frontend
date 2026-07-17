// src/utils/papel/preciosAcabadosPapel.utils.ts

export const formatearCantidad = (cantidad: number): string =>
  Number(cantidad).toLocaleString("es-MX");

export const normalizarPrecioInput = (value: string): number | null => {
  const limpio = value.trim().replace(/[^0-9.]/g, "");
  if (!limpio) return null;

  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
};

export const formatearPrecioInput = (value: number | null): string =>
  value === null || value === undefined ? "" : String(value);
