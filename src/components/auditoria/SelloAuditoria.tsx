import type { SelloAutoria } from "../../services/auditoriaService";
import { fmtFechaHora, nombreUsuario } from "./auditoriaFormato";

interface Props {
  sello: SelloAutoria;
  variante?: "linea" | "bloque";
  className?: string;
}

export default function SelloAuditoria({
  sello,
  variante = "bloque",
  className = "",
}: Props) {
  const filas = [
    { etiqueta: "Creado por", usuario: sello.creadoPor, fecha: sello.createdAt, mostrar: true },
    {
      etiqueta: "Última edición",
      usuario: sello.actualizadoPor,
      fecha: sello.updatedAt,
      mostrar: Boolean(sello.updatedAt || sello.actualizadoPor),
    },
    {
      etiqueta: "Eliminado por",
      usuario: sello.eliminadoPor,
      fecha: sello.eliminadoAt,
      mostrar: Boolean(sello.eliminadoAt),
    },
  ].filter((fila) => fila.mostrar);

  if (variante === "linea") {
    return (
      <div className={`flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 ${className}`}>
        {filas.map((fila) => (
          <span key={fila.etiqueta}>
            <span className="text-gray-400">{fila.etiqueta}:</span>{" "}
            {nombreUsuario(fila.usuario)}
            {fila.fecha ? ` · ${fmtFechaHora(fila.fecha)}` : ""}
          </span>
        ))}
      </div>
    );
  }

  return (
    <dl className={`grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 ${className}`}>
      {filas.map((fila) => (
        <div key={fila.etiqueta}>
          <dt className="text-gray-400">{fila.etiqueta}</dt>
          <dd className="font-medium text-gray-700">{nombreUsuario(fila.usuario)}</dd>
          <dd className="text-gray-500">{fmtFechaHora(fila.fecha)}</dd>
        </div>
      ))}
    </dl>
  );
}
