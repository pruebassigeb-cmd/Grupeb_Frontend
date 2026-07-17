export type ValorMedida = string | number | null | undefined;

export interface MedidasPlasticoFormato {
  altura: ValorMedida;
  ancho: ValorMedida;
  fuelleFondo?: ValorMedida;
  fuelleLateral1?: ValorMedida;
  fuelleLateral2?: ValorMedida;
  refuerzo?: ValorMedida;
}

const limpiarValor = (valor: ValorMedida): string => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const incluirValor = (valor: string): boolean =>
  valor !== "" && Number(valor) !== 0;

export const construirMedidaPapel = (
  ancho: ValorMedida,
  fuelle: ValorMedida,
  altura: ValorMedida
): string => {
  const a = limpiarValor(ancho);
  const f = limpiarValor(fuelle);
  const h = limpiarValor(altura);

  if (!a && !h) return "";

  return incluirValor(f)
    ? `${a}+${f}x${h}`
    : `${a}x${h}`;
};

export const construirMedidaPlastico = (
  medidas: MedidasPlasticoFormato
): string => {
  const verticales = [
    limpiarValor(medidas.altura),
    limpiarValor(medidas.fuelleFondo),
    limpiarValor(medidas.refuerzo),
  ].filter(incluirValor);

  const horizontales = [
    limpiarValor(medidas.ancho),
    limpiarValor(medidas.fuelleLateral1),
    limpiarValor(medidas.fuelleLateral2),
  ].filter(incluirValor);

  if (!verticales.length && !horizontales.length) return "";
  if (!horizontales.length) return verticales.join("+");
  if (!verticales.length) return horizontales.join("+");

  return `${verticales.join("+")}x${horizontales.join("+")}`;
};