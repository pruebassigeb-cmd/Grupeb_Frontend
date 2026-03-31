import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children:  React.ReactNode;
  permiso?:  string; // Si se indica, valida que el usuario tenga ese privilegio
}

export default function ProtectedRoute({ children, permiso }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Mientras carga, mostrar spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  // Si no está autenticado → login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Si se requiere un permiso específico, verificarlo
  if (permiso) {
    const tieneAcceso =
      user.acceso_total || user.privilegios.includes(permiso);

    if (!tieneAcceso) {
      return <Navigate to="/sin-acceso" replace />;
    }
  }

  return <>{children}</>;
}