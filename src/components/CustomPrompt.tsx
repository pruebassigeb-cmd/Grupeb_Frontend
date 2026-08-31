import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

export interface PromptOptions {
  /** Valor inicial del campo. */
  inicial?: string;
  /** Placeholder del input. */
  placeholder?: string;
  /** Texto del botón de confirmar (por defecto "Aceptar"). */
  textoAceptar?: string;
  /** type del <input>: 'text' (default) o 'number'. */
  type?: 'text' | 'number';
}

interface PromptState {
  isOpen: boolean;
  titulo: string;
  valor: string;
  options: PromptOptions;
  resolve: (value: string | null) => void;
}

let showPromptFn: (titulo: string, options?: PromptOptions) => Promise<string | null> = () => Promise.resolve(null);

const PromptContainer = () => {
  const [state, setState] = useState<PromptState>({
    isOpen: false,
    titulo: '',
    valor: '',
    options: {},
    resolve: () => {},
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    showPromptFn = (titulo: string, options?: PromptOptions) => {
      return new Promise<string | null>((resolve) => {
        setState({
          isOpen: true,
          titulo,
          valor: options?.inicial ?? '',
          options: options ?? {},
          resolve,
        });
      });
    };
  }, []);

  useEffect(() => {
    if (state.isOpen) {
      // Enfoca y selecciona el texto al abrir, como hace window.prompt.
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [state.isOpen]);

  const cerrar = (value: string | null) => {
    state.resolve(value);
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const handleAceptar = () => cerrar(state.valor);
  const handleCancelar = () => cerrar(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAceptar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelar();
    }
  };

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1f1f23] text-gray-100 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700/50 animate-in zoom-in-95 duration-200">

        <div className="flex-1 mb-4 break-words whitespace-pre-wrap text-sm leading-relaxed text-gray-200 font-medium">
          {state.titulo}
        </div>

        <input
          ref={inputRef}
          type={state.options.type ?? 'text'}
          value={state.valor}
          placeholder={state.options.placeholder}
          onChange={(e) => setState(prev => ({ ...prev, valor: e.target.value }))}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 rounded-lg bg-[#2a2a30] border border-gray-600 text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleCancelar}
            className="px-5 py-2 text-sm font-semibold text-gray-300 hover:text-white bg-[#2a2a30] hover:bg-gray-700 rounded-lg transition-all border border-gray-600 focus:ring-2 focus:ring-gray-500 focus:outline-none"
          >
            Cancelar
          </button>
          <button
            onClick={handleAceptar}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#b2c8f8] text-[#1a1a1a] hover:bg-[#a1b8e8] rounded-lg transition-all focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            {state.options.textoAceptar ?? 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
};

if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('custom-prompt-root');
  if (!rootElement) {
    const div = document.createElement('div');
    div.id = 'custom-prompt-root';
    document.body.appendChild(div);
    const root = createRoot(div);
    root.render(<PromptContainer />);
  }
}

/**
 * Muestra un diálogo de texto asíncrono. Sustituye a "window.prompt(msg)".
 * Uso: const valor = await showPrompt('Nueva cantidad (piezas):');
 * Uso con valor inicial y tipo numérico:
 *   const valor = await showPrompt('Editar cantidad', { inicial: '10', type: 'number' });
 * Devuelve null si el usuario cancela (igual que window.prompt).
 */
export const showPrompt = (titulo: string | unknown, options?: PromptOptions): Promise<string | null> => {
  const tituloStr = typeof titulo === 'string' ? titulo : String(titulo);
  return showPromptFn(tituloStr, options);
};
