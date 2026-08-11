import { useAuditoria } from "../../hooks/useAuditoria";
import SelloAuditoria from "./SelloAuditoria";
import { useAuth } from "../../context/AuthContext";
import { puedeVerAuditoriaUsuario } from "../../utils/permisosUsuario";
import {
  colorAccion,
  expandirCambios,
  fmtFechaHora,
  formatearValor,
  nombreUsuario,
  textoAccion,
} from "./auditoriaFormato";

interface Props {
  tabla: string;
  id: number | null | undefined;
  titulo?: string;
  activo?: boolean;
  compacto?: boolean;
  limite?: number;
  className?: string;
}

export default function PanelAuditoria({
  tabla,
  id,
  titulo,
  activo = true,
  compacto = false,
  limite = 50,
  className = "",
}: Props) {
  const { user } = useAuth();
  const puedeVerAuditoria = puedeVerAuditoriaUsuario(user);
  const { auditoria, cargando, error } = useAuditoria(
    tabla,
    id,
    activo && puedeVerAuditoria,
    limite
  );

  if (!puedeVerAuditoria || !id) return null;
  if (cargando) return <div className={`py-3 text-xs text-gray-400 ${className}`}>Cargando historial…</div>;
  if (error) return <div className={`py-3 text-xs text-red-600 ${className}`}>{error}</div>;
  if (!auditoria) return null;

  return (
    <section className={className} aria-label={titulo ?? `Historial de ${auditoria.etiqueta}`}>
      {!compacto && (
        <h4 className="mb-2 text-sm font-semibold text-gray-700">
          {titulo ?? `Historial · ${auditoria.etiqueta}`}
        </h4>
      )}
      <div className={`rounded-lg border border-gray-200 bg-gray-50 ${compacto ? "p-2.5" : "p-3"}`}>
        <SelloAuditoria sello={auditoria.sello} />
      </div>
      {auditoria.eventos.length === 0 ? (
        <p className="mt-3 text-xs text-gray-400">Todavía no hay cambios registrados.</p>
      ) : (
        <ol className={`mt-3 space-y-2 ${compacto ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
          {auditoria.eventos.map((evento) => {
            // Los campos jsonb se abren en un renglón por clave
            // modificada, en vez de volcar el objeto completo.
            const filas = expandirCambios(evento.cambios);

            return (
              <li key={evento.id} className="border-l-2 border-gray-200 py-0.5 pl-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${colorAccion(evento.accion)}`}>
                    {textoAccion(evento.accion)}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{nombreUsuario(evento.usuario)}</span>
                  <span className="text-xs text-gray-400">{fmtFechaHora(evento.fecha)}</span>
                </div>

                {filas.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {filas.map((cambio) =>
                      cambio.soloTitulo ? (
                        <li
                          key={cambio.clave}
                          className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
                        >
                          {cambio.etiqueta}
                        </li>
                      ) : (
                        <li
                          key={cambio.clave}
                          className={`text-xs text-gray-600 ${cambio.nivel > 0 ? "pl-3" : ""}`}
                        >
                          <span className="text-gray-400">{cambio.etiqueta}:</span>{" "}
                          <span className="text-gray-400 line-through">{formatearValor(cambio.antes)}</span>{" "}
                          <span aria-hidden="true">→</span>{" "}
                          <span className="font-medium text-gray-800">{formatearValor(cambio.despues)}</span>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
