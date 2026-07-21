import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { loginService, logoutService } from "../services/authService";
import { warmApiCache } from "../pwa/warmApiCache";

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
  foto_url?:    string;  // URL firmada de la foto (opcional)
}

interface AuthContextType {
  user:    User | null;
  login:   (correo: string, codigo: string) => Promise<void>;
  logout:  () => Promise<void>;
  loading: boolean;
  tienePermiso:   (permiso: string) => boolean;
  refreshFotoUrl: (foto_url: string | null) => void; // para actualizar foto sin re-login
}

// ==========================
// HELPERS — localStorage
// ==========================
const getSavedUser = (): User | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
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

  // Precalienta el runtime cache (Fase 2 del PWA) al iniciar sesión / al
  // restaurar la sesión guardada, y de nuevo cada vez que vuelve la
  // conexión mientras hay sesión activa.
  useEffect(() => {
    if (!user?.id) return;

    if (navigator.onLine) {
      warmApiCache();
    }

    const handleOnline = () => warmApiCache();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user?.id]);

  const login = async (correo: string, codigo: string) => {
    const data = await loginService(correo, codigo);
    const usuario: User = {
      ...data.usuario,
      privilegios: data.usuario.privilegios ?? [],
      foto_url:    data.usuario.foto_url ?? undefined,
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

  // Actualizar foto_url en contexto y localStorage sin re-login
  // (útil cuando el usuario edita su propio perfil)
  const refreshFotoUrl = (foto_url: string | null) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, foto_url: foto_url ?? undefined };
      saveUser(updated);
      return updated;
    });
  };

  const tienePermiso = (permiso: string): boolean => {
    if (!user) return false;
    if (user.acceso_total) return true;
    return user.privilegios.includes(permiso);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, tienePermiso, refreshFotoUrl }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};