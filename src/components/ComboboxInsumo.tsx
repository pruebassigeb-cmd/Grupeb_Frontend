// src/components/ComboboxInsumo.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { buscarInsumos } from "../services/proveedoresService";
import type { Insumo } from "../services/proveedoresService";

interface ComboboxInsumoProps {
  tipoId: number | null;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSeleccionar: (item: Insumo) => void;
  onRegistrarNuevo?: (nombre: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ComboboxInsumo({
  tipoId,
  placeholder = "Buscar...",
  value,
  onChange,
  onSeleccionar,
  onRegistrarNuevo,
  disabled = false,
  className = "",
}: ComboboxInsumoProps) {
  const [abierto, setAbierto] = useState(false);
  const [todos, setTodos] = useState<Insumo[]>([]);
  const [filtrados, setFiltrados] = useState<Insumo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!tipoId) return;
    setCargando(true);
    buscarInsumos(tipoId, "")
      .then((res) => {
        setTodos(res);
        setFiltrados(res);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [tipoId]);

  useEffect(() => {
    const q = value.trim().toLowerCase();
    if (!q) {
      setFiltrados(todos);
    } else {
      setFiltrados(
        todos.filter(
          (item) =>
            item.nombre.toLowerCase().includes(q) ||
            item.proveedores.some(
              (p) =>
                (p.codigo ?? "").toLowerCase().includes(q) ||
                (p.proveedor_nombre ?? "").toLowerCase().includes(q)
            )
        )
      );
    }
    setHighlightIndex(-1);
  }, [value, todos]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierto) { if (e.key !== "Tab") setAbierto(true); return; }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtrados.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && filtrados[highlightIndex]) {
          seleccionar(filtrados[highlightIndex]);
        }
        break;
      case "Escape":
        setAbierto(false);
        inputRef.current?.blur();
        break;
    }
  };

  const seleccionar = useCallback(
    (item: Insumo) => {
      onSeleccionar(item);
      setAbierto(false);
      setHighlightIndex(-1);
    },
    [onSeleccionar]
  );

  const handleRegistrar = () => {
    onRegistrarNuevo?.(value.trim());
    setAbierto(false);
  };

  const mostrarRegistrar = !!onRegistrarNuevo && value.trim().length > 0 && !!tipoId;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex items-center gap-2 w-full px-3 py-2 border-2 rounded-lg bg-white transition-all cursor-text ${
          disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : abierto
            ? "border-purple-500 ring-2 ring-purple-100"
            : value
            ? "border-purple-400 bg-purple-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={() => { if (!disabled) { setAbierto(true); inputRef.current?.focus(); } }}
      >
        <svg
          className={`w-4 h-4 flex-shrink-0 ${disabled ? "text-gray-300" : "text-gray-400"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "No aplica" : placeholder}
          className={`flex-1 min-w-0 bg-transparent text-sm outline-none ${
            disabled ? "text-gray-300 cursor-not-allowed placeholder-gray-300" : "text-gray-900 placeholder-gray-400"
          }`}
        />

        {value && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onChange(""); inputRef.current?.focus(); setAbierto(true); }}
            className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
            disabled ? "text-gray-200" : "text-gray-400"
          } ${abierto ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {abierto && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-40 overflow-hidden">
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {cargando ? "Cargando..." : `${filtrados.length} resultado${filtrados.length !== 1 ? "s" : ""}`}
            </span>
            {value && (
              <span className="text-xs text-purple-500 font-medium">
                Filtrando: "{value}"
              </span>
            )}
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-400 border-t-transparent" />
              <span className="text-sm">Cargando insumos...</span>
            </div>
          ) : filtrados.length > 0 ? (
            <ul ref={listRef} className="max-h-52 overflow-y-auto">
              {filtrados.map((item, i) => (
                <li
                  key={item.idinsumo}
                  onMouseDown={(e) => { e.preventDefault(); seleccionar(item); }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                    i === highlightIndex ? "bg-purple-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 truncate">{item.nombre}</span>
                      {item.proveedores.length === 1 && item.proveedores[0].codigo && (
                        <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600 flex-shrink-0">
                          {item.proveedores[0].codigo}
                        </code>
                      )}
                    </div>
                    {item.proveedores.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.proveedores.map((p) => (
                          <span key={p.idinsumo_proveedor}
                            className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            {p.proveedor_nombre}{p.codigo ? ` · ${p.codigo}` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Sin proveedor asignado</span>
                    )}
                  </div>
                  {i === highlightIndex && (
                    <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-5 text-center">
              <p className="text-sm text-gray-400">Sin resultados para "{value}"</p>
            </div>
          )}

          {mostrarRegistrar && (
            <div className="border-t border-gray-100">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleRegistrar(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-purple-700 hover:bg-purple-50 font-medium transition-colors"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                Registrar <span className="font-semibold">"{value.trim()}"</span> como nuevo insumo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}