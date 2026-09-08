import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import FormularioCotizacion from "../components/plastico/FormularioSolicitud";
import EditarCotizacion from "../components/plastico/EditarCotizacion";
import { useState, useEffect } from "react";
import { getCatalogosPlastico } from "../services/plastico/productosPlasticoService";
import {
  getCotizaciones,
  crearCotizacion,
  eliminarCotizacion,
} from "../services/cotizacionesService";
import { generarPdfCotizacion } from "../utils/generarPdfCotizacion";
import { generarPdfCotizacionLibre, type ItemCotizacionLibrePdf } from "../utils/generarPdfCotizacionLibre";
import { useAuth } from "../context/AuthContext";
import { getCotizacionesLibres, crearCotizacionLibre, getCotizacionLibreDetalle, eliminarCotizacionLibre } from "../services/cotizacionLibreService";
import type { CotizacionLibreResumen, ItemCotizacionLibre, CotizacionLibreDetalle } from "../types/cotizacion-libre.types";
import ModalEditarCotizacionLibre from "../components/libre/ModalEditarCotizacionLibre";
import { preguntarGuardarS3 } from "../services/pdfS3.service";
import type { CatalogosPlastico } from "../types/plastico/productos-plastico.types";
import type { Cotizacion } from "../types/cotizaciones.types";
import { showAlert } from '../components/CustomAlert';
import { showConfirm } from '../components/CustomConfirm';
import { OperacionEncoladaError } from "../offline/outbox";
import { useNavigate } from "react-router-dom";
import BotonAuditoria from "../components/auditoria/BotonAuditoria";
import AuditoriaDesplegable from "../components/auditoria/AuditoriaDesplegable";
import api from "../services/api";

import { fmtFecha } from "../utils/fecha";
// Convierte un Blob (el PDF ya generado en el navegador) a base64 puro,
// listo para mandarlo en el body JSON de /correos/documento.
function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}




const ITEMS_POR_PAGINA = 7;


// Identifica si una línea es de papel (viene de getCotizaciones / del form)
const esLineaPapel = (p: any): boolean =>
  p?.tipo_material === "papel" ||
  p?.tipoCotizacion === "papel" ||
  p?.idproducto_papel != null ||
  p?.producto_papel_idproducto_papel != null;

export default function Cotizaciones() {
  const { user } = useAuth();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const navigate = useNavigate();
  const [loadingCots, setLoadingCots] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [cotizacionEditando, setCotizacionEditando] = useState<Cotizacion | null>(null);
  const [catalogos, setCatalogos] = useState<CatalogosPlastico>({
    tiposProducto: [], materiales: [], calibres: [],
  });
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState("");
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtroMaterial, setFiltroMaterial] = useState<"todos" | "plastico" | "papel" | "libre">("todos");

  // ── Envío por correo ──────────────────────────────────────────────────
  const [modalCorreoOpen, setModalCorreoOpen] = useState(false);
  const [modalCorreoLibreOpen, setModalCorreoLibreOpen] = useState(false);
  const [libreParaCorreo, setLibreParaCorreo] = useState<CotizacionLibreResumen | null>(null);
  const [correoLibreDestino, setCorreoLibreDestino] = useState("");
  const [enviandoCorreoLibre, setEnviandoCorreoLibre] = useState(false);
  const [errorCorreoLibre, setErrorCorreoLibre] = useState<string | null>(null);
  const [folioEditandoLibre, setFolioEditandoLibre] = useState<string | null>(null);
  const [cotizacionParaCorreo, setCotizacionParaCorreo] = useState<Cotizacion | null>(null);
  const [correoDestino, setCorreoDestino] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);

  useEffect(() => { cargarCatalogos(); cargarCotizaciones(); cargarCotizacionesLibres(); }, []);
  useEffect(() => { setPaginaActual(1); }, [busqueda]);

  const toggleExpandida = (folio: string) => {
    setExpandidas(prev => {
      const s = new Set(prev);
      s.has(folio) ? s.delete(folio) : s.add(folio);
      return s;
    });
  };

  // ── Expandir Cotización Libre ──────────────────────────────────────────
  const [expandidasLibres, setExpandidasLibres] = useState<Set<string>>(new Set());
  const [detallesLibres, setDetallesLibres] = useState<Record<string, CotizacionLibreDetalle>>({});
  const [cargandoDetalleLibre, setCargandoDetalleLibre] = useState<string | null>(null);

  const toggleExpandidaLibre = async (folio: string) => {
    setExpandidasLibres((prev) => {
      const s = new Set(prev);
      s.has(folio) ? s.delete(folio) : s.add(folio);
      return s;
    });
    if (!detallesLibres[folio]) {
      setCargandoDetalleLibre(folio);
      try {
        const detalle = await getCotizacionLibreDetalle(folio);
        setDetallesLibres((prev) => ({ ...prev, [folio]: detalle }));
      } catch (e: any) {
        console.error("❌ Error al cargar detalle de cotización libre:", e);
      } finally {
        setCargandoDetalleLibre(null);
      }
    }
  };

  const cargarCatalogos = async () => {
    try {
      setCargandoCatalogos(true); setErrorCatalogos("");
      setCatalogos(await getCatalogosPlastico());
    } catch (e: any) {
      setErrorCatalogos(e.response?.data?.error || "Error al cargar catálogos");
    } finally { setCargandoCatalogos(false); }
  };

  // El folio ya no es un orden confiable: los nuevos usan "CO26110" y los
  // viejos "COT26017" (distinto prefijo de letras) — ordenar por el texto
  // completo del folio deja las cotizaciones nuevas por debajo de las viejas
  // alfabéticamente. Se ordena por el número real (ignorando las letras),
  // de mayor a menor, para que lo más reciente quede siempre arriba.
  const numeroFolio = (folio: string): number => {
    const m = folio.match(/(\d+)$/);
    return m ? Number(m[1]) : 0;
  };

  const cargarCotizaciones = async () => {
    try {
      setLoadingCots(true);
      const datos = await getCotizaciones();
      datos.sort((a, b) => numeroFolio(b.no_cotizacion) - numeroFolio(a.no_cotizacion));
      setCotizaciones(datos);
    } catch (e: any) { console.error("❌", e); }
    finally { setLoadingCots(false); }
  };

  // ── Cotizaciones Libres ──────────────────────────────────────────────
  // Se traen aparte (endpoint propio, GET /cotizaciones-libres) en vez de
  // meterlas en el query gigante de getCotizaciones — ese query ya tiene
  // demasiados JOIN como para arriesgarlo. Se mezclan solo para PINTAR la
  // tabla (ver TODO abajo); al hacer click en una fila libre hay que abrir
  // una vista de solo lectura distinta a `cotizacionEditando`, porque una
  // cotización libre no tiene estado_id, no se aprueba ni se convierte a
  // pedido igual que una normal.
  const [cotizacionesLibres, setCotizacionesLibres] = useState<CotizacionLibreResumen[]>([]);
  const cargarCotizacionesLibres = async () => {
    try {
      setCotizacionesLibres(await getCotizacionesLibres());
    } catch (e: any) { console.error("❌", e); }
  };
  // TODO: agregar cargarCotizacionesLibres() al useEffect inicial (junto a
  // cargarCatalogos()/cargarCotizaciones()), y construir un arreglo de
  // "filas para pintar" que combine `cotizaciones` + `cotizacionesLibres`
  // ordenado por fecha, con un chip 🆓 Libre (mismo estilo que el chip
  // ámbar de "📄 Papel") cuando la fila trae es_libre=true.

  const normalizar = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // ── Cotizaciones ya aprobadas ─────────────────────────────────────────
  // Aprobar una cotización la convierte en pedido (backend: estado='pedido'
  // + no_pedido asignado, ver cotizaciones.controller.ts). Ese es el
  // indicador — no hace falta ningún campo nuevo. Se ocultan de la vista
  // por default, pero el backend ya las sigue trayendo siempre (se quitó
  // el corte de 5 días de visible_hasta), así que el buscador las
  // encuentra sin límite de tiempo.
  const hayBusquedaActiva = busqueda.trim().length > 0;
  const esCotizacionAprobada = (c: Cotizacion) =>
    (c as any).tipo_documento === "pedido" || !!c.no_pedido;

  const cotizacionesFiltradas = cotizaciones.filter(c => {
    if (!hayBusquedaActiva && esCotizacionAprobada(c)) return false;

    if (busqueda) {
      const t = normalizar(busqueda);
      const coincideBusqueda =
        normalizar(c.cliente ?? "").includes(t) ||
        normalizar(c.empresa ?? "").includes(t) ||
        normalizar(c.correo ?? "").includes(t) ||
        normalizar(c.telefono ?? "").includes(t) ||
        normalizar(c.estado).includes(t) ||
        String(c.cliente_id ?? "").includes(busqueda.trim()) ||
        normalizar(c.impresion ?? "").includes(t) ||
        (c.no_cotizacion ?? "").toLowerCase().includes(t);
      if (!coincideBusqueda) return false;
    }

    if (filtroMaterial === "todos") return true;

    // Verificar si TODOS los productos de la cotización son del material filtrado
    // o si AL MENOS UNO coincide (usamos "al menos uno" para mixtas)
    return c.productos.some((p: any) => {
      if (filtroMaterial === "papel") return esLineaPapel(p);
      if (filtroMaterial === "plastico") return !esLineaPapel(p);
      return true;
    });
  });

  // Cotizaciones Libres — mismo buscador que las normales. Se combinan más
  // abajo con las normales solo para ordenarlas y paginarlas juntas por
  // fecha real de creación — cada una conserva su propia forma de pintarse.
  const cotizacionesLibresFiltradas = cotizacionesLibres.filter((c) => {
    if (!busqueda) return true;
    const t = normalizar(busqueda);
    return (
      normalizar(c.cliente ?? "").includes(t) ||
      normalizar(c.empresa ?? "").includes(t) ||
      c.folio.toLowerCase().includes(t)
    );
  });

  // Orden de creación real = número de folio (ver numeroFolio arriba): con
  // "COT26017" y "CO26110" mezclados, es la única forma confiable de saber
  // qué es más nuevo — ordenar por texto los separaría mal.
  type FilaTabla =
    | { tipo: "normal"; folio: string; data: Cotizacion }
    | { tipo: "libre"; folio: string; data: CotizacionLibreResumen };

  const filasTodas: FilaTabla[] = [
    ...cotizacionesFiltradas.map((c): FilaTabla => ({ tipo: "normal", folio: c.no_cotizacion, data: c })),
    // Las libres solo se mezclan en "Todos" — en Plástico/Papel no aplican,
    // y en la pestaña Libre ya se muestran aparte (ver más abajo).
    ...(filtroMaterial === "todos"
      ? cotizacionesLibresFiltradas.map((c): FilaTabla => ({ tipo: "libre", folio: c.folio, data: c }))
      : []),
  ].sort((a, b) => numeroFolio(b.folio) - numeroFolio(a.folio));

  const totalPaginas = Math.max(1, Math.ceil(filasTodas.length / ITEMS_POR_PAGINA));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const filaCombinadaPagina = filasTodas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  const irAPagina = (p: number) => setPaginaActual(Math.max(1, Math.min(p, totalPaginas)));

  // id/texto → lo que haya. Si solo hay id (se eligió de catálogo), por ahora
  // se muestra "código: N" — resolver el nombre real requiere JOIN contra el
  // catálogo correspondiente en el backend (getCotizacionLibrePorFolio),
  // que todavía no está hecho.
  const mostrarCampoLibre = (id?: number | null, texto?: string | null): string | null => {
    if (texto) return texto;
    if (id != null) return `código: ${id}`;
    return null;
  };

  const renderFilaLibre = (c: CotizacionLibreResumen) => {
    const expandida = expandidasLibres.has(c.folio);
    const detalle = detallesLibres[c.folio];
    return (
      <>
        <tr key={c.folio} className="hover:bg-purple-50/40">
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="font-semibold text-gray-900">{c.folio}</span>{" "}
            <span className="inline-flex items-center gap-1 ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
              🆓 Libre
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {new Date(c.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.empresa || c.cliente || "—"}</td>
          <td className="px-6 py-4 text-sm text-gray-600">
            <button onClick={() => toggleExpandidaLibre(c.folio)} className="flex items-center gap-2 group">
              <span className="font-medium text-gray-700 group-hover:text-purple-600">
                {c.total_productos} producto(s)
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandida ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
            ${c.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 capitalize">
              {c.estatus}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <button onClick={() => handleDescargarPdfLibre(c)} title="Descargar PDF"
                className="p-1.5 rounded-md text-green-600 hover:bg-green-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button onClick={() => handleAbrirModalCorreoLibre(c)} title="Enviar por correo"
                className="p-1.5 rounded-md text-purple-500 hover:bg-purple-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v5a3 3 0 0 0 6 0v-1a10 9 0 1 0-6 9" />
                </svg>
              </button>
              <button onClick={() => setFolioEditandoLibre(c.folio)} title="Editar"
                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => handleEliminarLibre(c)} title="Eliminar"
                className="p-1.5 rounded-md text-red-500 hover:bg-red-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
        {expandida && (
          <tr key={`det-${c.folio}`} className="bg-purple-50 border-t border-purple-100">
            <td colSpan={8} className="px-8 py-4">
              {cargandoDetalleLibre === c.folio ? (
                <p className="text-sm text-gray-500">Cargando detalle...</p>
              ) : !detalle ? (
                <p className="text-sm text-gray-500">No se pudo cargar el detalle.</p>
              ) : (
                <div className="space-y-3">
                  {detalle.comentarios && (
                    <p className="text-sm text-gray-600 italic bg-white rounded-lg px-4 py-2 border border-gray-100">
                      "{detalle.comentarios}"
                    </p>
                  )}
                  {detalle.items.map((it: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 bg-purple-100 text-purple-700">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{mostrarCampoLibre(it.producto_id, it.producto_texto) ?? "(sin nombre)"}</p>
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {it.tipo === "plastico" ? "🧴 Plástico" : it.tipo === "papel" ? "📄 Papel" : "🎁 Especial"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 space-x-3">
                          {it.medida_texto && <span>Medida: {it.medida_texto}</span>}
                          {mostrarCampoLibre(it.material_id, it.material_texto) && <span>Material: {mostrarCampoLibre(it.material_id, it.material_texto)}</span>}
                          {mostrarCampoLibre(it.calibre_id, it.calibre_texto) && <span>Calibre: {mostrarCampoLibre(it.calibre_id, it.calibre_texto)}</span>}
                          {mostrarCampoLibre(it.tintas_frente_id, it.tintas_frente_texto) && (
                            <span>Tintas{it.tipo !== "plastico" ? " frente" : ""}: {mostrarCampoLibre(it.tintas_frente_id, it.tintas_frente_texto)}</span>
                          )}
                          {it.pantones_texto && <span>Pantones: {it.pantones_texto}</span>}
                          {it.tipo === "plastico" && mostrarCampoLibre(it.caras_id, it.caras_texto) && (
                            <span>Caras: {mostrarCampoLibre(it.caras_id, it.caras_texto)}</span>
                          )}
                          {it.tipo !== "plastico" && mostrarCampoLibre(it.tintas_dentro_id, it.tintas_dentro_texto) && (
                            <span>Tintas dentro: {mostrarCampoLibre(it.tintas_dentro_id, it.tintas_dentro_texto)}</span>
                          )}
                          {it.pantones_dentro_texto && <span>Pantones dentro: {it.pantones_dentro_texto}</span>}
                          {mostrarCampoLibre(it.laminado_id, it.laminado_texto) && <span>Laminado: {mostrarCampoLibre(it.laminado_id, it.laminado_texto)}</span>}
                          {mostrarCampoLibre(it.hs_id, it.hs_texto) && <span>HS: {mostrarCampoLibre(it.hs_id, it.hs_texto)}</span>}
                          {mostrarCampoLibre(it.textura_id, it.textura_texto) && <span>Textura: {mostrarCampoLibre(it.textura_id, it.textura_texto)}</span>}
                          {mostrarCampoLibre(it.asa_id, it.asa_texto) && <span>Asa: {mostrarCampoLibre(it.asa_id, it.asa_texto)}</span>}
                          {mostrarCampoLibre(it.color_asa_id, it.color_asa_texto) && <span>Color de asa: {mostrarCampoLibre(it.color_asa_id, it.color_asa_texto)}</span>}
                          {mostrarCampoLibre(it.medida_troquel_id, it.medida_troquel_texto) && <span>Medida de troquel: {mostrarCampoLibre(it.medida_troquel_id, it.medida_troquel_texto)}</span>}
                          {mostrarCampoLibre(it.cinta_seguridad_id, it.cinta_seguridad_texto) && <span>Cinta de seguridad: {mostrarCampoLibre(it.cinta_seguridad_id, it.cinta_seguridad_texto)}</span>}
                          {it.perforacion_bool && <span>✔️ Perforación</span>}
                          {it.pigmentos_texto && <span>Pigmentos: {it.pigmentos_texto}</span>}
                          {it.alto_relieve_bool && <span>✨ Alto relieve</span>}
                          {it.uv_bool && <span>☀️ UV</span>}
                          {it.notas && <span>Notas: {it.notas}</span>}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-600 space-y-0.5">
                        {[1, 2, 3].map((n) => it[`cantidad_${n}`] && (
                          <p key={n}>{Number(it[`cantidad_${n}`]).toLocaleString("es-MX")} pz — ${Number(it[`precio_${n}`]).toFixed(2)}/pz</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </td>
          </tr>
        )}
      </>
    );
  };

  const resolverCalibre = (p: any): string => {
    const mat = (p.material || "").toUpperCase();
    const esBopp = mat.includes("BOPP") || mat.includes("CELOFAN") || mat.includes("CELOFÁN");
    if (esBopp) {
      const cb = p.calibre_bopp ? String(p.calibre_bopp).trim() : "";
      if (cb && cb !== "0") return cb;
    }
    const c = p.calibre ? String(p.calibre).trim() : "";
    if (c && c !== "0") return c;
    const cb2 = p.calibre_bopp ? String(p.calibre_bopp).trim() : "";
    return cb2 && cb2 !== "0" ? cb2 : "";
  };

  // Mapea una línea de PAPEL al shape que entiende el PDF (best-effort sobre los
  // campos existentes; los específicos de papel se acomodan donde calzan).
  // Mapea una línea de PAPEL al shape ProductoPdf (compatible con la plantilla).
  // Los atributos propios de papel se doblan en la observación, que el PDF ya pinta.
  const buildPapelPdf = (p: any) => {
    // ── Separar material y calibre desde grupo_descripcion ──
    // grupo_descripcion viene como "Couché 12pts + Cartulina 14pts"
    const grupDesc: string = p.grupo_descripcion ?? "";
    const partes = grupDesc.split(/\s*\+\s*/).map((s: string) => s.trim());
    const regexCalibre = /(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/gi;

    const materialStr = partes
      .map((parte: string) => parte.replace(regexCalibre, "").trim())
      .filter(Boolean)
      .join(" + ") || grupDesc;

    const calibreStr = partes
      .map((parte: string) => {
        const m = parte.match(/(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/i);
        return m ? m[1] : "";
      })
      .filter(Boolean)
      .join(" / ") || "";

    return {
      tipo_material: "papel",      // ← AGREGAR
      tipoCotizacion: "papel",
      nombre: p.nombre,
      material: materialStr,          // ← solo nombres: "Couché + Cartulina"
      calibre: calibreStr,            // ← solo calibres: "12pts / 14pts"
      grupo_descripcion: grupDesc,    // ← original por si el PDF lo necesita
      tintas: p.tintas ?? 0,
      tintasDentro: p.tintasDentro ?? 0,
      caras: p.caras ?? 0,
      medidasFormateadas: p.medida || "",
      medidas: {},
      bk: null,
      foil: p.foil_nombre ? true : null,
      foil_nombre: p.foil_nombre || null,
      laminado: p.laminado_nombre ? true : null,
      laminado_nombre: p.laminado_nombre || null,
      asa_suaje: p.asa_nombre || null,
      asa_nombre: p.asa_nombre || null,
      uvBr: p.uv ? true : null,
      alto_relieve: p.alto_relieve === true,
      metodo_hojeado: p.metodo_hojeado ?? null,
      lleva_armado: p.lleva_armado ?? true,
      maquinaria_seleccionada: p.maquinaria_seleccionada ?? {},
      textura_nombre: p.textura_nombre || null,
      pigmentos: null,
      pantones: p.pantones || null,
      pantonesDentro: p.pantonesDentro || null,
      observacion: p.observacion || null,
      descripcion: p.descripcion || null,
      perforacion: false,
      por_kilo: null,
      herramental_descripcion: p.herramental_descripcion ?? null,
      herramental_precio: p.herramental_precio != null ? Number(p.herramental_precio) : null,
      herramental_aprobado: p.herramental_aprobado ?? null,
      cargo_adicional_descripcion: p.cargo_adicional_descripcion ?? null,
      cargo_adicional_precio: p.cargo_adicional_precio != null ? Number(p.cargo_adicional_precio) : null,
      detalles: (p.detalles || []).map((d: any) => ({
        cantidad: d.cantidad,
        precio_total: d.precio_total,
        kilogramos: null,
        modo_cantidad: "unidad",
      })),
    };
  };

  const buildProductosPdf = (productos: any[]) =>
    productos.map((p: any) => {
      if (esLineaPapel(p)) return buildPapelPdf(p);
      return {
        nombre: p.nombre,
        material: p.material || "",
        calibre: resolverCalibre(p),
        tintas: p.tintas,
        caras: p.caras,
        medidasFormateadas: p.medidasFormateadas || "",
        medidas: p.medidas || {},
        bk: p.bk || null,
        foil: p.foil || null,
        laminado: p.laminado || null,
        uvBr: (p.uv_br ?? p.uvBr) || null,
        pigmentos: p.pigmentos || null,
        pantones: p.pantones || null,
        asa_suaje: p.asa_suaje || null,
        observacion: p.observacion || null,
        descripcion: p.descripcion || null,
        perforacion: p.perforacion ?? false,
        por_kilo: p.por_kilo || null,
        herramental_descripcion: p.herramental_descripcion ?? null,
        herramental_precio: p.herramental_precio != null ? Number(p.herramental_precio) : null,
        herramental_aprobado: p.herramental_aprobado ?? null,
        detalles: (p.detalles || []).map((d: any) => ({
          cantidad: d.cantidad,
          precio_total: d.precio_total,
          kilogramos: d.kilogramos ?? null,
          modo_cantidad: d.modo_cantidad || "unidad",
        })),
      };
    });

  // ItemCotizacionLibre (recién capturado en el formulario, con sub-objetos
  // {id, texto}) → shape plano, igual a las columnas reales de
  // cotizacion_libre_item — así el PDF usa un solo formato sin importar si
  // viene de una cotización recién creada o de una ya guardada (getCotizacionLibreDetalle).
  const aplanarItemLibre = (it: ItemCotizacionLibre): ItemCotizacionLibrePdf => ({
    tipo: it.tipo,
    producto_id: it.producto_id, producto_texto: it.producto_texto,
    medida_texto: it.medida_texto,
    material_id: it.material?.id, material_texto: it.material?.texto,
    calibre_id: it.calibre?.id, calibre_texto: it.calibre?.texto,
    tintas_frente_id: it.tintas_frente?.id, tintas_frente_texto: it.tintas_frente?.texto,
    tintas_dentro_id: it.tintas_dentro?.id, tintas_dentro_texto: it.tintas_dentro?.texto,
    pantones_texto: it.pantones_texto, pantones_dentro_texto: it.pantones_dentro_texto,
    laminado_id: it.laminado?.id, laminado_texto: it.laminado?.texto,
    hs_id: it.hs?.id, hs_texto: it.hs?.texto,
    alto_relieve_bool: it.alto_relieve?.bool ?? null,
    textura_id: it.textura?.id, textura_texto: it.textura?.texto,
    uv_bool: it.uv?.bool ?? null,
    asa_id: it.asa?.id, asa_texto: it.asa?.texto,
    color_asa_id: it.color_asa?.id, color_asa_texto: it.color_asa?.texto,
    medida_troquel_id: it.medida_troquel?.id, medida_troquel_texto: it.medida_troquel?.texto,
    cinta_seguridad_id: it.cinta_seguridad?.id, cinta_seguridad_texto: it.cinta_seguridad?.texto,
    perforacion_bool: it.perforacion ?? null,
    pigmentos_texto: it.pigmentos_texto,
    caras_id: it.caras?.id, caras_texto: it.caras?.texto,
    cantidad_1: it.cantidades?.[0], precio_1: it.precios?.[0],
    cantidad_2: it.cantidades?.[1], precio_2: it.precios?.[1],
    cantidad_3: it.cantidades?.[2], precio_3: it.precios?.[2],
    notas: it.notas,
  });

  // Cotización Libre: documento aparte. Al guardar, genera y descarga el PDF
  // "Propuesta Personalizada" de una vez — igual que el flujo normal.
  const handleGuardarLibre = async (datosHeader: any, renglones: ItemCotizacionLibre[]) => {
    setGuardando(true);
    try {
      const respuesta = await crearCotizacionLibre({
        clienteId: datosHeader?.clienteId ?? null,
        clienteTexto: datosHeader?.cliente ?? null,
        empresaTexto: datosHeader?.empresa ?? null,
        moneda: datosHeader?.moneda ?? "MXN",
        comentarios: datosHeader?.observaciones ?? null,
        items: renglones,
      });
      await cargarCotizacionesLibres();
      setModalOpen(false);

      try {
        await generarPdfCotizacionLibre({
          folio: respuesta.folio,
          fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }), // YYYY-MM-DD en hora de México
          cliente: datosHeader?.cliente ?? null,
          empresa: datosHeader?.empresa ?? null,
          asesor: user?.nombre || null, // aquí sí es el usuario logueado: se está creando ahora mismo, es el creador
          comentarios: datosHeader?.observaciones ?? null,
          moneda: datosHeader?.moneda ?? "MXN",
          items: renglones.map(aplanarItemLibre),
        }, true);
      } catch (pdfErr) { console.warn("⚠️ PDF libre:", pdfErr); }

      showAlert(`Cotización libre ${respuesta.folio} creada correctamente.`);
    } finally {
      setGuardando(false);
    }
  };

  // ── Descargar / reenviar PDF de una Cotización Libre ya guardada ────────
  // Reusa el caché de detallesLibres (llenado al expandir la fila) si ya
  // existe, para no pedirle al backend el mismo folio dos veces.
  const obtenerDetalleLibre = async (folio: string): Promise<CotizacionLibreDetalle> => {
    if (detallesLibres[folio]) return detallesLibres[folio];
    const detalle = await getCotizacionLibreDetalle(folio);
    setDetallesLibres((prev) => ({ ...prev, [folio]: detalle }));
    return detalle;
  };

  const handleDescargarPdfLibre = async (c: CotizacionLibreResumen) => {
    try {
      const detalle = await obtenerDetalleLibre(c.folio);
      const guardarS3 = await preguntarGuardarS3("cotización libre");
      await generarPdfCotizacionLibre({
        folio: detalle.folio,
        fecha: detalle.fecha,
        cliente: detalle.cliente_nombre ?? detalle.cliente_texto,
        empresa: detalle.cliente_empresa_real ?? detalle.empresa_texto,
        asesor: detalle.asesor_nombre ? `${detalle.asesor_nombre} ${detalle.asesor_apellido ?? ""}`.trim() : null, // quien la creó, no quien la descarga/reenvía
        comentarios: detalle.comentarios,
        moneda: detalle.moneda,
        items: detalle.items,
      }, guardarS3);
    } catch (e: any) {
      console.error("❌ Error al descargar PDF libre:", e);
      showAlert("No se pudo generar el PDF de esta cotización libre");
    }
  };

  const handleEliminarLibre = async (c: CotizacionLibreResumen) => {
    if (!await showConfirm(`¿Eliminar la cotización libre ${c.folio}? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarCotizacionLibre(c.folio);
      await cargarCotizacionesLibres();
      showAlert(`Cotización libre ${c.folio} eliminada.`);
    } catch (e: any) {
      console.error("❌ Error al eliminar cotización libre:", e);
      showAlert(e.response?.data?.error || "No se pudo eliminar la cotización libre");
    }
  };

  const handleAbrirModalCorreoLibre = (c: CotizacionLibreResumen) => {
    setLibreParaCorreo(c);
    setCorreoLibreDestino("");
    setErrorCorreoLibre(null);
    setModalCorreoLibreOpen(true);
  };

  const handleCerrarModalCorreoLibre = () => {
    if (enviandoCorreoLibre) return;
    setModalCorreoLibreOpen(false);
    setLibreParaCorreo(null);
    setCorreoLibreDestino("");
    setErrorCorreoLibre(null);
  };

  const handleConfirmarEnvioCorreoLibre = async () => {
    if (!libreParaCorreo) return;
    const correo = correoLibreDestino.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setErrorCorreoLibre("Ingresa un correo válido");
      return;
    }
    setEnviandoCorreoLibre(true);
    setErrorCorreoLibre(null);
    try {
      const detalle = await obtenerDetalleLibre(libreParaCorreo.folio);
      const blob = await generarPdfCotizacionLibre({
        folio: detalle.folio,
        fecha: detalle.fecha,
        cliente: detalle.cliente_nombre ?? detalle.cliente_texto,
        empresa: detalle.cliente_empresa_real ?? detalle.empresa_texto,
        asesor: detalle.asesor_nombre ? `${detalle.asesor_nombre} ${detalle.asesor_apellido ?? ""}`.trim() : null, // quien la creó, no quien la descarga/reenvía
        comentarios: detalle.comentarios,
        moneda: detalle.moneda,
        items: detalle.items,
      }, false, false);

      const pdfBase64 = await blobABase64(blob);
      await api.post("/correos/documento", {
        tipo: "cotizacion",
        folio: detalle.folio,
        cliente: detalle.cliente_nombre ?? detalle.cliente_texto ?? "",
        empresa: detalle.cliente_empresa_real ?? detalle.empresa_texto ?? null,
        destinatario: correo,
        pdfBase64,
        nombreArchivo: `PropuestaLibre_${detalle.folio}.pdf`,
      });

      showAlert("✅ Correo enviado correctamente");
      handleCerrarModalCorreoLibre();
    } catch (e: any) {
      console.error("❌ Error al enviar correo de libre:", e);
      setErrorCorreoLibre(e.response?.data?.error || "No se pudo enviar el correo");
    } finally {
      setEnviandoCorreoLibre(false);
    }
  };

  const handleSubmit = async (datos: any) => {
    setGuardando(true);
    try {
      const respuesta = await crearCotizacion(datos);
      await cargarCotizaciones();
      setModalOpen(false);

      const productosPdf = datos.productos.map((prod: any) => {
        // ── PAPEL: detalles desde cantidades/precios + mapeo de papel ──
        if (esLineaPapel(prod)) {
          const base = buildPapelPdf(prod);
          base.detalles = prod.cantidades
            .map((cant: number, i: number) => {
              if (cant <= 0 || prod.precios[i] <= 0) return null;
              return {
                cantidad: cant,
                precio_total: Math.round(cant * prod.precios[i] * 100) / 100,
                kilogramos: null,
                modo_cantidad: "unidad",
              };
            })
            .filter(Boolean) as any[];
          return base;
        }

        // ── PLÁSTICO ──
        const modo = prod.modoCantidad || "unidad";
        return {
          nombre: prod.nombre || `Producto #${prod.productoId}`,
          material: prod.material || "",
          calibre: resolverCalibre(prod),
          tintas: prod.tintas ?? "—",
          caras: prod.caras ?? "—",
          medidasFormateadas: prod.medidasFormateadas || "",
          medidas: prod.medidas || {},
          bk: prod.bk || null,
          foil: prod.foil || null,
          laminado: prod.laminado || null,
          uvBr: prod.uvBr || null,
          pigmentos: prod.pigmentos || null,
          pantones: prod.pantones || null,
          asa_suaje: prod.suajeTipo || null,
          observacion: prod.observacion || null,
          descripcion: prod.descripcion || null,
          perforacion: prod.perforacion ?? false,
          por_kilo: prod.porKilo || null,
          herramental_descripcion: prod.herramental_descripcion ?? null,
          herramental_precio: prod.herramental_precio != null ? Number(prod.herramental_precio) : null,
          herramental_aprobado: prod.herramental_aprobado ?? null,
          detalles: prod.cantidades
            .map((cant: number, i: number) => {
              if (cant <= 0 || prod.precios[i] <= 0) return null;

              let precioTotal: number;
              if (modo === "kilo" && prod.kilogramos?.[i] > 0 && prod.porKilo) {
                const precioKg = Math.round(prod.precios[i] * Number(prod.porKilo) * 10000) / 10000;
                precioTotal = Math.round(prod.kilogramos[i] * precioKg * 100) / 100;
              } else {
                precioTotal = Math.round(cant * prod.precios[i] * 100) / 100;
              }

              return {
                cantidad: cant,
                precio_total: precioTotal,
                kilogramos: prod.kilogramos?.[i] > 0 ? prod.kilogramos[i] : null,
                modo_cantidad: modo,
              };
            })
            .filter(Boolean),
        };
      });

      try {
        console.log("PRODUCTOS PDF:", JSON.stringify(productosPdf, null, 2));

        await generarPdfCotizacion({
          no_cotizacion: respuesta.no_cotizacion ?? respuesta.no_pedido ?? "",
          fecha: new Date().toISOString(),
          cliente: datos.cliente || "",
          empresa: datos.empresa || "",
          telefono: datos.telefono || "",
          correo: datos.correo || "",
          estado: "Pendiente",
          impresion: datos.impresion ?? null,
          celular: datos.celular ?? null,
          razon_social: datos.razon_social ?? null,
          rfc: datos.rfc ?? null,
          domicilio: datos.domicilio ?? null,
          numero: datos.numero ?? null,
          colonia: datos.colonia ?? null,
          codigo_postal: datos.codigo_postal ?? null,
          poblacion: datos.poblacion ?? null,
          estado_cliente: datos.estado_cliente ?? null,
          cliente_id: datos.cliente_id ?? null,
          identificar: datos.identificar ?? null,
          total: productosPdf.reduce((sum: number, prod: any) =>
            sum + prod.detalles.reduce((s: number, d: any) => s + d.precio_total, 0), 0),
          moneda: datos.moneda ?? "MXN",
          productos: productosPdf,
        }, true);
      } catch (pdfErr) { console.warn("⚠️ PDF:", pdfErr); }

    } catch (e: any) {
      if (e instanceof OperacionEncoladaError) {
        await cargarCotizaciones();
        setModalOpen(false);
        showAlert(
          "Sin conexión: la cotización se guardó en este dispositivo y se subirá sola cuando vuelva la señal. El PDF no se genera hasta que el servidor le asigne folio.",
          "info"
        );
        return;
      }
      console.error("❌ Error al guardar:", e);
      showAlert(e.message || e.response?.data?.error || "Error al guardar");
    } finally { setGuardando(false); }
  };

  const handleDescargarPdf = async (cot: Cotizacion) => {
    const esPedido = cot.tipo_documento === "pedido";
    const productosParaPdf = buildProductosPdf(
      cot.productos.map(p => ({
        ...p,
        detalles: esPedido ? p.detalles.filter(d => d.aprobado === true) : p.detalles,
      }))
    );
    console.log("DESCARGA PDF - productos:", JSON.stringify(
      productosParaPdf.map(p => ({
        nombre: (p as any).nombre,
        tipo_material: (p as any).tipo_material,
        herramental_precio: (p as any).herramental_precio,
        herramental_descripcion: (p as any).herramental_descripcion,
      })), null, 2
    ));
    const guardarS3 = await preguntarGuardarS3("cotización");
    await generarPdfCotizacion({
      no_cotizacion: cot.no_cotizacion,
      fecha: cot.fecha,
      cliente: cot.cliente,
      empresa: cot.empresa,
      telefono: cot.telefono,
      correo: cot.correo,
      estado: cot.estado,
      impresion: cot.impresion ?? null,
      celular: cot.celular ?? null,
      razon_social: cot.razon_social ?? null,
      rfc: cot.rfc ?? null,
      domicilio: cot.domicilio ?? null,
      numero: cot.numero ?? null,
      colonia: cot.colonia ?? null,
      codigo_postal: cot.codigo_postal ?? null,
      poblacion: cot.poblacion ?? null,
      estado_cliente: cot.estado_cliente ?? null,
      cliente_id: cot.cliente_id ?? null,
      identificar: cot.identificar ?? null,
      total: esPedido
        ? cot.productos.reduce((sum, p) =>
          sum + p.detalles.filter(d => d.aprobado === true).reduce((s, d) => s + d.precio_total, 0), 0)
        : cot.total,
      moneda: cot.moneda ?? "MXN",
      productos: productosParaPdf,
    }, guardarS3);
  };

  // ── Envío por correo ──────────────────────────────────────────────────
  const handleAbrirModalCorreo = (cot: Cotizacion) => {
    setCotizacionParaCorreo(cot);
    setCorreoDestino(cot.correo || "");
    setErrorCorreo(null);
    setModalCorreoOpen(true);
  };

  const handleCerrarModalCorreo = () => {
    if (enviandoCorreo) return; // no cerrar a medio envío
    setModalCorreoOpen(false);
    setCotizacionParaCorreo(null);
    setCorreoDestino("");
    setErrorCorreo(null);
  };

  const handleConfirmarEnvioCorreo = async () => {
    if (!cotizacionParaCorreo) return;
    const correo = correoDestino.trim();
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    if (!correoValido) {
      setErrorCorreo("Ingresa un correo válido");
      return;
    }

    const cot = cotizacionParaCorreo;
    const esPedido = cot.tipo_documento === "pedido";
    setEnviandoCorreo(true);
    setErrorCorreo(null);
    try {
      const productosParaPdf = buildProductosPdf(
        cot.productos.map(p => ({
          ...p,
          detalles: esPedido ? p.detalles.filter(d => d.aprobado === true) : p.detalles,
        }))
      );

      // guardarS3=false, descargar=false: solo necesitamos el Blob en memoria
      // para adjuntarlo al correo, no bajarlo al equipo ni subirlo a S3.
      const blob = await generarPdfCotizacion({
        no_cotizacion: cot.no_cotizacion,
        fecha: cot.fecha,
        cliente: cot.cliente,
        empresa: cot.empresa,
        telefono: cot.telefono,
        correo: cot.correo,
        estado: cot.estado,
        impresion: cot.impresion ?? null,
        celular: cot.celular ?? null,
        razon_social: cot.razon_social ?? null,
        rfc: cot.rfc ?? null,
        domicilio: cot.domicilio ?? null,
        numero: cot.numero ?? null,
        colonia: cot.colonia ?? null,
        codigo_postal: cot.codigo_postal ?? null,
        poblacion: cot.poblacion ?? null,
        estado_cliente: cot.estado_cliente ?? null,
        cliente_id: cot.cliente_id ?? null,
        identificar: cot.identificar ?? null,
        total: esPedido
          ? cot.productos.reduce((sum, p) =>
            sum + p.detalles.filter(d => d.aprobado === true).reduce((s, d) => s + d.precio_total, 0), 0)
          : cot.total,
        moneda: cot.moneda ?? "MXN",
        productos: productosParaPdf,
      }, false, false);

      const folio = esPedido ? (cot.no_pedido ?? cot.no_cotizacion) : cot.no_cotizacion;
      const nombreArchivo = `${esPedido ? "Pedido" : "Cotizacion"}_${folio}.pdf`;
      const pdfBase64 = await blobABase64(blob);

      await api.post("/correos/documento", {
        tipo: esPedido ? "pedido" : "cotizacion",
        folio: String(folio),
        cliente: cot.cliente || "",
        empresa: cot.empresa || null,
        destinatario: correo,
        pdfBase64,
        nombreArchivo,
      });

      showAlert("✅ Correo enviado correctamente");
      handleCerrarModalCorreo();
    } catch (e: any) {
      console.error("❌ Error al enviar correo:", e);
      setErrorCorreo(e.response?.data?.error || "No se pudo enviar el correo");
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const handleEliminar = async (cot: Cotizacion) => {
    if (cot.estado === "Aprobada") return;
    if (!await showConfirm("¿Estás seguro de eliminar esta cotización?")) return;
    try {
      await eliminarCotizacion(cot.no_cotizacion);
      setCotizaciones(prev => prev.filter(c => c.no_cotizacion !== cot.no_cotizacion));
    } catch (e: any) { showAlert(e.response?.data?.error || "Error al eliminar"); }
  };

  const handleEditar = (cot: Cotizacion) => { setCotizacionEditando(cot); setModalEditarOpen(true); };
  const handleCerrarEditar = () => { setModalEditarOpen(false); setCotizacionEditando(null); };

  const handleGuardarEdicion = async (cot: Cotizacion) => {
    if (cot.tipo_documento === "pedido" || cot.estado === "Aprobada") {
      await cargarCotizaciones();
    } else {
      setCotizaciones(prev => prev.map(c => c.no_cotizacion === cot.no_cotizacion ? cot : c));
    }
    handleCerrarEditar();
  };

  const estadoBadge = (estado: string) => {
    const m: Record<string, string> = {
      Pendiente: "bg-yellow-100 text-yellow-800",
      Aprobada: "bg-green-100 text-green-800",
      Rechazada: "bg-red-100 text-red-800",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m[estado] ?? "bg-gray-100 text-gray-700"}`}>
        {estado}
      </span>
    );
  };

  const formatFecha = (iso: string) => {
    try {
      return fmtFecha(iso);
    } catch { return iso; }
  };

  const formatCantidadTabla = (d: any): string => {
    if (d.modo_cantidad === "kilo" && d.kilogramos && d.kilogramos > 0) {
      const kg = Number.isInteger(d.kilogramos) ? d.kilogramos : Number(d.kilogramos).toFixed(2);
      return `${kg} kg`;
    }
    return d.cantidad.toLocaleString();
  };

  const productoTieneKilos = (p: any): boolean =>
    (p.detalles || []).some((d: any) => d.modo_cantidad === "kilo");

  const Paginador = () => {
    const pags: (number | "...")[] = [];
    if (totalPaginas <= 7) {
      for (let i = 1; i <= totalPaginas; i++) pags.push(i);
    } else {
      pags.push(1);
      if (paginaSegura > 3) pags.push("...");
      for (let i = Math.max(2, paginaSegura - 1); i <= Math.min(totalPaginas - 1, paginaSegura + 1); i++) pags.push(i);
      if (paginaSegura < totalPaginas - 2) pags.push("...");
      pags.push(totalPaginas);
    }
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 rounded-b-lg">
        <p className="text-sm text-gray-500">
          Mostrando <span className="font-medium text-gray-700">{inicio + 1}</span>
          {" – "}
          <span className="font-medium text-gray-700">{Math.min(inicio + ITEMS_POR_PAGINA, filasTodas.length)}</span>
          {" de "}
          <span className="font-medium text-gray-700">{filasTodas.length}</span> cotizaciones
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => irAPagina(paginaSegura - 1)} disabled={paginaSegura === 1}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {pags.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
            ) : (
              <button key={p} onClick={() => irAPagina(p as number)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition ${p === paginaSegura ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}>
                {p}
              </button>
            )
          )}
          <button onClick={() => irAPagina(paginaSegura + 1)} disabled={paginaSegura === totalPaginas}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-2">Cotizaciones</h1>
      <p className="text-slate-400 mb-6">Gestión de cotizaciones y seguimiento de aprobaciones.</p>

      {/* Búsqueda */}
      <div className="mb-4 relative">
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, empresa, correo, teléfono, estado o folio (ej: COT26001)..."
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {busqueda && <p className="mt-2 text-sm text-gray-500">{filasTodas.length} resultado(s)</p>}
      </div>

      {/* Filtro material + botón nueva */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {([
            { key: "todos", label: "Todos", icon: "📋" },
            { key: "plastico", label: "Plástico", icon: "🧴" },
            { key: "papel", label: "Papel", icon: "📄" },
            { key: "libre", label: "Libre", icon: "🆓" },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setFiltroMaterial(key); setPaginaActual(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${filtroMaterial === key
                ? key === "papel"
                  ? "bg-white text-amber-600 shadow"
                  : key === "plastico"
                    ? "bg-white text-blue-600 shadow"
                    : key === "libre"
                      ? "bg-white text-purple-600 shadow"
                      : "bg-white text-gray-700 shadow"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              {icon} {label}
              <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${filtroMaterial === key
                ? key === "papel"
                  ? "bg-amber-100 text-amber-700"
                  : key === "plastico"
                    ? "bg-blue-100 text-blue-700"
                    : key === "libre"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-200 text-gray-600"
                : "bg-gray-200 text-gray-500"
                }`}>
                {key === "todos"
                  ? cotizaciones.length
                  : key === "libre"
                    ? cotizacionesLibres.length
                    : cotizaciones.filter(c =>
                      c.productos.some((p: any) =>
                        key === "papel" ? esLineaPapel(p) : !esLineaPapel(p)
                      )
                    ).length
                }
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition">
          + Nueva Cotización
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Folio", "Fecha", "Impresión", "Empresa", "Productos", "Sub-total", "Estado", "Acciones"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loadingCots ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
                <p className="mt-3 text-gray-500">Cargando cotizaciones...</p>
              </td></tr>
            ) : filtroMaterial === "libre" ? (
              cotizacionesLibresFiltradas.length > 0 ? cotizacionesLibresFiltradas.map(renderFilaLibre) : (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">No hay cotizaciones libres todavía.</td></tr>
              )
            ) : filaCombinadaPagina.length > 0 ? (
              <>
                {filaCombinadaPagina.map((fila) => {
                  if (fila.tipo === "libre") return renderFilaLibre(fila.data);
                  const cot = fila.data;
              const expandida = expandidas.has(cot.no_cotizacion);
              const puedeEliminar = cot.estado !== "Aprobada";
              return (
                <>
                  <tr key={cot.no_cotizacion} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {cot.no_cotizacion}
                      {cot.no_pedido && (
                        <span className="ml-2 text-xs text-blue-600 font-normal">→ {cot.no_pedido}</span>
                      )}
                      {cot.origen_expo && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">⭐ Expo</span>
                      )}
                      {cot.origen_cotizador_libre && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">🌐 Cliente</span>
                    )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatFecha(cot.fecha)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{cot.impresion || "—"}</p>
                      {cot.telefono && <p className="text-xs text-gray-400">{cot.telefono}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{cot.empresa || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <button onClick={() => toggleExpandida(cot.no_cotizacion)} className="flex items-center gap-2 group">
                        <span className="font-medium text-gray-700 group-hover:text-blue-600">{cot.productos.length} producto(s)</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandida ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">${cot.total.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{estadoBadge(cot.estado)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => puedeEliminar && handleEditar(cot)}
                          title={puedeEliminar ? "Gestionar" : "No se puede modificar una cotización aprobada"}
                          disabled={!puedeEliminar}
                          className={`p-1.5 rounded-md transition-colors ${puedeEliminar ? "text-blue-600 hover:bg-blue-50 cursor-pointer" : "text-gray-300 cursor-not-allowed"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        {cot.estado !== "Aprobada" && cot.tipo_documento !== "pedido" && (
                          <button
                            onClick={() =>
                              navigate(
                                cot.productos.every((p: any) => p.tipo_material === "papel" || p.tipoCotizacion === "papel")
                                  ? `/cotizar/${cot.no_cotizacion}/editar-papel`
                                  : `/cotizar/${cot.no_cotizacion}/editar`
                              )
                            }
                            title="Editar productos de la cotización"
                            className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <button onClick={() => handleDescargarPdf(cot)} title="Descargar PDF"
                          className="p-1.5 rounded-md text-green-600 hover:bg-green-50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button onClick={() => handleAbrirModalCorreo(cot)} title="Enviar por correo"
                          className="p-1.5 rounded-md text-indigo-500 hover:bg-indigo-50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="4" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v5a3 3 0 0 0 6 0v-1a10 9 0 1 0-6 9" />
                          </svg>
                        </button>
                        <button onClick={() => puedeEliminar && handleEliminar(cot)}
                          title={puedeEliminar ? "Eliminar" : "No se puede eliminar una cotización aprobada"}
                          disabled={!puedeEliminar}
                          className={`p-1.5 rounded-md transition-colors ${puedeEliminar ? "text-red-500 hover:bg-red-50 cursor-pointer" : "text-gray-300 cursor-not-allowed"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandida && (
                    <tr key={`det-${cot.no_cotizacion}`} className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={8} className="px-8 py-4">
                        <div className="space-y-3">
                          <AuditoriaDesplegable
                            tabla="solicitud"
                            id={cot.productos[0]?.idsolicitud}
                            titulo={`Auditoría de la cotización ${cot.no_cotizacion}`}
                            limite={20}
                            className="bg-white"
                          />
                          {cot.productos.map((p: any, i: number) => {
                            const detallesMostrar = cot.estado === "Aprobada"
                              ? p.detalles.filter((d: any) => d.aprobado === true)
                              : p.detalles;
                            if (detallesMostrar.length === 0) return null;
                            const papel = esLineaPapel(p);
                            return (
                              <div key={i} className="flex items-start gap-4 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${papel ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                                    {papel && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">📄 Papel</span>
                                    )}
                                    {(cot.origen_expo || p.tipo_material === "expo") && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">⭐ Expo</span>
                                    )}
                                    {cot.origen_cotizador_libre && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">🌐 Cliente</span>
                                    )}
                                    {!papel && productoTieneKilos(p) && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Incluye kg</span>
                                    )}
                                  </div>

                                  {papel ? (
                                    // ── Detalle de PAPEL ──
                                    <div className="mt-0.5 space-y-0.5">
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                                        {p.grupo_descripcion && <span>Material: {p.grupo_descripcion}</span>}
                                        {p.medida && <span>Medida: {p.medida}</span>}
                                        {p.tintas > 0 && <span>Tintas: {p.tintas}</span>}
                                        {p.tintasDentro > 0 && <span>Tintas dentro: {p.tintasDentro}</span>}
                                        {p.caras > 0 && <span>Caras: {p.caras}</span>}
                                      </div>
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                                        {p.asa_nombre && <span className="text-gray-600">Asa: {p.asa_nombre}</span>}
                                        {p.laminado_nombre && <span className="text-gray-600">Laminado: {p.laminado_nombre}</span>}
                                        {p.foil_nombre && <span className="text-amber-600">✨ Foil: {p.foil_nombre}</span>}
                                        {p.textura_nombre && <span className="text-amber-600">🪨 {p.textura_nombre}</span>}
                                        {p.uv && <span className="text-amber-600">🔆 UV</span>}
                                        {p.alto_relieve && <span className="text-amber-600">🔳 Alto relieve</span>}
                                      </div>
                                      {p.pantones && <p className="text-xs text-purple-600">🎨 {p.pantones}</p>}
                                      {p.pantonesDentro && <p className="text-xs text-purple-600">🎨 interior: {p.pantonesDentro}</p>}
                                    </div>
                                  ) : (
                                    // ── Detalle de PLÁSTICO (igual que antes) ──
                                    <>
                                      {p.tipo_material === "expo" && (p.tipo_producto || p.material || p.calibre) && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {[p.tipo_producto, p.material, p.calibre].filter(Boolean).join(" · ")}
                                        </p>
                                      )}
                                      {p.medidasFormateadas && <p className="text-xs text-gray-400 mt-0.5">Medidas: {p.medidasFormateadas}</p>}
                                      {p.pantones && <p className="text-xs text-purple-600 mt-0.5">🎨 {Array.isArray(p.pantones) ? p.pantones.join(", ") : p.pantones}</p>}
                                      {p.asa_suaje && (
                                        <p className="text-xs text-blue-600 mt-0.5">
                                          Asa: {p.asa_suaje}{p.color_asa_nombre ? ` · ${p.color_asa_nombre}` : ""}
                                        </p>
                                      )}
                                      {!p.asa_suaje && p.suaje_tipo && (
                                        <p className="text-xs text-blue-600 mt-0.5">
                                          Asa: {p.suaje_tipo}{p.color_asa_nombre ? ` · ${p.color_asa_nombre}` : ""}
                                        </p>
                                      )}
                                      {p.pigmentos && <p className="text-xs text-orange-600 mt-0.5">🧪 {p.pigmentos}</p>}
                                      {p.herramental_precio != null && p.herramental_precio > 0 && (
                                        <div className="mt-0.5 flex items-center gap-2">
                                          <p className="text-xs text-amber-700">
                                            🔧 Herramental{p.herramental_descripcion ? `: ${p.herramental_descripcion}` : ""} — ${Number(p.herramental_precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                          </p>
                                          <BotonAuditoria
                                            tabla="herramental"
                                            id={p.herramental_id}
                                            etiqueta="Historial del herramental"
                                          />
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 flex-shrink-0">
                                  {detallesMostrar.map((d: any, j: number) => (
                                    <div key={j} className="text-center bg-gray-50 rounded px-2 py-1 border border-gray-200">
                                      <p className="text-xs font-semibold text-gray-700">{formatCantidadTabla(d)}</p>
                                      <p className="text-xs text-green-600">${d.precio_total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                                      <BotonAuditoria
                                        tabla="solicitud_detalle"
                                        id={d.iddetalle}
                                        etiqueta={`Auditoría de la partida ${j + 1}`}
                                        className="mt-1"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
              </>
            ) : (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                {busqueda ? `No se encontraron cotizaciones para "${busqueda}"` : "No hay cotizaciones registradas"}
              </td></tr>
            )}
          </tbody>
        </table>
        {!loadingCots && filtroMaterial !== "libre" && filasTodas.length > 0 && <Paginador />}
      </div>



      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Cotización">
        {cargandoCatalogos ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">Cargando catálogos...</span>
          </div>
        ) : errorCatalogos ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold mb-2">Error al cargar catálogos</h3>
            <p className="text-red-600 mb-4">{errorCatalogos}</p>
            <button onClick={cargarCatalogos} className="px-4 py-2 bg-red-600 text-white rounded-lg">Reintentar</button>
          </div>
        ) : (
          <div>
            {guardando && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                <p className="text-blue-700 text-sm">Guardando cotización y generando PDF...</p>
              </div>
            )}

            <FormularioCotizacion
              onSubmit={handleSubmit} onSubmitLibre={handleGuardarLibre} onCancel={() => setModalOpen(false)} catalogos={catalogos} />
          </div>
        )}
      </Modal>

      <Modal isOpen={modalEditarOpen} onClose={handleCerrarEditar}
        title={cotizacionEditando ? `${cotizacionEditando.no_cotizacion} — ${cotizacionEditando.cliente || "Sin cliente"}` : "Cotización"}>
        {cotizacionEditando && (
          <EditarCotizacion cotizacion={cotizacionEditando} onSave={handleGuardarEdicion} onCancel={handleCerrarEditar} />
        )}
      </Modal>

      <Modal isOpen={modalCorreoOpen} onClose={handleCerrarModalCorreo} title="Enviar por correo">
        {cotizacionParaCorreo && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Se enviará el PDF de {cotizacionParaCorreo.tipo_documento === "pedido" ? "pedido" : "cotización"}{" "}
              <span className="font-semibold text-gray-800">
                {cotizacionParaCorreo.tipo_documento === "pedido"
                  ? (cotizacionParaCorreo.no_pedido ?? cotizacionParaCorreo.no_cotizacion)
                  : cotizacionParaCorreo.no_cotizacion}
              </span>{" "}
              a:
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo del destinatario</label>
              <input
                type="email"
                value={correoDestino}
                onChange={e => setCorreoDestino(e.target.value)}
                placeholder="cliente@correo.com"
                disabled={enviandoCorreo}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleConfirmarEnvioCorreo(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              {errorCorreo && <p className="mt-1 text-sm text-red-600">{errorCorreo}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleCerrarModalCorreo} disabled={enviandoCorreo}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleConfirmarEnvioCorreo} disabled={enviandoCorreo}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow disabled:opacity-50 flex items-center gap-2">
                {enviandoCorreo && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {enviandoCorreo ? "Enviando..." : "Enviar correo"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Enviar por correo — Cotización Libre (modal aparte, mismo estilo) ── */}
      <Modal isOpen={modalCorreoLibreOpen} onClose={handleCerrarModalCorreoLibre} title="Enviar por correo">
        {libreParaCorreo && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Se enviará la propuesta libre{" "}
              <span className="font-semibold text-gray-800">{libreParaCorreo.folio}</span> a:
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo del destinatario</label>
              <input
                type="email"
                value={correoLibreDestino}
                onChange={e => setCorreoLibreDestino(e.target.value)}
                placeholder="cliente@correo.com"
                disabled={enviandoCorreoLibre}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleConfirmarEnvioCorreoLibre(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
              />
              {errorCorreoLibre && <p className="mt-1 text-sm text-red-600">{errorCorreoLibre}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleCerrarModalCorreoLibre} disabled={enviandoCorreoLibre}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleConfirmarEnvioCorreoLibre} disabled={enviandoCorreoLibre}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow disabled:opacity-50 flex items-center gap-2">
                {enviandoCorreoLibre && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {enviandoCorreoLibre ? "Enviando..." : "Enviar correo"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ModalEditarCotizacionLibre
        folio={folioEditandoLibre}
        onClose={() => setFolioEditandoLibre(null)}
        onGuardado={cargarCotizacionesLibres}
      />
    </Dashboard>
  );
}