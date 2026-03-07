// ============================================================
// src/services/rodillosService.ts
// ============================================================
import api from "./api";
import type { MedidaKey } from "../types/productos-plastico.types";

// ── Tipos ────────────────────────────────────────────────────
export interface ResultadoRodillo {
  maquina:          "KIDDER" | "SICOSA";
  sin_grabado:      number;
  con_grabado_1rep: number;
  con_grabado_2rep: number;
  con_grabado_3rep: number;
  con_grabado_4rep: number | null;
  con_grabado_5rep: number | null;
  es_exacto:        boolean;
}

export interface RespuestaRodillos {
  valor_buscado: number;
  resultados:    ResultadoRodillo[];
}

// ── Limpiar número — quita H, comillas, espacios ─────────────
const limpiarNumero = (v: any): number => {
  if (v === null || v === undefined) return 0;
  const limpio = String(v).replace(/[^0-9.]/g, "").trim();
  return parseFloat(limpio) || 0;
};

// ── Formatear número sin ceros finales innecesarios ──────────
// 52.2000 → "52.2"   |   13.3333 → "13.3333"   |   61.0000 → "61"
const fmt = (v: any): string => {
  const n = limpiarNumero(v);
  if (n === 0) return "0";
  return parseFloat(n.toFixed(4)).toString();
};

// ── Calcular parámetro de búsqueda según tipo de fuelle ──────
export const calcularParametroRodillo = (
  medidas: Record<MedidaKey, string>
): number => {
  const altura      = limpiarNumero(medidas.altura);
  const ancho       = limpiarNumero(medidas.ancho);
  const fuelleFondo = limpiarNumero(medidas.fuelleFondo);
  const fuelleLat   = limpiarNumero(medidas.fuelleLateral1);

  console.log("🔍 Medidas para rodillo:", { altura, ancho, fuelleFondo, fuelleLat });

  if (fuelleLat > 0) {
    const valor = altura + fuelleLat;
    console.log(`🔍 Fuelle LATERAL → valor: ${altura} + ${fuelleLat} = ${valor}`);
    return valor;
  } else {
    const valor = ancho + fuelleFondo;
    console.log(`🔍 Fuelle FONDO → valor: ${ancho} + ${fuelleFondo} = ${valor}`);
    return valor;
  }
};

// ── Encontrar la rep más cercana al valor buscado ────────────
const encontrarRepMasCercana = (
  r: ResultadoRodillo,
  valor: number
): { label: string; valor: number } => {
  const reps = [
    { label: "1 rep", valor: limpiarNumero(r.con_grabado_1rep) },
    { label: "2 rep", valor: limpiarNumero(r.con_grabado_2rep) },
    { label: "3 rep", valor: limpiarNumero(r.con_grabado_3rep) },
    ...(r.con_grabado_4rep != null
      ? [{ label: "4 rep", valor: limpiarNumero(r.con_grabado_4rep) }]
      : []),
    ...(r.con_grabado_5rep != null
      ? [{ label: "5 rep", valor: limpiarNumero(r.con_grabado_5rep) }]
      : []),
  ].filter(rep => rep.valor > 0);

  if (reps.length === 0) return { label: "1 rep", valor: 0 };

  return reps.reduce((prev, curr) =>
    Math.abs(curr.valor - valor) < Math.abs(prev.valor - valor) ? curr : prev
  );
};

// ── Formatear resultado para el campo Repetición del PDF ─────
export const formatearRepeticionParaPdf = (
  resultados: ResultadoRodillo[],
  valorBuscado: number
): string => {
  if (!resultados || resultados.length === 0) return "";

  return resultados
    .map((r) => {
      const sinGrabado = fmt(r.sin_grabado);
      const prefijo    = r.es_exacto ? "" : "~";
      const rep        = encontrarRepMasCercana(r, valorBuscado);
      const repValor   = fmt(rep.valor);
      return `${r.maquina}: ${prefijo}${sinGrabado} (${rep.label}: ${repValor})`;
    })
    .join(" | ");
};

// ── Llamada al endpoint ──────────────────────────────────────
export const buscarRodillos = async (
  medidas: Record<MedidaKey, string>
): Promise<RespuestaRodillos> => {
  const valor = calcularParametroRodillo(medidas);

  console.log("🚀 Buscando rodillo para valor:", valor);

  if (valor <= 0) {
    console.warn("⚠️ Valor de rodillo = 0, no se busca");
    return { valor_buscado: 0, resultados: [] };
  }

  const response = await api.get(`/rodillos/buscar?valor=${valor}`);
  console.log("✅ Respuesta rodillos:", JSON.stringify(response.data));
  return response.data;
};