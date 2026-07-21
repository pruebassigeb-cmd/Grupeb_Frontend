import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type OutboxMethod = "post" | "put" | "patch" | "delete";

/**
 * `kind: "http"` (el caso normal, generado por `ejecutarOEncolar`) se
 * reproduce con una sola petición genérica (`method` + `url` + `data`).
 * Cualquier otro valor de `kind` es una tarea compuesta con lógica propia,
 * registrada vía `registrarManejadorOutbox` — ahí `method`/`url` no aplican,
 * todo lo que necesita el manejador va en `data`. Ver `expoOutboxHandlers.ts`
 * para el caso real: "cotizacion-expo-con-correo".
 */
export interface OutboxEntry {
  id: string;
  createdAt: number;
  kind: string;
  method?: OutboxMethod;
  url?: string;
  data?: unknown;
  descripcion: string;
  intentos: number;
  ultimoError?: string;
  /**
   * Timestamp (`Date.now()`) antes del cual no vale la pena reintentar esta
   * entrada — se llena cuando el servidor responde 429 (rate limit) con un
   * `Retry-After` real, para no chocar contra el mismo límite cada
   * `REINTENTO_MS`. Ver `sincronizarOutbox`.
   */
  noReintentarAntesDe?: number;
  /**
   * Módulo dueño de esta entrada (ej. "expo") — opcional, solo se usa hoy
   * para decidir cuándo disparar la notificación local de "tus cambios de
   * Expo ya se sincronizaron" sin avisar por escrituras de otros módulos
   * que compartan el mismo outbox. Ver `sincronizarOutbox`/`useSyncOutbox`.
   */
  modulo?: string;
  /**
   * Mensaje concreto a mostrar en una notificación cuando esta entrada
   * sincroniza con éxito (ej. `El correo para "Juan Pérez" se envió
   * correctamente`) — se arma con el contexto ya disponible al encolar
   * (nombre de cliente/producto), no requiere esperar la respuesta del
   * servidor. Si no se define, esta entrada no dispara ninguna notificación
   * individual. Ver `sincronizarOutbox`/`useSyncOutbox`.
   */
  notificacionExito?: string;
}

interface SigebOutboxDB extends DBSchema {
  outbox: {
    key: string;
    value: OutboxEntry;
    indexes: { "by-createdAt": number };
  };
}

let dbPromise: Promise<IDBPDatabase<SigebOutboxDB>> | null = null;

export function getOutboxDB(): Promise<IDBPDatabase<SigebOutboxDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SigebOutboxDB>("sigeb-pwa", 1, {
      upgrade(db) {
        const store = db.createObjectStore("outbox", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
      },
    });
  }
  return dbPromise;
}
