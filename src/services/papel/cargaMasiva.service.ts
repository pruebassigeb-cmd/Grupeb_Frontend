// src/services/papel/cargaMasiva.service.ts
import type {
  RespuestaCargaMasiva,
  CatalogoNuevo,
} from "../../types/papel/cargaMasiva.types";

export type { ResultadoFilaCarga, CatalogoNuevo, RespuestaCargaMasiva } from "../../types/papel/cargaMasiva.types";

const BASE = (import.meta as any).env.VITE_API_URL;

export async function subirCargaMasivaPapel(archivo: File): Promise<RespuestaCargaMasiva> {
  const fd = new FormData();
  fd.append("archivo", archivo);

  const resp = await fetch(`${BASE}/productos-papel/carga-masiva`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    body: fd,
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error ?? "Error al procesar la carga masiva");
  return data;
}

export async function descargarReporteCatalogos(catalogosNuevos: CatalogoNuevo[]): Promise<void> {
  const resp = await fetch(`${BASE}/productos-papel/carga-masiva/reporte`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
    },
    body: JSON.stringify({ catalogosNuevos }),
  });

  if (!resp.ok) throw new Error("Error al generar el reporte");

  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte_catalogos_nuevos.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}