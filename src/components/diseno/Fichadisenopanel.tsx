import { useState, useEffect } from "react";
import {
  getFicha,
  crearFicha,
  verPdfFicha,
  descargarPdfFicha,
  getCambiosProducto,
  refrescarFicha,
  type FichaDiseno,
  type CambioSnapshot,
} from "../../services/diseno/fichaService";
import { usePermisos } from "../../hooks/usePermiso";
import { showAlert } from "../CustomAlert";
import Modal from "../Modal";
import EditarFicha from "./Editarficha";
import PanelAuditoria from "../auditoria/PanelAuditoria";
import BotonAuditoria from "../auditoria/BotonAuditoria";

interface Props {
  idorden_diseno: number;
  onCambio?: () => void;
}

const fmtFecha = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

export default function FichaDisenoPanel({ idorden_diseno, onCambio }: Props) {
  const { puedeEditarDiseno } = usePermisos({
    puedeEditarDiseno: "Editar Diseño",
  });

  const [ficha, setFicha] = useState<FichaDiseno | null>(null);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [imagenActiva, setImagenActiva] = useState<number | null>(null);
  const [pdfOcupado, setPdfOcupado] = useState<"ver" | "descargar" | null>(null);
  const [cambios, setCambios] = useState<CambioSnapshot[]>([]);
  const [verCambios, setVerCambios] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  // Compara el snapshot contra el producto tal como está hoy.
  // Silencioso a propósito: si falla, la ficha se usa igual.
  const revisarCambios = async (id: number) => {
    try {
      const r = await getCambiosProducto(id);
      setCambios(r.cambios);
    } catch {
      setCambios([]);
    }
  };

  const handleRefrescar = async () => {
    if (!ficha) return;
    setRefrescando(true);
    try {
      const r = await refrescarFicha(ficha.idficha);
      setFicha(r.ficha);
      setCambios([]);
      setVerCambios(false);
      onCambio?.();
    } catch (error: any) {
      showAlert(error.response?.data?.error || "No se pudo actualizar la ficha");
    } finally {
      setRefrescando(false);
    }
  };

  // El PDF se pide con axios y no con un enlace directo, para que
  // viaje el token. Solo se llama cuando ya hay ficha cargada.
  const handlePdf = async (accion: "ver" | "descargar") => {
    if (!ficha) return;
    setPdfOcupado(accion);
    try {
      if (accion === "ver") await verPdfFicha(ficha.idficha);
      else await descargarPdfFicha(ficha.idficha);
    } catch (error: any) {
      showAlert(error.response?.data?.error || "No se pudo generar el PDF");
    } finally {
      setPdfOcupado(null);
    }
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const f = await getFicha(idorden_diseno);
      setFicha(f);
      if (f) revisarCambios(f.idficha);
      setImagenActiva(
        f?.imagenes.find((i) => i.es_principal)?.idficha_imagen ??
          f?.imagenes[0]?.idficha_imagen ??
          null
      );
    } catch {
      setFicha(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [idorden_diseno]);

  const handleCrear = async () => {
    setCreando(true);
    try {
      const nueva = await crearFicha(idorden_diseno);
      setFicha(nueva);
      setImagenActiva(nueva.imagenes[0]?.idficha_imagen ?? null);
      setEditando(true);
      onCambio?.();
    } catch (error: any) {
      showAlert(error.response?.data?.error || "Error al crear la ficha");
    } finally {
      setCreando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Sin ficha ──────────────────────────────────────────
  if (!ficha) {
    return (
      <div className="text-center py-10 px-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900">Aún no hay boceto de diseño</p>
        <p className="text-xs text-gray-500 mt-1 mb-4 max-w-sm mx-auto">
          Es el primer paso: recoge lo que pidió el cliente antes de sacar la
          primera versión.
        </p>
        {puedeEditarDiseno && (
          <button
            onClick={handleCrear}
            disabled={creando}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {creando ? "Creando..." : "Crear boceto"}
          </button>
        )}
      </div>
    );
  }

  const imagen = ficha.imagenes.find((i) => i.idficha_imagen === imagenActiva);
  const acabados = ficha.detalles.filter((d) => d.tipo_elemento === "acabado");
  const redes = ficha.detalles.filter((d) => d.tipo_elemento === "red_social");

  const numeroDe = (d: any) => ficha.detalles.indexOf(d) + 1;

  const zonaDe = (d: any) => {
    const u = d.ubicaciones?.[0];
    if (!u) return "—";
    if (u.zona === "personalizado") return u.descripcion_libre || "personalizado";
    return u.zona || "—";
  };

  const tienePin = (d: any) =>
    d.ubicaciones?.some((u: any) => u.pin_x !== null && u.pin_y !== null);

  return (
    <div className="space-y-4">

      {/* Aviso de producto modificado */}
      {cambios.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800">
                El producto cambió desde que se creó esta ficha
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {cambios.length} campo(s) distinto(s). Los acabados, pines y
                comentarios no se tocan al actualizar.
              </p>

              {verCambios && (
                <div className="mt-2 space-y-1">
                  {cambios.map((c) => (
                    <div
                      key={c.campo}
                      className="text-xs bg-white rounded-lg px-2 py-1 border border-amber-100"
                    >
                      <span className="text-gray-500 capitalize">
                        {c.campo.replace(/_/g, " ")}:
                      </span>{" "}
                      <span className="line-through text-gray-400">
                        {c.antes ?? "vacío"}
                      </span>{" "}
                      <span className="text-gray-900">→ {c.ahora ?? "vacío"}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setVerCambios(!verCambios)}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                >
                  {verCambios ? "Ocultar" : "Ver diferencias"}
                </button>
                {puedeEditarDiseno && (
                  <button
                    onClick={handleRefrescar}
                    disabled={refrescando}
                    className="text-xs font-semibold px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                  >
                    {refrescando ? "Actualizando..." : "Actualizar ficha"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-gray-900">
            {ficha.no_orden_diseno ?? `Ficha #${ficha.idficha}`} · v{ficha.version}
          </p>
          <p className="text-xs text-gray-500">
            Compromiso {fmtFecha(ficha.compromiso_entrega)} · Conclusión{" "}
            {fmtFecha(ficha.fecha_conclusion)}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              ficha.estado === "aprobada"
                ? "bg-green-100 text-green-800"
                : ficha.estado === "publicada"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {ficha.estado}
          </span>

          <button
            onClick={() => handlePdf("ver")}
            disabled={pdfOcupado !== null}
            className="px-3 py-1 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {pdfOcupado === "ver" ? "Abriendo..." : "Ver PDF"}
          </button>

          <button
            onClick={() => handlePdf("descargar")}
            disabled={pdfOcupado !== null}
            className="px-3 py-1 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {pdfOcupado === "descargar" ? "Bajando..." : "Descargar"}
          </button>

          {puedeEditarDiseno && (
            <button
              onClick={() => setEditando(true)}
              className="px-3 py-1 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Editar
            </button>
          )}
        </div>
      </div>

      <PanelAuditoria
        tabla="orden_diseno_ficha"
        id={ficha.idficha}
        titulo="Auditoría de la ficha de diseño"
        limite={25}
      />

      {/* Especificación */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(ficha.especificacion ?? {}).map(([k, v]) => (
          <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-[11px] text-gray-400 capitalize">
              {k.replace(/_/g, " ")}
            </div>
            <div className="text-sm text-gray-900">
              {v === null || v === "" ? "—" : String(v)}
            </div>
          </div>
        ))}
      </div>

      {/* Pantones */}
      {ficha.pantones.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {ficha.pantones.map((p) => (
            <span
              key={p.idficha_pantone}
              className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700"
            >
              <span
                className="w-3 h-3 rounded-sm border border-gray-300"
                style={{ background: p.hex_referencia ?? "#ccc" }}
              />
              {p.codigo}
              {p.cara && <span className="text-gray-400">({p.cara})</span>}
              <BotonAuditoria
                tabla="ficha_pantone"
                id={p.idficha_pantone}
                etiqueta={`Historial del Pantone ${p.codigo}`}
              />
            </span>
          ))}
        </div>
      )}

      {/* Imagen con pines */}
      {imagen?.url && (
        <div>
          {ficha.imagenes.length > 1 && (
            <div className="flex gap-1 mb-2 flex-wrap">
              {ficha.imagenes.map((img) => (
                <button
                  key={img.idficha_imagen}
                  onClick={() => setImagenActiva(img.idficha_imagen)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    imagenActiva === img.idficha_imagen
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {img.vista}
                </button>
              ))}
            </div>
          )}
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-w-xs mx-auto">
            <img src={imagen.url} alt={imagen.vista} className="w-full block" />
            {ficha.detalles.map((d, i) =>
              d.ubicaciones.map((u, j) =>
                u.imagen_id === imagenActiva && u.pin_x !== null && u.pin_y !== null ? (
    <div
                    key={`${i}-${j}`}
                    style={{ left: `${u.pin_x}%`, top: `${u.pin_y}%` }}
                    title={d.nombre}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center border-2 border-white ${
                      d.tipo_elemento === "red_social" ? "bg-purple-600" : "bg-blue-600"
                    }`}
      >
                    {i + 1}
                  </div>
                ) : null
              )
            )}
          </div>
        </div>
      )}

      {/* Acabados */}
      {acabados.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Acabados
          </p>
          <div className="divide-y divide-gray-100">
            {acabados.map((d, i) => (
              <div key={i} className="flex items-start gap-2 py-2">
                <span
                  className={`w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    tienePin(d) ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  {numeroDe(d)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{d.nombre}</p>
                  {d.detalle && <p className="text-xs text-gray-500">{d.detalle}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 capitalize">
                  {zonaDe(d)}
                </span>
                <BotonAuditoria
                  tabla="ficha_detalle"
                  id={d.idficha_detalle}
                  etiqueta={`Historial del acabado ${d.nombre}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redes */}
      {redes.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Redes sociales
          </p>
          <div className="divide-y divide-gray-100">
            {redes.map((d, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <span
                  className={`w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
                    tienePin(d) ? "bg-purple-600" : "bg-gray-300"
                  }`}
                >
                  {numeroDe(d)}
                </span>
                <p className="text-sm text-gray-900 flex-1 min-w-0 truncate">
                  {d.nombre} {d.detalle}
                </p>
                <span className="text-xs text-gray-400 flex-shrink-0 capitalize">
                  {zonaDe(d)}
                </span>
                <BotonAuditoria
                  tabla="ficha_detalle"
                  id={d.idficha_detalle}
                  etiqueta={`Historial de ${d.nombre}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comentarios */}
      {ficha.comentarios && (
        <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <p className="text-xs text-gray-400 mb-0.5">Comentarios</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {ficha.comentarios}
          </p>
        </div>
      )}

      {/* Modal de edición */}
      {editando && (
        <Modal
          isOpen={editando}
          onClose={() => setEditando(false)}
          title={`Editar ficha · ${ficha.no_orden_diseno ?? ficha.idficha}`}
        >
          <EditarFicha
            ficha={ficha}
            onGuardado={(actualizada) => {
              setFicha(actualizada);
              setEditando(false);
              onCambio?.();
            }}
            onCancel={() => setEditando(false)}
          />
        </Modal>
      )}
    </div>
  );
}