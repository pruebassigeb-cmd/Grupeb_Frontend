import api from "./api";

export const loginService = async (correo: string, codigo: string) => {
  const response = await api.post("/auth/login", { correo, codigo });
  const { token, usuario } = response.data;
  if (token) {
    localStorage.setItem("token", token);
  }
  return { usuario };
};

// Módulo de autenticación por red — login por idusuario (modo COLLAGE) en
// vez de correo. Mismo shape de respuesta que loginService.
export const loginCollageService = async (idusuario: number, codigo: string) => {
  const response = await api.post("/auth/login-collage", { idusuario, codigo });
  const { token, usuario } = response.data;
  if (token) {
    localStorage.setItem("token", token);
  }
  return { usuario };
};

export interface LoginModeResponse {
  mode: "COLLAGE" | "NORMAL" | "BLOQUEADO";
  network?: string;
}

// Se llama al cargar la pantalla de login, sin sesión todavía.
export const loginModeService = async (): Promise<LoginModeResponse> => {
  const response = await api.get("/auth/login-mode");
  return response.data;
};

export interface CollageUsuario {
  id: number;
  nombre: string;
  apellido: string;
  rol: string | null;
  foto_url: string | null;
}

// Solo responde si la IP que pregunta es realmente COLLAGE — si no, el
// backend regresa 403 (ver collageUsuarios en auth.controller.ts).
export const collageUsuariosService = async (): Promise<CollageUsuario[]> => {
  const response = await api.get("/auth/collage-usuarios");
  return response.data;
};

export const logoutService = async () => {
  const response = await api.post("/auth/logout");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  return response.data;
};

export const verifyTokenService = async () => {
  const response = await api.get("/auth/verify");
  return response.data;
};