import api from "./api";

export const loginService = async (correo: string, codigo: string) => {
  const response = await api.post("/auth/login", { correo, codigo });
  const { token, usuario } = response.data;
  if (token) {
    localStorage.setItem("token", token);
  }
  return { usuario };
};

export const logoutService = async () => {
  const response = await api.post("/auth/logout");
  localStorage.removeItem("token");
  return response.data;
};

export const verifyTokenService = async () => {
  const response = await api.get("/auth/verify");
  return response.data;
};