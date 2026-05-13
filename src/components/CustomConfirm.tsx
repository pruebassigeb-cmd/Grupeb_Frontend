import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface ConfirmState {
  isOpen: boolean;
  msg: string;
  resolve: (value: boolean) => void;
}

let showConfirmFn: (msg: string) => Promise<boolean> = () => Promise.resolve(true);

const ConfirmContainer = () => {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    msg: '',
    resolve: () => {},
  });

  useEffect(() => {
    showConfirmFn = (msg: string) => {
      // Evita poner otro dialogo si ya hay uno abierto, aunque para simpleza, lo sobreescribe
      return new Promise<boolean>((resolve) => {
        setState({ isOpen: true, msg, resolve });
      });
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.isOpen) {
        if (e.key === 'Escape') {
          state.resolve(false);
          setState(prev => ({ ...prev, isOpen: false }));
        } else if (e.key === 'Enter') {
          state.resolve(true);
          setState(prev => ({ ...prev, isOpen: false }));
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isOpen]);

  const handleConfirm = () => {
    state.resolve(true);
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    state.resolve(false);
    setState(prev => ({ ...prev, isOpen: false }));
  };

  if (!state.isOpen) return null;

  // Renderizamos un modal oscuro elegante para que se parezca un poco a la captura
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1f1f23] text-gray-100 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700/50 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-start gap-4 mb-2">
          <div className="flex-shrink-0 w-10 h-10 mt-1 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
          </div>
          <div className="flex-1 mt-1 break-words whitespace-pre-wrap text-sm leading-relaxed text-gray-200 font-medium">
            {state.msg || "¿Estás seguro de continuar con esta acción?"}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-8">
          <button 
            onClick={handleCancel}
            className="px-5 py-2 text-sm font-semibold text-gray-300 hover:text-white bg-[#2a2a30] hover:bg-gray-700 rounded-lg transition-all border border-gray-600 focus:ring-2 focus:ring-gray-500 focus:outline-none"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#b2c8f8] text-[#1a1a1a] hover:bg-[#a1b8e8] rounded-lg transition-all focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('custom-confirm-root');
  if (!rootElement) {
    const div = document.createElement('div');
    div.id = 'custom-confirm-root';
    document.body.appendChild(div);
    const root = createRoot(div);
    root.render(<ConfirmContainer />);
  }
}

/**
 * Muestra un diálogo de confirmación asíncrono.
 * Uso: const confirmado = await showConfirm('¿Estás seguro?');
 */
export const showConfirm = (msg: string | unknown): Promise<boolean> => {
  const messageStr = typeof msg === 'string' ? msg : String(msg);
  return showConfirmFn(messageStr);
};
