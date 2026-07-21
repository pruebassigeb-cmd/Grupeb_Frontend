import { usePWAInstall } from "../hooks/usePWAInstall";

interface InstallButtonProps {
  collapsed?: boolean;
}

export default function InstallButton({ collapsed = false }: InstallButtonProps) {
  const { canInstall, promptInstall } = usePWAInstall();

  if (!canInstall) return null;

  if (collapsed) {
    return (
      <button
        onClick={promptInstall}
        title="Instalar app"
        className="w-8 h-8 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm transition flex items-center justify-center"
      >
        ⬇
      </button>
    );
  }

  return (
    <button
      onClick={promptInstall}
      className="w-full px-3 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium transition"
    >
      Instalar app
    </button>
  );
}
