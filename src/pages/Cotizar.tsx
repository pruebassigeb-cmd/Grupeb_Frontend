import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import FormularioCotizacion from "../components/FormularioSolicitud";
import EditarCotizacion from "../components/EditarCotizacion";
import { useState, useEffect } from "react";
import { getCatalogosPlastico } from "../services/productosPlasticoService";
import {
  getCotizaciones,
  crearCotizacion,
  eliminarCotizacion,
} from "../services/cotizacionesService";
import { generarPdfCotizacion } from "../services/generarPdfCotizacion";
import type { CatalogosPlastico } from "../types/productos-plastico.types";
import type { Cotizacion } from "../types/cotizaciones.types";

const ITEMS_POR_PAGINA = 7;

export default function Cotizaciones() {
  const [cotizaciones,  setCotizaciones]  = useState<Cotizacion[]>([]);
  const [loadingCots,   setLoadingCots]   = useState(false);
  const [busqueda,      setBusqueda]      = useState("");

  const [modalOpen,    setModalOpen]    = useState(false);
  const [guardando,    setGuardando]    = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const [modalEditarOpen,    setModalEditarOpen]    = useState(false);
  const [cotizacionEditando, setCotizacionEditando] = useState<Cotizacion | null>(null);

  const [catalogos, setCatalogos] = useState<CatalogosPlastico>({
    tiposProducto: [], materiales: [], calibres: [],
  });
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [errorCatalogos,    setErrorCatalogos]    = useState("");

  const [expandidas,   setExpandidas]   = useState<Set<number>>(new Set());
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => { cargarCatalogos(); cargarCotizaciones(); }, []);
  useEffect(() => { setPaginaActual(1); }, [busqueda]);

  const toggleExpandida = (no: number) => {
    setExpandidas(prev => {
      const s = new Set(prev);
      s.has(no) ? s.delete(no) : s.add(no);
      return s;
    });
  };

  const cargarCatalogos = async () => {
    try {
      setCargandoCatalogos(true); setErrorCatalogos("");
      setCatalogos(await getCatalogosPlastico());
    } catch (e: any) {
      setErrorCatalogos(e.response?.data?.error || "Error al cargar catálogos");
    } finally { setCargandoCatalogos(false); }
  };

  const cargarCotizaciones = async () => {
    try {
      setLoadingCots(true);
      setCotizaciones(await getCotizaciones());
    } catch (e: any) { console.error("❌", e); }
    finally { setLoadingCots(false); }
  };

  const normalizar = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const cotizacionesFiltradas = cotizaciones.filter(c => {
    if (!busqueda) return true;
    const t = normalizar(busqueda);
    return (
      normalizar(c.cliente  ?? "").includes(t) ||
      normalizar(c.empresa  ?? "").includes(t) ||
      normalizar(c.correo   ?? "").includes(t) ||
      normalizar(c.telefono ?? "").includes(t) ||
      normalizar(c.estado).includes(t)         ||
      c.no_cotizacion.toString().includes(t)
    );
  });

  const totalPaginas       = Math.max(1, Math.ceil(cotizacionesFiltradas.length / ITEMS_POR_PAGINA));
  const paginaSegura       = Math.min(paginaActual, totalPaginas);
  const inicio             = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const cotizacionesPagina = cotizacionesFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  const irAPagina          = (p: number) => setPaginaActual(Math.max(1, Math.min(p, totalPaginas)));

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

  const buildProductosPdf = (productos: any[]) =>
    productos.map((p: any) => ({
      nombre:             p.nombre,
      material:           p.material            || "",
      calibre:            resolverCalibre(p),
      tintas:             p.tintas,
      caras:              p.caras,
      medidasFormateadas: p.medidasFormateadas   || "",
      medidas:            p.medidas             || {},
      bk:                 p.bk                  || null,
      foil:               p.foil                || null,
      laminado:           p.laminado            || null,
      uvBr:               (p.uv_br ?? p.uvBr)    || null,
      pigmentos:          p.pigmentos            || null,
      pantones:           p.pantones             || null,
      asa_suaje:          p.asa_suaje            || null,
      observacion:        p.observacion          || null,
      por_kilo:           p.por_kilo             || null,
      detalles: (p.detalles || []).map((d: any) => ({
        cantidad:      d.cantidad,
        precio_total:  d.precio_total,
        kilogramos:    d.kilogramos   ?? null,
        modo_cantidad: d.modo_cantidad || "unidad",
      })),
    }));

  // ── CREAR COTIZACIÓN ──────────────────────────────────────
  const handleSubmit = async (datos: any) => {
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const respuesta = await crearCotizacion(datos);
      await cargarCotizaciones();
      setModalOpen(false);

      const productosPdf = datos.productos.map((prod: any) => {
        const modo = prod.modoCantidad || "unidad";
        return {
          nombre:             prod.nombre || `Producto #${prod.productoId}`,
          material:           prod.material           || "",
          calibre:            resolverCalibre(prod),
          tintas:             prod.tintas             ?? "—",
          caras:              prod.caras              ?? "—",
          medidasFormateadas: prod.medidasFormateadas || "",
          medidas:            prod.medidas            || {},
          bk:                 prod.bk        || null,
          foil:               prod.foil      || null,
          laminado:           prod.laminado  || null,
          uvBr:               prod.uvBr      || null,
          pigmentos:          prod.pigmentos || null,
          pantones:           prod.pantones  || null,
          asa_suaje:          prod.suajeTipo || null,
          observacion:        prod.observacion || null,
          por_kilo:           prod.porKilo    || null,
          detalles: prod.cantidades
            .map((cant: number, i: number) => {
              if (cant <= 0 || prod.precios[i] <= 0) return null;
              return {
                cantidad:      cant,
                precio_total:  Number((cant * prod.precios[i]).toFixed(2)),
                kilogramos:    prod.kilogramos?.[i] > 0 ? prod.kilogramos[i] : null,
                modo_cantidad: modo,
              };
            })
            .filter(Boolean),
        };
      });

      try {
        await generarPdfCotizacion({
          no_cotizacion: respuesta.no_cotizacion ?? respuesta.no_pedido ?? 0,
          fecha:         new Date().toISOString(),
          cliente:       datos.cliente  || "",
          empresa:       datos.empresa  || "",
          telefono:      datos.telefono || "",
          correo:        datos.correo   || "",
          estado:        "Pendiente",
          impresion:     datos.impresion ?? null,
          total: datos.productos.reduce((sum: number, prod: any) =>
            sum + prod.cantidades.reduce((s: number, cant: number, i: number) =>
              cant > 0 && prod.precios[i] > 0 ? s + cant * prod.precios[i] : s, 0), 0),
          productos: productosPdf,
        });
      } catch (pdfErr) { console.warn("⚠️ PDF:", pdfErr); }

    } catch (e: any) {
      console.error("❌ Error al guardar:", e);
      setErrorGuardar(e.message || e.response?.data?.error || "Error al guardar");
    } finally { setGuardando(false); }
  };

  // ── DESCARGAR PDF ─────────────────────────────────────────
  const handleDescargarPdf = async (cot: Cotizacion) => {
    const esPedido = cot.tipo_documento === "pedido";

    const productosParaPdf = buildProductosPdf(
      cot.productos.map(p => ({
        ...p,
        detalles: esPedido
          ? p.detalles.filter(d => d.aprobado === true)
          : p.detalles,
      }))
    );

    await generarPdfCotizacion({
      no_cotizacion: cot.no_cotizacion,
      fecha:         cot.fecha,
      cliente:       cot.cliente,
      empresa:       cot.empresa,
      telefono:      cot.telefono,
      correo:        cot.correo,
      estado:        cot.estado,
      impresion:     cot.impresion ?? null,
      total:         esPedido
        ? cot.productos.reduce((sum, p) =>
            sum + p.detalles
              .filter(d => d.aprobado === true)
              .reduce((s, d) => s + d.precio_total, 0), 0)
        : cot.total,
      productos: productosParaPdf,
    });
  };

  const handleEliminar = async (cot: Cotizacion) => {
    if (cot.estado === "Aprobada") return;
    if (!confirm("¿Estás seguro de eliminar esta cotización?")) return;
    try {
      await eliminarCotizacion(cot.no_cotizacion);
      setCotizaciones(prev => prev.filter(c => c.no_cotizacion !== cot.no_cotizacion));
    } catch (e: any) { alert(e.response?.data?.error || "Error al eliminar"); }
  };

  const handleEditar       = (cot: Cotizacion) => { setCotizacionEditando(cot); setModalEditarOpen(true); };
  const handleCerrarEditar = () => { setModalEditarOpen(false); setCotizacionEditando(null); };

  // ✅ FIX: Si la cotización fue aprobada (se convirtió a pedido),
  //         recargar desde el backend para que desaparezca de la tabla.
  //         Si solo cambió estado (rechazada, pendiente), actualizar local.
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
      Aprobada:  "bg-green-100 text-green-800",
      Rechazada: "bg-red-100 text-red-800",
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m[estado] ?? "bg-gray-100 text-gray-700"}`}>{estado}</span>;
  };

  const formatFecha = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return iso; }
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
    if (totalPaginas <= 7) { for (let i = 1; i <= totalPaginas; i++) pags.push(i); }
    else {
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
          <span className="font-medium text-gray-700">{Math.min(inicio + ITEMS_POR_PAGINA, cotizacionesFiltradas.length)}</span>
          {" de "}
          <span className="font-medium text-gray-700">{cotizacionesFiltradas.length}</span> cotizaciones
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => irAPagina(paginaSegura - 1)} disabled={paginaSegura === 1}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          {pags.map((p, i) =>
            p === "..." ? <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
            : <button key={p} onClick={() => irAPagina(p as number)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition ${p === paginaSegura ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}>{p}</button>
          )}
          <button onClick={() => irAPagina(paginaSegura + 1)} disabled={paginaSegura === totalPaginas}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <Dashboard userName="Administrador">
      <h1 className="text-2xl font-bold mb-2">Cotizaciones</h1>
      <p className="text-slate-400 mb-6">Gestión de cotizaciones y seguimiento de aprobaciones.</p>

      <div className="mb-6 relative">
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, empresa, correo, teléfono, estado o folio..."
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {busqueda && <p className="mt-2 text-sm text-gray-500">{cotizacionesFiltradas.length} resultado(s)</p>}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Folio","Fecha","Cliente","Empresa","Productos","Total","Estado","Acciones"].map(h => (
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
            ) : cotizacionesPagina.length > 0 ? cotizacionesPagina.map(cot => {
              const expandida     = expandidas.has(cot.no_cotizacion);
              const puedeEliminar = cot.estado !== "Aprobada";

              return (
                <>
                  <tr key={cot.no_cotizacion} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      #{cot.no_cotizacion}
                      {cot.no_pedido && (
                        <span className="ml-2 text-xs text-blue-600 font-normal">→ Pedido #{cot.no_pedido}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatFecha(cot.fecha)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{cot.cliente || "—"}</p>
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
                        <button
                          onClick={() => puedeEliminar && handleEditar(cot)}
                          title={puedeEliminar ? "Gestionar" : "No se puede modificar una cotización aprobada"}
                          disabled={!puedeEliminar}
                          className={`p-1.5 rounded-md transition-colors ${
                            puedeEliminar
                              ? "text-blue-600 hover:bg-blue-50 cursor-pointer"
                              : "text-gray-300 cursor-not-allowed"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDescargarPdf(cot)} title="Descargar PDF" className="p-1.5 rounded-md text-green-600 hover:bg-green-50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                        <button
                          onClick={() => puedeEliminar && handleEliminar(cot)}
                          title={puedeEliminar ? "Eliminar" : "No se puede eliminar una cotización aprobada"}
                          disabled={!puedeEliminar}
                          className={`p-1.5 rounded-md transition-colors ${
                            puedeEliminar
                              ? "text-red-500 hover:bg-red-50 cursor-pointer"
                              : "text-gray-300 cursor-not-allowed"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandida && (
                    <tr key={`det-${cot.no_cotizacion}`} className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={8} className="px-8 py-4">
                        <div className="space-y-3">
                          {cot.productos.map((p: any, i: number) => {
                            const detallesMostrar = cot.estado === "Aprobada"
                              ? p.detalles.filter((d: any) => d.aprobado === true)
                              : p.detalles;

                            if (detallesMostrar.length === 0) return null;

                            return (
                              <div key={i} className="flex items-start gap-4 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                                    {productoTieneKilos(p) && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Incluye kg</span>
                                    )}
                                  </div>
                                  {p.medidasFormateadas && <p className="text-xs text-gray-400 mt-0.5">Medidas: {p.medidasFormateadas}</p>}
                                  {p.pantones  && <p className="text-xs text-purple-600 mt-0.5">🎨 {Array.isArray(p.pantones) ? p.pantones.join(", ") : p.pantones}</p>}
                                  {p.pigmentos && <p className="text-xs text-orange-600 mt-0.5">🧪 {p.pigmentos}</p>}
                                </div>
                                <div className="flex flex-wrap gap-2 flex-shrink-0">
                                  {detallesMostrar.map((d: any, j: number) => (
                                    <div key={j} className="text-center bg-gray-50 rounded px-2 py-1 border border-gray-200">
                                      <p className="text-xs font-semibold text-gray-700">{formatCantidadTabla(d)}</p>
                                      <p className="text-xs text-green-600">${d.precio_total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
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
            }) : (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                {busqueda ? `No se encontraron cotizaciones para "${busqueda}"` : "No hay cotizaciones registradas"}
              </td></tr>
            )}
          </tbody>
        </table>
        {!loadingCots && cotizacionesFiltradas.length > 0 && <Paginador />}
      </div>

      <button onClick={() => { setErrorGuardar(null); setModalOpen(true); }}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition">
        + Nueva Cotización
      </button>

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
            {errorGuardar && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">❌ {errorGuardar}</p></div>}
            {guardando && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                <p className="text-blue-700 text-sm">Guardando cotización y generando PDF...</p>
              </div>
            )}
            <FormularioCotizacion onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} catalogos={catalogos} />
          </div>
        )}
      </Modal>

      <Modal isOpen={modalEditarOpen} onClose={handleCerrarEditar}
        title={cotizacionEditando ? `Cotización #${cotizacionEditando.no_cotizacion} — ${cotizacionEditando.cliente || "Sin cliente"}` : "Cotización"}>
        {cotizacionEditando && (
          <EditarCotizacion cotizacion={cotizacionEditando} onSave={handleGuardarEdicion} onCancel={handleCerrarEditar} />
        )}
      </Modal>
    </Dashboard>
  );
}