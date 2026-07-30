import type { DatosProducto, CatalogoMaterial } from "../../types/plastico/productos-plastico.types";

/**
 * Calcula las bolsas por kilo de un producto plástico (fórmula general).
 *
 * Fórmula:
 *   1000 / (((sumaVertical / 100) * (sumaHorizontal / 100) * calibre) * factorMaterial)
 *
 * Donde:
 *   sumaVertical   = altura + fuelleFondo + refuerzo
 *   sumaHorizontal = ancho + fuelleLateral1 + fuelleLateral2
 *   factorMaterial = material.valor (viene de la BD)
 *
 * @returns El resultado como número, o null si faltan datos para calcular.
 */
export function calcularPorKilo(
  datos: DatosProducto,
  materiales: CatalogoMaterial[]
): number | null {
  if (
    !datos.tipoProducto ||
    !datos.calibre ||
    !datos.material ||
    !datos.materialId
  ) {
    return null;
  }

  const altura      = parseFloat(datos.medidas.altura)         || 0;
  const ancho       = parseFloat(datos.medidas.ancho)          || 0;
  const fuelleFondo = parseFloat(datos.medidas.fuelleFondo)    || 0;
  const refuerzo    = parseFloat(datos.medidas.refuerzo)       || 0;
  const fuelleLat1  = parseFloat(datos.medidas.fuelleLateral1) || 0;
  const fuelleLat2  = parseFloat(datos.medidas.fuelleLateral2) || 0;
  const calibreNum  = parseFloat(datos.calibre)                || 0;

  if (altura === 0 || ancho === 0 || calibreNum === 0) {
    return null;
  }

  const materialSeleccionado = materiales.find((m) => m.id === datos.materialId);
  if (!materialSeleccionado) return null;

  const factor = parseFloat(materialSeleccionado.valor);
  if (!factor || factor === 0) return null;

  const sumaVertical   = altura + fuelleFondo + refuerzo;
  const sumaHorizontal = ancho + fuelleLat1 + fuelleLat2;

  const resultado =
    1000 / (((sumaVertical / 100) * (sumaHorizontal / 100) * calibreNum) * factor);

  return resultado;
}

/**
 * Igual que calcularPorKilo pero retorna string formateado con N decimales,
 * o cadena vacía si no se puede calcular.
 */
export function calcularPorKiloStr(
  datos: DatosProducto,
  materiales: CatalogoMaterial[],
  decimales = 3
): string {
  const resultado = calcularPorKilo(datos, materiales);
  if (resultado === null) return "";
  return resultado.toFixed(decimales);
}

// ============================================================
// FÓRMULA EXCLUSIVA: Bolsa Celofán + Material BOPP
// ============================================================

/**
 * Calcula el peso por bolsa y bolsas por kilo para Bolsa Celofán con material BOPP.
 *
 * Fórmula:
 *   areaBase      = (altura + fuelleFondo) * ancho * 2
 *   pesoBase      = areaBase / 10000
 *   pesoPorBolsa  = pesoBase * gramos        (gramos viene del calibre BOPP en la BD)
 *   bolsasPorKilo = 1000 / pesoPorBolsa
 *
 * Ejemplo con altura=26, fuelleFondo=4, ancho=18, calibre=30 (28g):
 *   areaBase      = (26 + 4) * 18 * 2 = 1080
 *   pesoBase      = 1080 / 10000       = 0.108
 *   pesoPorBolsa  = 0.108 * 28         = 3.024
 *   bolsasPorKilo = 1000 / 3.024       = 330.69
 *
 * @param datos  - Datos del producto con las medidas capturadas
 * @param gramos - Gramos del calibre BOPP seleccionado (viene de la BD)
 * @returns { pesoPorBolsa, bolsasPorKilo } o null si faltan datos
 */
export function calcularCelofanBopp(
  datos: DatosProducto,
  gramos: number
): { pesoPorBolsa: number; bolsasPorKilo: number } | null {
  const altura      = parseFloat(datos.medidas.altura)      || 0;
  const ancho       = parseFloat(datos.medidas.ancho)       || 0;
  const fuelleFondo = parseFloat(datos.medidas.fuelleFondo) || 0;

  if (altura === 0 || ancho === 0 || gramos === 0) return null;

  const areaBase      = (altura + fuelleFondo) * ancho * 2;
  const pesoBase      = areaBase / 10000;
  const pesoPorBolsa  = pesoBase * gramos;
  const bolsasPorKilo = 1000 / pesoPorBolsa;

  return {
    pesoPorBolsa:  parseFloat(pesoPorBolsa.toFixed(4)),
    bolsasPorKilo: parseFloat(bolsasPorKilo.toFixed(3)),
  };
}