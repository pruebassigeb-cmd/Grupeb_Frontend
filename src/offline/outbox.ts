import { getOutboxDB, type OutboxEntry, type OutboxMethod } from "./db";
import api from "../services/api";

export type { OutboxEntry, OutboxMethod };

/**
 * Se lanza cuando una escritura no se pudo mandar por falta de red y quedó
 * guardada en el outbox. Los llamadores que quieran mostrar un mensaje
 * distinto a "hubo un error" (ej. "se guardó, se sube solo al reconectar")
 * pueden capturar este tipo específico; el resto simplemente lo ve como un
 * error más en su catch existente — no rompe nada si no se actualiza.
 */
export class OperacionEncoladaError extends Error {
  entry: OutboxEntry;

  constructor(entry: OutboxEntry) {
    super("Sin conexión — la operación se guardó y se sincronizará automáticamente.");
    this.name = "OperacionEncoladaError";
    this.entry = entry;
  }
}

function generarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Distingue un fallo de red real (sin conexión, tunel caído, etc.) de un
 * error de negocio devuelto por el servidor (401, 403, 400 de validación).
 * Axios no llena `error.response` cuando la petición nunca llegó a tener
 * respuesta — eso es la señal de que fue un problema de red, no del servidor.
 */
export function esErrorDeRed(error: unknown): boolean {
  const err = error as { response?: unknown; code?: string; message?: string } | undefined;
  if (!err) return false;
  return !err.response && (err.code === "ERR_NETWORK" || err.message === "Network Error" || !navigator.onLine);
}

export async function encolar(
  method: OutboxMethod,
  url: string,
  data: unknown,
  descripcion: string,
  modulo?: string
): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    id: generarId(),
    createdAt: Date.now(),
    kind: "http",
    method,
    url,
    data,
    descripcion,
    intentos: 0,
    modulo,
  };
  const db = await getOutboxDB();
  await db.put("outbox", entry);
  return entry;
}

/**
 * Tareas compuestas (más que una sola petición HTTP genérica) — ver
 * `registrarManejadorOutbox`. `kind` debe coincidir con el registrado.
 */
export async function encolarPersonalizado(
  kind: string,
  data: unknown,
  descripcion: string,
  modulo?: string
): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    id: generarId(),
    createdAt: Date.now(),
    kind,
    data,
    descripcion,
    intentos: 0,
    modulo,
  };
  const db = await getOutboxDB();
  await db.put("outbox", entry);
  return entry;
}

/**
 * Después de este número de intentos fallidos, una entrada deja de
 * reintentarse automáticamente (ver `sincronizarOutbox`). Sin esto, un
 * rechazo permanente del servidor (ej. una validación de datos que el
 * backend regresa como 500 en vez de 400) se reintentaría cada
 * `REINTENTO_MS` para siempre — y si además el backend no envuelve la
 * operación en una transacción, cada intento puede dejar basura nueva en
 * la base de datos en vez de solo fallar limpio.
 */
const MAX_INTENTOS = 5;

export async function listarPendientes(): Promise<OutboxEntry[]> {
  const db = await getOutboxDB();
  return db.getAllFromIndex("outbox", "by-createdAt");
}

/** Cuenta solo las que todavía se van a seguir reintentando. */
export async function contarPendientes(): Promise<number> {
  const todas = await listarPendientes();
  return todas.filter((e) => e.intentos < MAX_INTENTOS).length;
}

/** Entradas que agotaron sus reintentos — necesitan revisión manual. */
export async function contarFallidosPermanentes(): Promise<number> {
  const todas = await listarPendientes();
  return todas.filter((e) => e.intentos >= MAX_INTENTOS).length;
}

export async function eliminarDeOutbox(id: string): Promise<void> {
  const db = await getOutboxDB();
  await db.delete("outbox", id);
}

/**
 * Registro de manejadores para entradas con `kind` distinto de "http". Se
 * registran una sola vez al cargar el módulo dueño de la lógica (ver
 * `expoOutboxHandlers.ts`, importado desde `App.tsx` para que quede
 * registrado sin importar en qué pantalla esté el usuario cuando se
 * dispare la sincronización.
 */
type ManejadorOutbox = (data: unknown) => Promise<void>;
const manejadoresPersonalizados = new Map<string, ManejadorOutbox>();

export function registrarManejadorOutbox(kind: string, manejador: ManejadorOutbox): void {
  manejadoresPersonalizados.set(kind, manejador);
}

async function actualizarEnOutbox(entry: OutboxEntry): Promise<void> {
  const db = await getOutboxDB();
  await db.put("outbox", entry);
}

/**
 * Ejecuta una escritura contra el servidor; si falla específicamente por
 * red, la guarda en el outbox y lanza `OperacionEncoladaError` en vez de
 * dejar que se pierda. Cualquier otro error (validación, permisos, etc.)
 * se deja pasar tal cual — eso no se encola, es un rechazo real.
 */
export async function ejecutarOEncolar<T>(
  method: OutboxMethod,
  url: string,
  data: unknown,
  descripcion: string,
  ejecutar: () => Promise<T>,
  modulo?: string
): Promise<T> {
  try {
    return await ejecutar();
  } catch (error) {
    if (!esErrorDeRed(error)) throw error;
    const entry = await encolar(method, url, data, descripcion, modulo);
    throw new OperacionEncoladaError(entry);
  }
}

/**
 * Cuánto esperar antes de reintentar una entrada que chocó con un rate
 * limit (429), cuando el servidor no manda un `Retry-After` usable.
 * Los límites reales (`writeLimiter`/`correoLimiter` en el backend) son de
 * 15 minutos — reintentar cada `REINTENTO_MS` (20s) contra eso no sirve de
 * nada, solo agota los `MAX_INTENTOS` en menos de 2 minutos y además sigue
 * metiendo tráfico al mismo endpoint saturado.
 */
const ESPERA_429_POR_DEFECTO_MS = 60_000;

function calcularEsperaTrasRateLimit(headers: unknown): number {
  const h = headers as Record<string, string> | undefined;
  const retryAfter = h?.["retry-after"];
  if (retryAfter) {
    const segundos = Number(retryAfter);
    if (!Number.isNaN(segundos) && segundos > 0) return segundos * 1000;
  }
  return ESPERA_429_POR_DEFECTO_MS;
}

export interface ResultadoSincronizacion {
  exitosos: number;
  fallidos: number;
  detenidoPor401: boolean;
  /** Módulos (`OutboxEntry.modulo`) que tuvieron al menos un éxito en esta corrida. */
  modulosSincronizados: Set<string>;
}

/**
 * Reproduce la cola contra el servidor, en el orden en que se creó (FIFO).
 * - Si el servidor rechaza con un error de negocio (4xx, ej. validación o
 *   conflicto), se descarta esa entrada y se cuenta como fallida — no tiene
 *   caso reintentar algo que el servidor ya rechazó con una razón concreta.
 * - Si el rechazo es 401 (sesión vencida), se detiene ahí mismo y se deja
 *   el resto de la cola intacta — el interceptor global de `api.ts` ya se
 *   encarga de mandar a login; el reintento ocurre solo cuando se vuelva a
 *   iniciar sesión (mismo gancho que usa `warmApiCache`).
 * - Cualquier otro error (5xx, timeout) se considera transitorio: se deja
 *   en la cola para el siguiente intento.
 */
export async function sincronizarOutbox(): Promise<ResultadoSincronizacion> {
  const pendientes = await listarPendientes();
  let exitosos = 0;
  let fallidos = 0;
  const modulosSincronizados = new Set<string>();

  for (const entry of pendientes) {
    if (entry.intentos >= MAX_INTENTOS) {
      // Ya se agotaron los reintentos — se deja en la base (no se pierde
      // la descripción/datos por si alguien quiere revisarla a mano), pero
      // no se vuelve a mandar sola.
      continue;
    }

    if (entry.noReintentarAntesDe && entry.noReintentarAntesDe > Date.now()) {
      // Sigue en enfriamiento tras un 429 reciente — no tiene caso
      // intentarlo de nuevo hasta que pase el tiempo indicado.
      continue;
    }

    try {
      if (entry.kind === "http") {
        await api.request({ method: entry.method, url: entry.url, data: entry.data });
      } else {
        const manejador = manejadoresPersonalizados.get(entry.kind);
        if (!manejador) {
          // El módulo dueño de este tipo de tarea todavía no se cargó en
          // esta sesión (no debería pasar si se registra desde App.tsx,
          // pero por seguridad se deja en cola en vez de perderla).
          continue;
        }
        await manejador(entry.data);
      }
      await eliminarDeOutbox(entry.id);
      exitosos++;
      if (entry.modulo) modulosSincronizados.add(entry.modulo);
    } catch (error) {
      const err = error as { response?: { status?: number; headers?: unknown } } | undefined;
      const status = err?.response?.status;

      if (status === 401) {
        return { exitosos, fallidos, detenidoPor401: true, modulosSincronizados };
      }

      // 429 (Too Many Requests) es transitorio por definición — el servidor
      // solo está pidiendo esperar, no rechazando la operación. Tratarlo
      // como un 4xx normal borraba la cotización/correo pendiente para
      // siempre; tratarlo igual que un 5xx (reintento cada REINTENTO_MS)
      // tampoco alcanza, porque el límite real es de 15 minutos y así se
      // agotan los MAX_INTENTOS en menos de 2 — y de paso se le sigue
      // pegando al mismo endpoint saturado. Se le da su propio enfriamiento
      // (ver `noReintentarAntesDe`), tomado de `Retry-After` si el servidor
      // lo manda.
      if (status === 429) {
        entry.intentos += 1;
        entry.noReintentarAntesDe = Date.now() + calcularEsperaTrasRateLimit(err?.response?.headers);
        entry.ultimoError = "HTTP 429 — demasiadas solicitudes, se reintentará más tarde";
        if (entry.intentos >= MAX_INTENTOS) {
          entry.ultimoError += ` — se dejó de reintentar tras ${MAX_INTENTOS} intentos`;
          console.error(
            `[outbox] "${entry.descripcion}" agotó sus reintentos (todos por rate limit) y ya no se va a mandar sola. Revisar manualmente.`
          );
        }
        await actualizarEnOutbox(entry);
        fallidos++;
        continue;
      }

      if (status && status < 500) {
        await eliminarDeOutbox(entry.id);
        fallidos++;
        continue;
      }

      entry.intentos += 1;
      entry.ultimoError = status ? `HTTP ${status}` : String(error);
      if (entry.intentos >= MAX_INTENTOS) {
        entry.ultimoError += ` — se dejó de reintentar tras ${MAX_INTENTOS} intentos`;
        console.error(
          `[outbox] "${entry.descripcion}" agotó sus reintentos y ya no se va a mandar sola. Revisar manualmente. Último error: ${entry.ultimoError}`
        );
      }
      await actualizarEnOutbox(entry);
      fallidos++;
    }
  }

  return { exitosos, fallidos, detenidoPor401: false, modulosSincronizados };
}
