import Dashboard from "../layouts/Sidebar";
import Modal from "../components/Modal";
import FormularioCotizacion from "../components/FormularioSolicitud";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCatalogosPlastico } from "../services/productosPlasticoService";
import { getPedidos, eliminarPedido } from "../services/pedidosService";
import { crearCotizacion } from "../services/cotizacionesService";
import { generarPdfPedido } from "../services/generarPdfPedido";
import type { FormatoPedidoPdf } from "../services/generarPdfPedido";
import { preguntarGuardarS3 } from "../services/pdfS3.service";
import { getVentaByPedido } from "../services/ventasservice";
import type { CatalogosPlastico } from "../types/productos-plastico.types";
import type { Pedido } from "../types/cotizaciones.types";
import { showAlert } from '../components/CustomAlert';
import { showConfirm } from '../components/CustomConfirm';
import ModalRepetirPedido from "../components/ModalRepetirPedido";
import { buildPayloadDesdePedido } from "../utils/buildPayloadDesdePedido";
import { getHistorialPedidosPorCliente } from "../services/pedidosService";
import { guardarMaquinariaPedidoPapel } from "../services/pedidosService";
import ModalMaquinariaPedidoPapel from "../components/papel/ModalMaquinariaPedidoPapel";
import type { MaquinariaProductoPedidoPapel } from "../types/papel/maquinaria-pedido.types";

const ITEMS_POR_PAGINA = 7;

const esLineaPapel = (p: any): boolean =>
  p?.tipo_material === "papel" || p?.tipoCotizacion === "papel";

export default function Pedidos() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPeds, setLoadingPeds] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMaterial, setFiltroMaterial] = useState<"todos" | "plastico" | "papel">("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [catalogos, setCatalogos] = useState<CatalogosPlastico>({ tiposProducto: [], materiales: [], calibres: [] });
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState("");
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalRepetirOpen, setModalRepetirOpen] = useState(false);
  const [pasoMaquinaria, setPasoMaquinaria] = useState<{
    noPedido: string;
    pedido: Pedido;
    datosFormulario: any;
  } | null>(null);
  const [menuPdfAbierto, setMenuPdfAbierto] = useState<string | null>(null);
  const [descargandoPdf, setDescargandoPdf] = useState<string | null>(null);

  useEffect(() => { cargarCatalogos(); cargarPedidos(); }, []);
  useEffect(() => { setPaginaActual(1); }, [busqueda, filtroMaterial]);

  const toggleExpandida = (folio: string) => {
    setExpandidas(prev => {
      const s = new Set(prev);
      s.has(folio) ? s.delete(folio) : s.add(folio);
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

  const cargarPedidos = async () => {
    try {
      setLoadingPeds(true);
      setPedidos(await getPedidos());
    } catch (e: any) { console.error("❌", e); }
    finally { setLoadingPeds(false); }
  };

  const normalizar = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const pedidosFiltrados = pedidos.filter(p => {
    if (busqueda) {
      const t = normalizar(busqueda);
      const coincide =
        normalizar(p.cliente ?? "").includes(t) ||
        normalizar(p.empresa ?? "").includes(t) ||
        normalizar(p.correo ?? "").includes(t) ||
        normalizar(p.telefono ?? "").includes(t) ||
        String(p.cliente_id ?? "").includes(busqueda.trim()) ||
        normalizar(p.impresion ?? "").includes(t) ||
        (p.no_pedido ?? "").toLowerCase().includes(t) ||
        (p.no_cotizacion ?? "").toLowerCase().includes(t);
      if (!coincide) return false;
    }

    if (filtroMaterial === "todos") return true;
    return p.productos.some((prod: any) =>
      filtroMaterial === "papel" ? esLineaPapel(prod) : !esLineaPapel(prod)
    );
  });

  const totalPaginas = Math.max(1, Math.ceil(pedidosFiltrados.length / ITEMS_POR_PAGINA));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const pedidosPagina = pedidosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  const irAPagina = (p: number) => setPaginaActual(Math.max(1, Math.min(p, totalPaginas)));

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

  // ── buildPapelPdf — separa material y calibre desde grupo_descripcion ──────
  const buildPapelPdf = (p: any) => {
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
      material: materialStr,
      calibre: calibreStr,
      grupo_descripcion: grupDesc,
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
      herramental_descripcion: p.herramental_descripcion ?? null,  // ← fix herramental
      herramental_precio: p.herramental_precio != null ? Number(p.herramental_precio) : null,  // ← fix herramental
      herramental_aprobado: p.herramental_aprobado ?? null,        // ← fix herramental
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
        bk: null,
        foil: null,
        laminado: null,
        uvBr: null,
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

  const handleRepetirPedido = async (ped: Pedido) => {
    setModalRepetirOpen(false);
    console.log("=== PED COMPLETO ===", JSON.stringify(ped, null, 2));
    try {
      const payload = buildPayloadDesdePedido(ped);
      const respuesta = await crearCotizacion(payload);
      const noPedido = respuesta.no_pedido ?? "";
      if (!noPedido) throw new Error("No se recibió no_pedido");

      const pedidosActualizados = await getPedidos();
      const pedidoCompleto = (pedidosActualizados as Pedido[]).find(
        pedido => pedido.no_pedido === noPedido
      );
      if (!pedidoCompleto) {
        throw new Error("No se pudo recuperar el pedido repetido");
      }

      setModalOpen(true);
      if (pedidoCompleto.productos.some(esLineaPapel)) {
        setPasoMaquinaria({
          noPedido,
          pedido: pedidoCompleto,
          datosFormulario: payload,
        });
        return;
      }

      await finalizarLevantamiento(noPedido, pedidoCompleto, payload);
    } catch (e: any) {
      showAlert(e.response?.data?.error || e.message || "Error al crear el pedido");
    }
  };

  const generarPdfPedidoCreado = async (
    noPedido: string,
    pedidoCompleto: Pedido,
    datos: any
  ) => {
    const venta = await getVentaByPedido(noPedido);

    const productosPdf = datos.productos.map((prod: any) => {
      if (esLineaPapel(prod)) {
        const productoPersistido = pedidoCompleto.productos.find(
          (item: any) =>
            esLineaPapel(item) &&
            Number(item.idproducto_papel) === Number(prod.idproducto_papel) &&
            Number(item.idgrupo_papel ?? 0) ===
            Number(prod.idgrupo_papel ?? 0)
        );
        const base = buildPapelPdf({
          ...prod,
          ...(productoPersistido ?? {}),
        });
        if (Array.isArray(prod.cantidades) && Array.isArray(prod.precios)) {
          base.detalles = prod.cantidades
            .map((cant: number, i: number) => {
              if (cant <= 0 || prod.precios[i] <= 0) return null;
              return {
                cantidad: cant,
                precio_total:
                  Math.round(cant * prod.precios[i] * 100) / 100,
                kilogramos: null,
                modo_cantidad: "unidad",
              };
            })
            .filter(Boolean) as any[];
        }
        return base;
      }

      if (!Array.isArray(prod.cantidades) || !Array.isArray(prod.precios)) {
        return buildProductosPdf([prod])[0];
      }

      const modo = prod.modoCantidad || "unidad";
      return {
        nombre: prod.nombre || `Producto #${prod.productoId}`,
        material: prod.material || "",
        calibre: resolverCalibre(prod),
        tintas: prod.tintas ?? "—",
        caras: prod.caras ?? "—",
        medidasFormateadas: prod.medidasFormateadas || "",
        medidas: prod.medidas || {},
        bk: null,
        foil: null,
        laminado: null,
        uvBr: null,
        pigmentos: prod.pigmentos || null,
        pantones: prod.pantones || null,
        asa_suaje: prod.suajeTipo || null,
        observacion: prod.observacion || null,
        descripcion: prod.descripcion || null,
        perforacion: prod.perforacion ?? false,
        por_kilo: prod.porKilo || null,
        herramental_descripcion: prod.herramental_descripcion ?? null,
        herramental_precio:
          prod.herramental_precio != null
            ? Number(prod.herramental_precio)
            : null,
        herramental_aprobado: prod.herramental_aprobado ?? null,
        detalles: prod.cantidades
          .map((cant: number, i: number) => {
            if (cant <= 0 || prod.precios[i] <= 0) return null;
            let precioTotal: number;
            if (
              modo === "kilo" &&
              prod.kilogramos?.[i] > 0 &&
              prod.porKilo
            ) {
              const precioKg =
                Math.round(
                  prod.precios[i] * Number(prod.porKilo) * 10000
                ) / 10000;
              precioTotal =
                Math.round(prod.kilogramos[i] * precioKg * 100) / 100;
            } else {
              precioTotal =
                Math.round(cant * prod.precios[i] * 100) / 100;
            }
            return {
              cantidad: cant,
              precio_total: precioTotal,
              kilogramos:
                prod.kilogramos?.[i] > 0 ? prod.kilogramos[i] : null,
              modo_cantidad: modo,
            };
          })
          .filter(Boolean),
      };
    });

    await generarPdfPedido({
      no_pedido: noPedido,
      no_cotizacion: null,
      fecha: new Date().toISOString(),
      cliente: pedidoCompleto.cliente ?? datos.cliente ?? "",
      empresa: pedidoCompleto.empresa ?? datos.empresa ?? "",
      telefono: pedidoCompleto.telefono ?? datos.telefono ?? "",
      correo: pedidoCompleto.correo ?? datos.correo ?? "",
      impresion: pedidoCompleto.impresion ?? datos.impresion ?? null,
      celular: pedidoCompleto.celular ?? null,
      razon_social: pedidoCompleto.razon_social ?? null,
      rfc: pedidoCompleto.rfc ?? null,
      domicilio: pedidoCompleto.domicilio ?? null,
      numero: pedidoCompleto.numero ?? null,
      colonia: pedidoCompleto.colonia ?? null,
      codigo_postal: pedidoCompleto.codigo_postal ?? null,
      poblacion: pedidoCompleto.poblacion ?? null,
      estado_cliente: pedidoCompleto.estado_cliente ?? null,
      cliente_id: pedidoCompleto.cliente_id ?? null,
      identificar: pedidoCompleto.identificar ?? null,
      subtotal: Number(venta.subtotal),
      iva: Number(venta.iva),
      total: Number(venta.total),
      anticipo: Number(venta.anticipo),
      saldo: Number(venta.saldo),
      productos: productosPdf,
    }, true);
  };

  const finalizarLevantamiento = async (
    noPedido: string,
    pedidoCompleto: Pedido,
    datos: any
  ) => {
    try {
      await generarPdfPedidoCreado(noPedido, pedidoCompleto, datos);
    } catch (pdfErr) {
      console.warn("⚠️ PDF:", pdfErr);
    }

    setPasoMaquinaria(null);
    setModalOpen(false);
    await cargarPedidos();
    showAlert(`✅ Pedido creado: ${noPedido}`);
  };

  const handleConfirmarMaquinaria = async (
    selecciones: MaquinariaProductoPedidoPapel[]
  ) => {
    if (!pasoMaquinaria) return;

    setGuardando(true);
    setErrorGuardar(null);
    try {
      await guardarMaquinariaPedidoPapel(
        pasoMaquinaria.noPedido,
        selecciones
      );
      const pedidosActualizados = await getPedidos();
      const pedidoActualizado = (pedidosActualizados as Pedido[]).find(
        pedido => pedido.no_pedido === pasoMaquinaria.noPedido
      );
      if (!pedidoActualizado) {
        throw new Error("No se pudo recargar el pedido configurado");
      }
      await finalizarLevantamiento(
        pasoMaquinaria.noPedido,
        pedidoActualizado,
        pasoMaquinaria.datosFormulario
      );
    } catch (e: any) {
      setErrorGuardar(
        e.response?.data?.error ||
        e.message ||
        "No se pudo guardar la maquinaria"
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = async (datos: any) => {
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const respuesta = await crearCotizacion({ ...datos, tipo: "pedido" });
      const noPedido = respuesta.no_pedido ?? "";
      if (!noPedido) throw new Error("No se recibió no_pedido del servidor");

      const pedidosActualizados = await getPedidos();
      const pedidoCompleto = (pedidosActualizados as Pedido[]).find(
        pedido => pedido.no_pedido === noPedido
      );
      if (!pedidoCompleto) {
        throw new Error("No se pudo recuperar el pedido recién creado");
      }

      if (pedidoCompleto.productos.some(esLineaPapel)) {
        setPasoMaquinaria({
          noPedido,
          pedido: pedidoCompleto,
          datosFormulario: datos,
        });
        return;
      }

      await finalizarLevantamiento(noPedido, pedidoCompleto, datos);

    } catch (e: any) {
      console.error("❌ Error al guardar pedido:", e);
      setErrorGuardar(e.response?.data?.error || e.message || "Error al guardar");
    } finally { setGuardando(false); }
  };

  const handleDescargarPdf = async (ped: Pedido, formato: FormatoPedidoPdf = "carta") => {
    setMenuPdfAbierto(null);
    setDescargandoPdf(ped.no_pedido);
    try {
      const venta = await getVentaByPedido(ped.no_pedido);
      const guardarS3 = await preguntarGuardarS3("pedido");
      await generarPdfPedido({
        no_pedido: ped.no_pedido,
        no_cotizacion: ped.no_cotizacion ?? null,
        fecha: ped.fecha,
        cliente: ped.cliente,
        empresa: ped.empresa,
        telefono: ped.telefono,
        correo: ped.correo,
        impresion: ped.impresion ?? null,
        celular: ped.celular ?? null,
        razon_social: ped.razon_social ?? null,
        rfc: ped.rfc ?? null,
        domicilio: ped.domicilio ?? null,
        numero: ped.numero ?? null,
        colonia: ped.colonia ?? null,
        codigo_postal: ped.codigo_postal ?? null,
        poblacion: ped.poblacion ?? null,
        estado_cliente: ped.estado_cliente ?? null,
        cliente_id: ped.cliente_id ?? null,
        identificar: ped.identificar ?? null,
        subtotal: Number(venta.subtotal),
        iva: Number(venta.iva),
        total: Number(venta.total),
        anticipo: Number(venta.anticipo),
        saldo: Number(venta.saldo),
        productos: buildProductosPdf(ped.productos),
      }, guardarS3, true, formato);
    } catch (e) {
      console.error("❌ Error al obtener venta para PDF:", e);
      showAlert("No se pudo generar el PDF. Verifica que la venta esté registrada.");
    } finally {
      setDescargandoPdf(null);
    }
  };

  const handleEliminar = async (ped: Pedido) => {
    const confirmar = await showConfirm(
      `⚠️ ELIMINAR PEDIDO ${ped.no_pedido}\n\n` +
      `Esta acción eliminará TODO lo relacionado:\n` +
      `• Pedido\n• Productos\n• Detalles\n• Ventas y pagos\n` +
      `• Diseño\n• Producción\n• Bultos\n• Envíos\n` +
      `• Notas de remisión\n• Bitácora de reparto\n\n` +
      `Esta operación NO se puede deshacer.\n\n` +
      `¿Confirmas eliminarlo completamente?`
    );
    if (!confirmar) return;
    try {
      await eliminarPedido(ped.no_pedido);
      setPedidos(prev => prev.filter(p => p.no_pedido !== ped.no_pedido));
      showAlert(`✅ Pedido ${ped.no_pedido} eliminado completamente`);
    } catch (e: any) {
      showAlert(
        e.response?.data?.detalle ||
        e.response?.data?.error ||
        "Error al eliminar el pedido"
      );
    }
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

  const origenBadge = (ped: Pedido) => {
    if (ped.es_directo) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Directo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        De {ped.no_cotizacion}
      </span>
    );
  };

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
          <span className="font-medium text-gray-700">{Math.min(inicio + ITEMS_POR_PAGINA, pedidosFiltrados.length)}</span>
          {" de "}
          <span className="font-medium text-gray-700">{pedidosFiltrados.length}</span> pedidos
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => irAPagina(paginaSegura - 1)} disabled={paginaSegura === 1}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {pags.map((p, i) =>
            p === "..." ? <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
              : <button key={p} onClick={() => irAPagina(p as number)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition ${p === paginaSegura ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}>{p}</button>
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
      <h1 className="text-2xl font-bold mb-2">Pedidos</h1>
      <p className="text-slate-400 mb-6">Gestión de pedidos activos — incluye pedidos directos y cotizaciones aprobadas.</p>

      {/* Búsqueda */}
      <div className="mb-4 relative">
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, empresa, folio (ej: P26001), N° cotización..."
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {busqueda && <p className="mt-2 text-sm text-gray-500">{pedidosFiltrados.length} resultado(s)</p>}
      </div>

      {/* Filtro material + botones */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {([
            { key: "todos", label: "Todos", icon: "📋" },
            { key: "plastico", label: "Plástico", icon: "🧴" },
            { key: "papel", label: "Papel", icon: "📄" },
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
                    : "bg-gray-200 text-gray-600"
                : "bg-gray-200 text-gray-500"
                }`}>
                {key === "todos"
                  ? pedidos.length
                  : pedidos.filter(p =>
                    p.productos.some((prod: any) =>
                      key === "papel" ? esLineaPapel(prod) : !esLineaPapel(prod)
                    )
                  ).length
                }
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setErrorGuardar(null); setModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition">
            + Nuevo Pedido
          </button>
          <button
            onClick={() => setModalRepetirOpen(true)}
            title="Repetir pedido anterior"
            className="p-2.5 rounded-lg border border-gray-300 text-gray-500 hover:text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-colors shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["N° Pedido", "Origen", "Fecha", "Impresión", "Empresa", "Productos", "Total", "Acciones"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loadingPeds ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
                <p className="mt-3 text-gray-500">Cargando pedidos...</p>
              </td></tr>
            ) : pedidosPagina.length > 0 ? pedidosPagina.map(ped => {
              const expandida = expandidas.has(ped.no_pedido);
              const tienePapel = ped.productos.some(esLineaPapel);
              const tienePlastico = ped.productos.some(p => !esLineaPapel(p));
              return (
                <>
                  <tr key={ped.no_pedido} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{ped.no_pedido}</span>
                        {ped.prioridad && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700" title="Pedido urgente">⚡</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{origenBadge(ped)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatFecha(ped.fecha)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{ped.impresion || "—"}</p>
                      {ped.telefono && <p className="text-xs text-gray-400">{ped.telefono}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{ped.empresa || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <button onClick={() => toggleExpandida(ped.no_pedido)} className="flex items-center gap-2 group">
                        <span className="font-medium text-gray-700 group-hover:text-blue-600">{ped.productos.length} producto(s)</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandida ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">${ped.total.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/pedido/${ped.no_pedido}/editar`)}
                          title={tienePapel && tienePlastico ? "Editar pedido mixto" : "Editar pedido"}
                          className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setMenuPdfAbierto(prev => (prev === ped.no_pedido ? null : ped.no_pedido))
                            }
                            title="Descargar PDF"
                            disabled={descargandoPdf === ped.no_pedido}
                            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                          >
                            {descargandoPdf === ped.no_pedido ? (
                              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </button>

                          {menuPdfAbierto === ped.no_pedido && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuPdfAbierto(null)}
                              />
                              <div className="absolute right-0 z-20 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                <button
                                  onClick={() => handleDescargarPdf(ped, "carta")}
                                  className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  📄 <span>PDF normal (carta)</span>
                                </button>
                                <button
                                  onClick={() => handleDescargarPdf(ped, "membretado")}
                                  className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                                >
                                  🖨️ <span>Hoja EB (membretada)</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <button onClick={() => handleEliminar(ped)} title="Cancelar pedido"
                          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandida && (
                    <tr key={`det-${ped.no_pedido}`} className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={8} className="px-8 py-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            {ped.correo && <p className="text-xs text-gray-500">📧 {ped.correo}</p>}
                            {ped.telefono && <p className="text-xs text-gray-500">📞 {ped.telefono}</p>}
                          </div>
                          {ped.productos.map((p: any, i: number) => {
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
                                    {p.descripcion && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">{p.descripcion}</span>
                                    )}
                                    {!papel && productoTieneKilos(p) && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Incluye kg</span>
                                    )}
                                  </div>

                                  {papel ? (
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
                                    <>
                                      {p.medidasFormateadas && <p className="text-xs text-gray-400 mt-0.5">Medidas: {p.medidasFormateadas}</p>}
                                      <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-400">
                                        {p.calibre && <span>Calibre: {p.calibre}</span>}
                                        {p.tintas && <span>Tintas: {p.tintas}</span>}
                                        {p.caras && <span>Caras: {p.caras}</span>}
                                      </div>
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
                                      {p.observacion && <p className="text-xs text-gray-500 mt-1 italic">Obs: {p.observacion}</p>}
                                    </>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 flex-shrink-0">
                                  {p.detalles.map((d: any, j: number) => (
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
                {busqueda ? `No se encontraron pedidos para "${busqueda}"` : "No hay pedidos registrados"}
              </td></tr>
            )}
          </tbody>
        </table>
        {!loadingPeds && pedidosFiltrados.length > 0 && <Paginador />}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          if (!pasoMaquinaria && !guardando) setModalOpen(false);
        }}
        title={pasoMaquinaria ? "Paso 2 de 2 - Maquinaria" : "Nuevo Pedido Directo"}
      >
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
            {errorGuardar && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">❌ {errorGuardar}</p>
              </div>
            )}
            {guardando && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                <p className="text-blue-700 text-sm">Guardando pedido y generando PDF...</p>
              </div>
            )}
            {pasoMaquinaria ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900">
                  Pedido {pasoMaquinaria.noPedido} registrado.
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Completa la maquinaria para finalizar el levantamiento.
                </p>
              </div>
            ) : (
              <FormularioCotizacion
                onSubmit={handleSubmit}
                onCancel={() => setModalOpen(false)}
                catalogos={catalogos}
                modo="pedido"
              />
            )}
          </div>
        )}
      </Modal>

      {pasoMaquinaria && (
        <ModalMaquinariaPedidoPapel
          productos={pasoMaquinaria.pedido.productos}
          onCancel={() => {
            setErrorGuardar(
              "Debes configurar la maquinaria para finalizar el pedido."
            );
          }}
          onConfirm={handleConfirmarMaquinaria}
        />
      )}

      {modalRepetirOpen && (
        <ModalRepetirPedido
          onSeleccionar={handleRepetirPedido}
          onClose={() => setModalRepetirOpen(false)}
        />
      )}
    </Dashboard>
  );
}