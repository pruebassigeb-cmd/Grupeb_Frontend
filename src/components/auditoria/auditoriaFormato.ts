import type { EventoAuditoria } from "../../services/auditoriaService";

export const fmtFechaHora = (iso: string | null): string => {
  if (!iso) return "Sin registro";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ISO_FECHA = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}|$)/;

export const formatearValor = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === "") return "vacío";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "string") {
    if (ISO_FECHA.test(valor)) return fmtFechaHora(valor);
    return valor.length > 120 ? `${valor.slice(0, 120)}…` : valor;
  }
  try {
    const texto = JSON.stringify(valor);
    return texto.length > 120 ? `${texto.slice(0, 120)}…` : texto;
  } catch {
    return String(valor);
  }
};

export const textoAccion = (accion: EventoAuditoria["accion"]): string => {
  if (accion === "INSERT") return "Creó el registro";
  if (accion === "DELETE") return "Eliminó el registro";
  return "Modificó";
};

export const colorAccion = (accion: EventoAuditoria["accion"]): string => {
  if (accion === "INSERT") return "bg-green-100 text-green-700 border-green-200";
  if (accion === "DELETE") return "bg-red-100 text-red-700 border-red-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
};

export const nombreUsuario = (usuario: { nombre: string } | null): string =>
  usuario?.nombre ?? "Sin registro";


// ============================================================
// EXPANSIÓN DE CAMPOS jsonb
//
// Los campos jsonb (especificacion, datos_antes de un detalle)
// llegan como objeto completo. Pintarlos con JSON.stringify
// obliga al usuario a leer JSON para enterarse de que cambió una
// fecha. Aquí se abren en un renglón por clave modificada.
// ============================================================

export interface CambioAuditoria {
  campo: string;
  etiqueta: string;
  antes: unknown;
  despues: unknown;
}

export interface CambioExpandido extends CambioAuditoria {
  clave: string;
  /** 0 = campo directo, 1 = clave dentro de un jsonb. */
  nivel: number;
  /** Un jsonb solo sirve de encabezado: no lleva antes ni después. */
  soloTitulo: boolean;
}

const ETIQUETAS_INTERNAS: Record<string, string> = {
  alto_relieve: "Alto relieve",
  hot_stamping: "Foil / HS",
  tamano_asa: "Tamaño de asa",
  tintas_dentro: "Tintas interiores",
  descripcion: "Descripción",
  perforacion: "Perforación",
  observacion: "Observación",
  identificador: "Identificador",
  pigmentos: "Pigmentos",
  hojeado: "Hojeado",
};

const etiquetaInterna = (clave: string): string =>
  ETIQUETAS_INTERNAS[clave] ??
  clave.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const esObjetoPlano = (valor: unknown): valor is Record<string, unknown> =>
  valor !== null && typeof valor === "object" && !Array.isArray(valor);

/** Valor de una clave interna, con "quitado" y "no existía". */
export const formatearInterno = (valor: unknown, existe: boolean): string =>
  existe ? formatearValor(valor) : "—";

/**
 * Convierte la lista de cambios de un evento en filas listas para
 * pintar. Los campos jsonb se abren; los demás pasan igual.
 */
export const expandirCambios = (
  cambios: CambioAuditoria[]
): CambioExpandido[] => {
  const filas: CambioExpandido[] = [];

  cambios.forEach((cambio) => {
    const { antes, despues } = cambio;

    if (!esObjetoPlano(antes) && !esObjetoPlano(despues)) {
      filas.push({ ...cambio, clave: cambio.campo, nivel: 0, soloTitulo: false });
      return;
    }

    const a = esObjetoPlano(antes) ? antes : {};
    const b = esObjetoPlano(despues) ? despues : {};
    const claves = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();

    const internos: CambioExpandido[] = [];

    claves.forEach((clave) => {
      const va = a[clave];
      const vb = b[clave];

      if (JSON.stringify(va ?? null) === JSON.stringify(vb ?? null)) return;

      internos.push({
        campo: clave,
        etiqueta: etiquetaInterna(clave),
        antes: clave in a ? va : "no existía",
        despues: clave in b ? vb : "quitado",
        clave: `${cambio.campo}.${clave}`,
        nivel: 1,
        soloTitulo: false,
      });
    });

    if (internos.length === 0) return;

    filas.push({
      ...cambio,
      clave: cambio.campo,
      nivel: 0,
      soloTitulo: true,
    });
    filas.push(...internos);
  });

  return filas;
};