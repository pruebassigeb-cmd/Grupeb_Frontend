import { useMemo, useState } from "react";
import type { Privilegio, PrivilegioModulo } from "../../types/privilegio.types";

interface SelectorPrivilegiosProps {
  privilegios: Privilegio[];
  modulos: PrivilegioModulo[];
  // Ids marcados y editables (checkbox normal).
  seleccionados: number[];
  // Ids marcados pero NO editables — se muestran con insignia y candado.
  // Ej.: la base del rol dentro del formulario de usuario.
  bloqueados?: number[];
  onChange: (ids: number[]) => void;
  // Deshabilita el selector completo (ej. rol con acceso total).
  deshabilitado?: boolean;
  etiquetaBloqueado?: string;
}

const normalizarTexto = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

export default function SelectorPrivilegios({
  privilegios,
  modulos,
  seleccionados,
  bloqueados = [],
  onChange,
  deshabilitado = false,
  etiquetaBloqueado = "Base del rol",
}: SelectorPrivilegiosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [colapsados, setColapsados] = useState<Set<number>>(new Set());

  const modulosPorId = useMemo(
    () => new Map(modulos.map(m => [m.idmodulo, m])),
    [modulos]
  );

  const modulosOrdenados = useMemo(
    () =>
      [...modulos].sort((a, b) => {
        const padreA = a.idmodulo_padre ?? 0;
        const padreB = b.idmodulo_padre ?? 0;
        if (padreA !== padreB) return padreA - padreB;
        return a.orden - b.orden;
      }),
    [modulos]
  );

  const termino = normalizarTexto(busqueda);

  const privilegiosFiltrados = useMemo(() => {
    if (!termino) return privilegios;
    return privilegios.filter(p =>
      normalizarTexto(p.privilegio).includes(termino) ||
      normalizarTexto(p.descripcion || "").includes(termino) ||
      normalizarTexto(p.clave || "").includes(termino)
    );
  }, [privilegios, termino]);

  const grupos = useMemo(() => {
    const mapa = new Map<number, Privilegio[]>();
    for (const p of privilegiosFiltrados) {
      const key = p.idmodulo ?? 0;
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(p);
    }
    return mapa;
  }, [privilegiosFiltrados]);

  const toggleModulo = (idmodulo: number) => {
    setColapsados(prev => {
      const next = new Set(prev);
      if (next.has(idmodulo)) next.delete(idmodulo);
      else next.add(idmodulo);
      return next;
    });
  };

  const handleTogglePrivilegio = (id: number) => {
    if (deshabilitado || bloqueados.includes(id)) return;
    onChange(
      seleccionados.includes(id)
        ? seleccionados.filter(p => p !== id)
        : [...seleccionados, id]
    );
  };

  return (
    <div>
      <div className="relative mb-3">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar privilegio por nombre, descripción o clave..."
          disabled={deshabilitado}
          className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white
                     placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        />
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {modulosOrdenados.map(modulo => {
          const items = grupos.get(modulo.idmodulo) || [];
          if (items.length === 0) return null;
          const expandido = termino.length > 0 || !colapsados.has(modulo.idmodulo);
          const seleccionadosEnModulo = items.filter(
            p => seleccionados.includes(p.idprivilegios) || bloqueados.includes(p.idprivilegios)
          ).length;

          return (
            <div key={modulo.idmodulo} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleModulo(modulo.idmodulo)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  {modulo.icono && <span>{modulo.icono}</span>}
                  {modulo.nombre}
                  {seleccionadosEnModulo > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                      {seleccionadosEnModulo}
                    </span>
                  )}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandido ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandido && (
                <div className="divide-y divide-gray-100">
                  {items.map(privilegio => {
                    const esBloqueado = bloqueados.includes(privilegio.idprivilegios);
                    const marcado = esBloqueado || seleccionados.includes(privilegio.idprivilegios);
                    const inactivo = privilegio.activo === false;
                    const bloqueadoUI = deshabilitado || esBloqueado;
                    return (
                      <label key={privilegio.idprivilegios}
                        className={`flex items-center px-3 py-2 ${bloqueadoUI ? "bg-gray-50 opacity-80 cursor-not-allowed" : "hover:bg-blue-50 cursor-pointer"}`}>
                        <input type="checkbox"
                          checked={marcado}
                          onChange={() => handleTogglePrivilegio(privilegio.idprivilegios)}
                          disabled={bloqueadoUI}
                          className="w-4 h-4 text-blue-600 rounded" />
                        <span className="ml-3 flex-1">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-700">{privilegio.privilegio}</span>
                            {esBloqueado && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 rounded">
                                {etiquetaBloqueado}
                              </span>
                            )}
                            {inactivo && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-200 text-gray-600 rounded">
                                Inactivo
                              </span>
                            )}
                          </span>
                          {privilegio.descripcion && (
                            <span className="block text-xs text-gray-500">{privilegio.descripcion}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {privilegiosFiltrados.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Ningún privilegio coincide con "{busqueda}"
          </p>
        )}
      </div>
    </div>
  );
}
