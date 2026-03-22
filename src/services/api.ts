import axios from "axios";

// URL base de API
const API_URL = import.meta.env.VITE_API_URL || "https://grupeb-backend.onrender.com/api";

// instancia de axios
const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
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

// Interceptor de response: manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const is401 = error.response?.status === 401;
    const isAuthRoute = url.includes("/auth/");

    // Solo limpiar y redirigir si el 401 no viene de rutas de auth
    if (is401 && !isAuthRoute) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;