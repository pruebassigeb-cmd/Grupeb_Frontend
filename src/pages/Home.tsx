import { useAuth } from "../context/AuthContext";
import Dashboard from "../layouts/Sidebar";

export default function Home() {
  const { user } = useAuth();

  return (
    <Dashboard>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">
            Bienvenido{user?.nombre ? `, ${user.nombre}` : ""}
          </h1>
          <p className="text-gray-500 text-sm max-w-md">
            Estás en el sistema de gestión de GrupEB. Usa el menú lateral para navegar entre los módulos disponibles.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl mt-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
          <span className="text-xs text-gray-500">Sistema operando con normalidad</span>
        </div>
      </div>
    </Dashboard>
  );
}