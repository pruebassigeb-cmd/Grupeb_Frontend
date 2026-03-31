import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { loginService, logoutService } from "../services/authService";

// ==========================
// TIPOS
// ==========================
interface User {
  id:           number;
  nombre:       string;
  apellido:     string;
  correo:       string;
  rol?:         string;
  acceso_total?: boolean;
  privilegios:  string[];
}

interface AuthContextType {
  user:    User | null;
  login:   (correo: string, codigo: string) => Promise<void>;
  logout:  () => Promise<void>;
  loading: boolean;
  tienePermiso: (permiso: string) => boolean;
}

// ==========================
// HELPERS — localStorage
// ==========================
const getSavedUser = (): User | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Garantizar que privilegios siempre sea array
    return { ...parsed, privilegios: parsed.privilegios ?? [] };
  } catch {
    return null;
  }
};

const saveUser  = (u: User) => localStorage.setItem("user", JSON.stringify(u));
const clearUser = ()        => localStorage.removeItem("user");

// ==========================
// CONTEXTO
// ==========================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = getSavedUser();
    setUser(savedUser);
    setLoading(false);
  }, []);

  const login = async (correo: string, codigo: string) => {
    const data = await loginService(correo, codigo);
    const usuario: User = {
      ...data.usuario,
      privilegios: data.usuario.privilegios ?? [],
    };
    setUser(usuario);
    saveUser(usuario);
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

  // Helper reactivo para verificar permisos desde cualquier componente
  const tienePermiso = (permiso: string): boolean => {
    if (!user) return false;
    if (user.acceso_total) return true;
    return user.privilegios.includes(permiso);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};