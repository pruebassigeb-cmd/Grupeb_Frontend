import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

// Detectar entorno automáticamente
const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV
    ? "http://localhost:3000/api"
    : "https://grupeb-backend.onrender.com/api"
);

// Instancia de axios
const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Accept":       "application/json; charset=utf-8",
  },
});

// Interceptor de request: agregar token en header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Rutas donde un 401 NO debe cerrar la sesión.
// Pueden devolver 401 por credenciales incorrectas, no por token expirado.
const RUTAS_SIN_LOGOUT = [
  "/auth/",
  "/backups/verificar-codigo",
  "/backups/manual",
  "/backups/schedule",
];

// Interceptor de response: manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url     = error.config?.url || "";
    const is401   = error.response?.status === 401;
    const excluir = RUTAS_SIN_LOGOUT.some((ruta) => url.includes(ruta));

    // Solo cerrar sesión si el 401 viene de una ruta que SÍ requiere token válido
    if (is401 && !excluir) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

// ============================================================
// Deduplicación de GET concurrentes ("singleflight"): si dos llamadas piden
// la misma URL+params mientras la primera sigue en vuelo (ej. warmApiCache
// precalentando /pedidos justo cuando Cotizar.tsx pide lo mismo al montarse),
// la segunda reutiliza la promesa de la primera en vez de disparar otra
// petición — evita ráfagas de peticiones idénticas que agotan el rate limit
// del backend. Se limpia del mapa en cuanto se resuelve (éxito o error), así
// que no sirve datos viejos: solo evita pedir dos veces lo mismo a la vez.
// ============================================================
const solicitudesEnVuelo = new Map<string, Promise<AxiosResponse>>();

function serializarParamsOrdenado(params: unknown): string {
  if (!params || typeof params !== "object") return JSON.stringify(params ?? null);
  const ordenado: Record<string, unknown> = {};
  for (const clave of Object.keys(params as Record<string, unknown>).sort()) {
    ordenado[clave] = (params as Record<string, unknown>)[clave];
  }
  return JSON.stringify(ordenado);
}

const getOriginal = api.get.bind(api);

api.get = (<T = any, R = AxiosResponse<T>>(
  url: string,
  config?: AxiosRequestConfig
): Promise<R> => {
  // Las peticiones cancelables (signal/cancelToken, ej. cálculo de precio en
  // vivo con debounce) no se comparten: si dos llamadas usaran la misma
  // promesa y una se aborta, la otra se quedaría sin respuesta también.
  if (config?.signal || config?.cancelToken) {
    return getOriginal<T, R>(url, config);
  }

  const clave = `GET ${url}?${serializarParamsOrdenado(config?.params)}`;
  const existente = solicitudesEnVuelo.get(clave) as Promise<R> | undefined;
  if (existente) return existente;

  const promesa = getOriginal<T, R>(url, config).finally(() => {
    solicitudesEnVuelo.delete(clave);
  });
  solicitudesEnVuelo.set(clave, promesa as unknown as Promise<AxiosResponse>);
  return promesa;
}) as typeof api.get;

export default api;