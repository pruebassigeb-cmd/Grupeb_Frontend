import axios from "axios";

// URL base de API
const API_URL = import.meta.env.VITE_API_URL || "https://grupeb-backend.onrender.com/api";

// instancia de axios
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("usuario");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;