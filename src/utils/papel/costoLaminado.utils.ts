// src/utils/papel/costoLaminado.utils.ts

const numeroPositivoONull = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;

  const normalizado =
    typeof valor === "string"
      ? valor.replace(",", ".").trim()
      : valor;

  const numero = Number(normalizado);

  return Number.isFinite(numero) && numero > 0
    ? numero
    : null;
};

const numeroNoNegativoONull = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;

  const normalizado =
    typeof valor === "string"
      ? valor.replace(",", ".").trim()
      : valor;

  const numero = Number(normalizado);

  return Number.isFinite(numero) && numero >= 0
    ? numero
    : null;
};

const redondearCuatroDecimales = (valor: number): number =>
  Math.round((valor + Number.EPSILON) * 10_000) / 10_000;

const normalizarTamano = (valor: unknown): string => {
  if (valor === null || valor === undefined) return "";

  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]/g, "");
};

const esTamanoGrandeOExtraGrande = (valor: unknown): boolean => {
  const tamano = normalizarTamano(valor);

  return tamano === "grande" || tamano === "extragrande";
};

const esMediaPiezaSuaje = (valor: unknown): boolean => {
  const piezas = numeroPositivoONull(valor);

  if (piezas === null) return false;

  // Reconoce 0.5, 0.50, 0.500, ".5", etc.
  return Math.abs(piezas - 0.5) < 0.000000001;
};

export interface CalcularCostoLaminadoParams {
  rolloCentimetros: unknown;
  desarrolloCentimetros: unknown;
  costoMetro: unknown;

  /**
   * El costo normal se multiplica por dos únicamente cuando:
   *
   * 1. El tamaño es Grande o Extra Grande.
   * 2. Las piezas del suaje equivalen a 0.5.
   */
  tamanoProducto?: unknown;
  piezasSuaje?: unknown;

  /**
   * Se conserva temporalmente para que el formulario actual
   * continúe compilando, pero ya no interviene en la fórmula.
   */
  rendimientoGrupo?: unknown;
}

/**
 * Fórmula normal:
 *
 * (ancho del rollo en cm / 100)
 * × (desarrollo en cm / 100)
 * × costo por m²
 *
 * Regla especial:
 *
 * Si el tamaño es Grande o Extra Grande
 * y las piezas del suaje equivalen a 0.5:
 *
 * costo normal × 2
 */
export const calcularCostoLaminado = ({
  rolloCentimetros,
  desarrolloCentimetros,
  costoMetro,
  tamanoProducto,
  piezasSuaje,
}: CalcularCostoLaminadoParams): number | null => {
  const rolloCm = numeroPositivoONull(rolloCentimetros);
  const desarrolloCm = numeroPositivoONull(desarrolloCentimetros);
  const costo = numeroNoNegativoONull(costoMetro);

  if (
    rolloCm === null ||
    desarrolloCm === null ||
    costo === null
  ) {
    return null;
  }

  const costoLaminadoNormal =
    (rolloCm / 100) *
    (desarrolloCm / 100) *
    costo;

  const debeDuplicarCosto =
    esTamanoGrandeOExtraGrande(tamanoProducto) &&
    esMediaPiezaSuaje(piezasSuaje);

  const costoLaminadoFinal = debeDuplicarCosto
    ? costoLaminadoNormal * 2
    : costoLaminadoNormal;

  return redondearCuatroDecimales(costoLaminadoFinal);
};

export const formatearCostoLaminado = (
  costo: number | null | undefined
): string => {
  if (
    costo === null ||
    costo === undefined ||
    !Number.isFinite(costo)
  ) {
    return "";
  }

  return costo.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
};