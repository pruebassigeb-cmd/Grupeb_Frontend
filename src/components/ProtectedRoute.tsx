import { Navigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  // No autenticado → login, pero recordando a dónde iba (ej. un deep-link
  // de un correo) para regresarlo ahí después de iniciar sesión.
  if (!user) {
    const destino = `${location.pathname}${location.search}`;
    return <Navigate to="/" replace state={{ from: destino }} />;
  }

  // Rol exclusivo: mientras Expo esté en desarrollo, este rol solo puede
  // entrar a /expo (y subrutas), sin importar que tenga acceso_total.
  // Va ANTES del bypass de acceso_total a propósito.
  if (user.rol === "Expo" && !location.pathname.startsWith("/expo")) {
    return <Navigate to="/expo" replace />;
  }

  // Rol exclusivo: la cuenta compartida del Cotizador Interactivo
  // (cotizacionlibre@grupoeb.com) solo puede entrar a /cotizador-libre,
  // sin importar que tenga acceso_total. Mismo patrón que Expo, misma razón:
  // va ANTES del bypass de acceso_total.
  if (user.rol === "CotizadorLibre" && !location.pathname.startsWith("/cotizador-libre")) {
    return <Navigate to="/cotizador-libre" replace />;
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