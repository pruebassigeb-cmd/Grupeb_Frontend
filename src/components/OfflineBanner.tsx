import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-amber-600 text-white text-sm text-center py-1.5 px-4">
      Sin conexión — estás viendo datos guardados, puede que no sean los más recientes.
    </div>
  );
}
