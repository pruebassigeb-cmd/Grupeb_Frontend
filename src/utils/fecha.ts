/* ──────────────────────────────────────────────────────────────────────
 * Formato de fechas — punto único de conversión a hora de México.
 *
 * Regla de la casa: entre Postgres, el backend y este cliente todo
 * viaja en UTC. La zona horaria se aplica UNA sola vez: aquí, al
 * mostrar. Nunca uses toLocaleDateString / toLocaleString directamente
 * sobre una fecha — sin `timeZone` explícito el resultado depende del
 * reloj de la máquina del usuario.
 *
 * De la API llegan tres formas distintas y cada una necesita trato
 * distinto. Confundirlas es de donde salía el desfase de 6 horas:
 *
 *   1. "2026-08-25"                -> fecha sin hora (columna `date`)
 *      NO es un instante. JavaScript la lee como medianoche UTC, que en
 *      México son las 18:00 del día ANTERIOR. Se formatea tal cual, sin
 *      convertir de zona.
 *
 *   2. "2026-08-25T20:00:00"       -> fecha-hora SIN offset
 *      Viene de una columna `timestamp` serializada dentro de un jsonb
 *      (datos_antes / datos_despues de la bitácora). JavaScript la lee
 *      como hora LOCAL del navegador; en realidad es UTC. Aquí se le
 *      agrega la Z antes de interpretarla.
 *
 *   3. "2026-08-25T20:00:00.000Z"  -> instante completo
 *      Lo normal. Se convierte a hora de México al formatear.
 * ────────────────────────────────────────────────────────────────────── */

export const ZONA_MX = "America/Mexico_City";
const LOCALE = "es-MX";

export type EntradaFecha = string | number | Date | null | undefined;

const RE_SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_SIN_OFFSET = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/;

type Resuelto = {
  fecha: Date;
  /** Zona con la que hay que formatear ESTE valor en particular. */
  zona: string;
  /** true cuando el dato original no traía hora. */
  soloFecha: boolean;
};

/**
 * Traduce cualquier cosa que venga de la API a un instante y decide con
 * qué zona hay que formatearlo. Devuelve null si no hay fecha usable.
 */
function resolver(valor: EntradaFecha): Resuelto | null {
  if (valor === null || valor === undefined || valor === "") return null;

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? null
      : { fecha: valor, zona: ZONA_MX, soloFecha: false };
  }

  if (typeof valor === "number") {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
      ? null
      : { fecha, zona: ZONA_MX, soloFecha: false };
  }

  const texto = valor.trim();

  // Caso 1: fecha sin hora. Se ancla a medianoche UTC y se formatea EN
  // UTC, así el día que se muestra es exactamente el que mandó la base.
  const partes = RE_SOLO_FECHA.exec(texto);
  if (partes) {
    const [, anio, mes, dia] = partes;
    return {
      fecha: new Date(Date.UTC(+anio, +mes - 1, +dia)),
      zona: "UTC",
      soloFecha: true,
    };
  }

  // Caso 2: fecha-hora sin offset -> por contrato del backend es UTC.
  const iso = RE_SIN_OFFSET.test(texto) ? `${texto.replace(" ", "T")}Z` : texto;

  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? null
    : { fecha, zona: ZONA_MX, soloFecha: false };
}

/**
 * Instante real de un valor de la API, listo para comparar u ordenar.
 * Para MOSTRAR usa los fmt* de abajo, no esto.
 */
export function aInstante(valor: EntradaFecha): Date | null {
  return resolver(valor)?.fecha ?? null;
}

/** Construir un Intl.DateTimeFormat cuesta; se reusan por combinación. */
const cacheFormato = new Map<string, Intl.DateTimeFormat>();

function formatear(
  resuelto: Resuelto,
  opciones: Intl.DateTimeFormatOptions
): string {
  const llave = `${resuelto.zona}|${JSON.stringify(opciones)}`;
  let formato = cacheFormato.get(llave);
  if (!formato) {
    formato = new Intl.DateTimeFormat(LOCALE, {
      timeZone: resuelto.zona,
      ...opciones,
    });
    cacheFormato.set(llave, formato);
  }
  return formato.format(resuelto.fecha);
}

function conOpciones(opciones: Intl.DateTimeFormatOptions) {
  return (valor: EntradaFecha, alterno = "—"): string => {
    const resuelto = resolver(valor);
    return resuelto ? formatear(resuelto, opciones) : alterno;
  };
}

/** 25 ago 2026 */
export const fmtFecha = conOpciones({
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** 25/08/2026 */
export const fmtFechaCorta = conOpciones({
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** 25 de agosto de 2026 */
export const fmtFechaLarga = conOpciones({
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** 25 ago 2026, 02:05 p.m. */
export const fmtFechaHora = conOpciones({
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** 25/08/2026, 02:05 p.m. */
export const fmtFechaHoraNumerica = conOpciones({
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** 25 ago, 02:05 p.m. — para listados donde el año sobra */
export const fmtFechaHoraCorta = conOpciones({
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** 02:05 p.m. */
export const fmtHora = conOpciones({ hour: "2-digit", minute: "2-digit" });

/** 25 de agosto — para separadores donde el año se sobreentiende */
export const fmtDiaMes = conOpciones({ day: "numeric", month: "long" });

/** 25 ago — listados agrupados por mes */
export const fmtDiaMesCorto = conOpciones({ day: "2-digit", month: "short" });

/** agosto 2026 — encabezados de agrupación */
export const fmtMesAnio = conOpciones({ month: "long", year: "numeric" });

/** lunes, 25 de agosto */
export const fmtDiaSemana = conOpciones({
  weekday: "long",
  day: "numeric",
  month: "long",
});

/* ── Fecha de "hoy" según el reloj de México, no el del navegador ──── */

/** Descompone un instante en sus partes de calendario en hora de México. */
function partesEnMX(fecha: Date): { fecha: string; hora: string } {
  // en-CA da ISO (YYYY-MM-DD) sin tener que armar el string a mano.
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_MX,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);

  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_MX,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);

  return { fecha: dia, hora };
}

/** "2026-08-25" en hora de México. Para filtros, defaults y comparaciones. */
export function hoyMX(): string {
  return partesEnMX(new Date()).fecha;
}

/* ── Inputs del DOM ─────────────────────────────────────────────────── */

/** value para <input type="date"> — "2026-08-25" en hora de México. */
export function paraInputFecha(valor: EntradaFecha): string {
  const resuelto = resolver(valor);
  if (!resuelto) return "";
  if (resuelto.soloFecha) return resuelto.fecha.toISOString().slice(0, 10);
  return partesEnMX(resuelto.fecha).fecha;
}

/** value para <input type="datetime-local"> — "2026-08-25T14:05" en México. */
export function paraInputFechaHora(valor: EntradaFecha): string {
  const resuelto = resolver(valor);
  if (!resuelto) return "";
  const { fecha, hora } = partesEnMX(resuelto.fecha);
  return `${fecha}T${hora}`;
}

/**
 * Lo que escribió el usuario en un <input type="datetime-local"> es hora
 * de México. Lo convierte al ISO en UTC que espera la API.
 *
 * Se interpreta el texto como si fuera UTC y luego se corrige por el
 * offset real de México en ESA fecha, así el horario de verano —si algún
 * día regresa— no descuadra nada.
 */
export function deInputFechaHora(texto: string): string | null {
  if (!texto) return null;

  const comoUTC = new Date(`${texto.length === 16 ? `${texto}:00` : texto}Z`);
  if (Number.isNaN(comoUTC.getTime())) return null;

  const leidoEnMX = new Date(`${paraInputFechaHora(comoUTC)}:00Z`);
  const desfase = comoUTC.getTime() - leidoEnMX.getTime();

  return new Date(comoUTC.getTime() + desfase).toISOString();
}

/* ── Tiempo relativo ────────────────────────────────────────────────── */

const relativo = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "hace 5 minutos", "ayer", "en 3 días". */
export function fmtRelativo(valor: EntradaFecha, alterno = "—"): string {
  const fecha = aInstante(valor);
  if (!fecha) return alterno;

  const delta = fecha.getTime() - Date.now();
  for (const [unidad, ms] of UNIDADES) {
    if (Math.abs(delta) >= ms) {
      return relativo.format(Math.trunc(delta / ms), unidad);
    }
  }
  return "hace un momento";
}
