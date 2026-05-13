import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface Alert {
  id: number;
  msg: string;
  type: AlertType;
}

// Inicialización de la función con un no-op temporal.
let addAlertFn: (msg: string, type: AlertType) => void = () => {};

const AlertContainer = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Al montarse el contenedor, enlaza la función de estado.
    addAlertFn = (msg, type) => {
      const id = Date.now();
      setAlerts(prev => [...prev, { id, msg, type }]);
      
      // Auto-eliminar la alerta después de 4 segundos
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, 4000);
    };
  }, []);

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      {alerts.map(a => (
        <div key={a.id} className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-lg text-white font-medium min-w-[300px] max-w-sm transition-all transform animate-in fade-in slide-in-from-top-2 duration-300
          ${a.type === 'error' ? 'bg-red-500' : a.type === 'success' ? 'bg-green-500' : a.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}
        `}>
          <div className="flex items-center gap-3">
            {/* Ícono de Error */}
            {a.type === 'error' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {/* Ícono de Éxito */}
            {a.type === 'success' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {/* Ícono de Advertencia */}
            {a.type === 'warning' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            )}
            {/* Ícono de Info */}
            {a.type === 'info' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {/* Mensaje */}
            <span className="text-sm break-words">{a.msg}</span>
          </div>
          {/* Botón Cerrar */}
          <button onClick={() => removeAlert(a.id)} className="ml-4 text-white/80 hover:text-white transition-colors focus:outline-none flex-shrink-0 cursor-pointer">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
};

// Inyectamos el root de las alertas una única vez en el body cuando se carga este módulo.
if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('custom-alert-root');
  if (!rootElement) {
    const div = document.createElement('div');
    div.id = 'custom-alert-root';
    document.body.appendChild(div);
    const root = createRoot(div);
    root.render(<AlertContainer />);
  }
}

/**
 * Muestra una alerta global estilo Toast.
 * Sustituye "alert(msg)".
 */
export const showAlert = (msg: string | unknown, type?: AlertType) => {
  const messageStr = typeof msg === 'string' ? msg : String(msg);
  
  let finalType = type;
  if (!finalType) {
    const lower = messageStr.toLowerCase();
    if (lower.includes('éxito') || lower.includes('exitosa') || lower.includes('correctamente') || lower.includes('ok')) {
      finalType = 'success';
    } else if (lower.includes('error') || lower.includes('falló') || lower.includes('no se pudo')) {
      finalType = 'error';
    } else {
      finalType = 'warning';
    }
  }

  addAlertFn(messageStr, finalType);
};
