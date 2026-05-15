// src/utils/calcularDesdeInput.ts

export function calcularDesdeInput(
  texto: [string, string, string],
  modo: "unidad" | "kilo",
  porKilo: string | undefined
): { bolsas: [number, number, number]; kgs: [number, number, number] } {
  const porKiloNum = porKilo ? Number(porKilo) : 0;

  const bolsas = texto.map((v) => {
    const n = v === "" ? 0 : Number(v);
    if (n <= 0) return 0;
    if (modo === "kilo" && porKiloNum > 0) return Math.round(n * porKiloNum);
    return n;
  }) as [number, number, number];

  const kgs = texto.map((v) => {
    const n = v === "" ? 0 : Number(v);
    if (n <= 0) return 0;
    if (modo === "kilo") return n;
    if (porKiloNum > 0) return Number((n / porKiloNum).toFixed(4));
    return 0;
  }) as [number, number, number];

  return { bolsas, kgs };
}

export const esNumeroEnteroValido = (val: string) => /^\d*$/.test(val);
export const esDecimalValido      = (val: string) => /^\d*\.?\d{0,4}$/.test(val);

export const sanitizarTexto = (texto: string): string =>
  texto.replace(/[,|]/g, "").replace(/\s+/g, " ").trim();