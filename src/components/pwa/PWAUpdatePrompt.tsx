import { useRegisterSW } from "virtual:pwa-register/react";

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error("Error al registrar el service worker:", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg bg-slate-800 border border-slate-600 shadow-2xl p-4 text-white">
      <p className="text-sm font-medium mb-3">
        Hay una nueva versión de SIGEB disponible.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-3 py-1.5 rounded text-sm text-slate-300 hover:bg-slate-700 transition"
        >
          Más tarde
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-sm font-medium transition"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
