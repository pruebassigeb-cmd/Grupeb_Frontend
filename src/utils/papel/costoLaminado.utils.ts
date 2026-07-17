// src/utils/papel/costoLaminado.utils.ts

const numeroPositivoONull = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;

  const normalizado =
    typeof valor === "string" ? valor.replace(",", ".").trim() : valor;

  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
};

const numeroNoNegativoONull = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;

  const normalizado =
    typeof valor === "string" ? valor.replace(",", ".").trim() : valor;

  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
};

export interface CalcularCostoLaminadoParams {
  rolloCentimetros: unknown;
  desarrolloCentimetros: unknown;
  costoMetro: unknown;
}

/**
 * Fórmula:
 * (ancho del rollo en cm / 100)
 * × (desarrollo en cm / 100)
 * × costo por m².
 */
export const calcularCostoLaminado = ({
  rolloCentimetros,
  desarrolloCentimetros,
  costoMetro,
}: CalcularCostoLaminadoParams): number | null => {
  const rolloCm = numeroPositivoONull(rolloCentimetros);
  const desarrolloCm = numeroPositivoONull(desarrolloCentimetros);
  const costo = numeroNoNegativoONull(costoMetro);

  if (rolloCm === null || desarrolloCm === null || costo === null) {
    return null;
  }

  const resultado = (rolloCm / 100) * (desarrolloCm / 100) * costo;
  return Math.round((resultado + Number.EPSILON) * 10_000) / 10_000;
};

export const formatearCostoLaminado = (
  costo: number | null | undefined
): string => {
  if (costo === null || costo === undefined || !Number.isFinite(costo)) {
    return "";
  }

  return costo.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
};
