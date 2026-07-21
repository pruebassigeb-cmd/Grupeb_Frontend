import type { ReactNode } from "react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

interface RequiereConexionProps {
  children: ReactNode;
}

export default function RequiereConexion({ children }: RequiereConexionProps) {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-lg font-semibold text-slate-700 mb-1">
            Esta sección requiere conexión
          </p>
          <p className="text-sm text-slate-500">
            Vuelve a conectarte a internet para ver esta información.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
