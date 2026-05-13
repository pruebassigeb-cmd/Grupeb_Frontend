import axios from "axios";

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

export default api;