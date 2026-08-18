import { useAuth } from "../context/AuthContext";
import Dashboard from "../layouts/Sidebar";

export default function Home() {
  const { user } = useAuth();

  return (
    <Dashboard>
      <style>{`
        @keyframes avatarBounceIn {
          0%   { transform: scale(0);    opacity: 0; }
          50%  { transform: scale(1.15); opacity: 1; }
          70%  { transform: scale(0.95); }
          85%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .avatar-bounce-in {
          animation: avatarBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>

      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="avatar-bounce-in w-[210px] h-[210px] rounded-full overflow-hidden bg-blue-100 border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0">
          {user?.foto_url ? (
            <img
              src={user.foto_url}
              alt={`${user?.nombre ?? ""} ${user?.apellido ?? ""}`}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span className="text-[45px] font-bold text-blue-600">
              {user?.nombre?.[0]?.toUpperCase()}{user?.apellido?.[0]?.toUpperCase()}
            </span>
          )}
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