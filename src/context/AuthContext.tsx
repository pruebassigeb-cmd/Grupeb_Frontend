import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { loginService, logoutService } from "../services/authService";

interface User {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol?: string;
  acceso_total?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (correo: string, codigo: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getSavedUser = (): User | null => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveUser = (u: User) => localStorage.setItem("user", JSON.stringify(u));
const clearUser = () => localStorage.removeItem("user");

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = getSavedUser();
    setUser(savedUser);
    setLoading(false);
  }, []);

  const login = async (correo: string, codigo: string) => {
    const data = await loginService(correo, codigo);
    setUser(data.usuario);
    saveUser(data.usuario);
  };

  const logout = async () => {
    try {
      await logoutService();
    } catch {
      // Continuar aunque falle
    } finally {
      setUser(null);
      clearUser();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 👇 ESTO ES LO QUE TE FALTABA
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};