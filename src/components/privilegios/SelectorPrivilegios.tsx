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

  // Árbol de 2 niveles: cada pantalla con sus subpantallas en orden. Antes
  // se ordenaba por id de padre, lo que mandaba TODAS las subpantallas al
  // final, separadas de la suya (con el catálogo por pantallas eso dejaba
  // "Plástico" y "Papel" sueltos, sin decir de qué pantalla eran).
  const arbolModulos = useMemo(() => {
    const padres = modulos
      .filter(m => m.idmodulo_padre == null)
      .sort((a, b) => a.orden - b.orden);
    return padres.map(padre => ({
      padre,
      hijos: modulos
        .filter(m => m.idmodulo_padre === padre.idmodulo)
        .sort((a, b) => a.orden - b.orden),
    }));
  }, [modulos]);

  const termino = normalizarTexto(busqueda);

  const privilegiosFiltrados = useMemo(() => {
    // Los privilegios inactivos no se ofrecen para asignar: son los que no
    // tienen pantalla o quedaron sin uso. Se reactivan desde
    // Roles > Privilegios, que sí los sigue listando.
    const activos = privilegios.filter(p => p.activo !== false);
    if (!termino) return activos;
    return activos.filter(p =>
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

  // ── Seleccionar todo ───────────────────────────────────────────────────
  // Los que vienen en la base del rol no se tocan (no son editables), así
  // que no cuentan ni para marcar ni para desmarcar.
  const idsAsignables = (items: Privilegio[]) =>
    items.map(p => p.idprivilegios).filter(id => !bloqueados.includes(id));

  const estadoGrupo = (items: Privilegio[]) => {
    const ids = idsAsignables(items);
    const marcados = ids.filter(id => seleccionados.includes(id)).length;
    return {
      ids,
      todos: ids.length > 0 && marcados === ids.length,
      algunos: marcados > 0 && marcados < ids.length,
    };
  };

  // Al desmarcar solo se quitan los ids de ESTE grupo: `seleccionados` puede
  // traer privilegios que no se están dibujando (inactivos que el usuario ya
  // tenía asignados de antes), y esos no se deben perder por un "quitar
  // todo". Mismo criterio que el resto del selector.
  const alternarGrupo = (items: Privilegio[]) => {
    if (deshabilitado) return;
    const { ids, todos } = estadoGrupo(items);
    if (ids.length === 0) return;
    onChange(
      todos
        ? seleccionados.filter(id => !ids.includes(id))
        : [...new Set([...seleccionados, ...ids])]
    );
  };

  // Casilla de 3 estados (marcada / a medias / vacía). `indeterminate` solo
  // existe en el DOM, no como atributo de React -> se pone por ref.
  //
  // Es una función que devuelve JSX, NO un componente declarado aquí dentro:
  // si se declara y se usa como <CasillaGrupo/>, React lo ve como un tipo
  // nuevo en cada render y lo desmonta/remonta cada vez (pierde foco y
  // rehace el ref sin necesidad).
  const casillaGrupo = (items: Privilegio[], titulo: string) => {
    const { ids, todos, algunos } = estadoGrupo(items);
    if (ids.length === 0) return null;
    return (
      <input
        type="checkbox"
        checked={todos}
        ref={el => { if (el) el.indeterminate = algunos; }}
        onChange={() => alternarGrupo(items)}
        disabled={deshabilitado}
        title={titulo}
        aria-label={titulo}
        className="w-4 h-4 text-blue-600 rounded shrink-0 disabled:opacity-50"
      />
    );
  };

  // Una sola definición de la fila, para que la pantalla y sus subpantallas
  // se vean idénticas (antes estaba escrita en línea, en un solo lugar).
  const renderPrivilegio = (privilegio: Privilegio) => {
    const esBloqueado = bloqueados.includes(privilegio.idprivilegios);
    const marcado = esBloqueado || seleccionados.includes(privilegio.idprivilegios);
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
          </span>
          {privilegio.descripcion && (
            <span className="block text-xs text-gray-500">{privilegio.descripcion}</span>
          )}
        </span>
      </label>
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
        {arbolModulos.map(({ padre, hijos }) => {
          const itemsPadre = grupos.get(padre.idmodulo) || [];
          const gruposHijos = hijos
            .map(hijo => ({ hijo, items: grupos.get(hijo.idmodulo) || [] }))
            .filter(g => g.items.length > 0);

          // Una pantalla puede no tener privilegios propios y sí en sus
          // subpantallas (ej. "Dar alta productos"): en ese caso la cabecera
          // sigue mostrándose como grupo, no se esconde.
          const todos = [...itemsPadre, ...gruposHijos.flatMap(g => g.items)];
          if (todos.length === 0) return null;

          const expandido = termino.length > 0 || !colapsados.has(padre.idmodulo);
          const marcadosEnPantalla = todos.filter(
            p => seleccionados.includes(p.idprivilegios) || bloqueados.includes(p.idprivilegios)
          ).length;

          return (
            <div key={padre.idmodulo} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* La casilla va FUERA del botón de colapsar: un <input> dentro
                  de un <button> es HTML inválido y el clic se pelea entre los
                  dos. Marcar toda la pantalla incluye sus subpantallas. */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                {casillaGrupo(todos, `Seleccionar todo: ${padre.nombre}`)}
                <button
                  type="button"
                  onClick={() => toggleModulo(padre.idmodulo)}
                  className="flex-1 flex items-center justify-between text-left hover:opacity-70"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    {padre.icono && <span>{padre.icono}</span>}
                    {padre.nombre}
                    {marcadosEnPantalla > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                        {marcadosEnPantalla}
                      </span>
                    )}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandido ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {expandido && (
                <div>
                  {itemsPadre.length > 0 && (
                    <div className="divide-y divide-gray-100">
                      {itemsPadre.map(renderPrivilegio)}
                    </div>
                  )}
                  {gruposHijos.map(({ hijo, items }) => (
                    <div key={hijo.idmodulo}>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/70 border-t border-gray-200">
                        {casillaGrupo(items, `Seleccionar todo: ${hijo.nombre}`)}
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          {hijo.icono && <span className="mr-1">{hijo.icono}</span>}
                          {hijo.nombre}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100 pl-3">
                        {items.map(renderPrivilegio)}
                      </div>
                    </div>
                  ))}
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
