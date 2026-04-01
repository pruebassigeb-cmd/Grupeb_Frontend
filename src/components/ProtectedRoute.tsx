import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children:   React.ReactNode;
  permiso?:   string;           // Requiere ESTE permiso exacto
  permisoOr?: string[];         // Requiere CUALQUIERA de estos permisos
}

export default function ProtectedRoute({
  children,
  permiso,
  permisoOr,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  // No autenticado → login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // acceso_total → pasa siempre
  if (user.acceso_total) {
    return <>{children}</>;
  }

  // Verificar permiso único
  if (permiso) {
    if (!user.privilegios.includes(permiso)) {
      return <Navigate to="/sin-acceso" replace />;
    }
  }

  // Verificar permisoOr (cualquiera)
  if (permisoOr && permisoOr.length > 0) {
    const tieneAlguno = permisoOr.some((p) => user.privilegios.includes(p));
    if (!tieneAlguno) {
      return <Navigate to="/sin-acceso" replace />;
    }
  }

  return <>{children}</>;
}