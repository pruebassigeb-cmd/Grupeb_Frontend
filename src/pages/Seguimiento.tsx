import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import { getSeguimiento, getOrdenProduccion } from "../services/seguimientoService";
import type { OrdenProduccionProducto } from "../services/seguimientoService";
import { generarPdfOrdenProduccion } from "../services/generarPdfOrdenProduccion";
import { generarPdfEstadoCuentaSimple } from "../services/generarPdfEstadoCuentaSimple";
import { getEstadoCuenta } from "../services/estadoCuentaService";
import { getVentaByPedido, getMetodosPago } from "../services/ventasservice";
import type { PedidoSeguimiento } from "../types/seguimiento.types";
import type { Venta, MetodoPago } from "../types/ventas.types";
import type { Pedido } from "../types/cotizaciones.types";
import Modal from "../components/Modal";
import ModalProcesoIndividual from "../components/ModalProcesoIndividual";
import { EditarAntLiqReal } from "./AnticipoLiquidacion";
import { EditarDisenoReal } from "./Diseno";
import { useAuth } from "../context/AuthContext";

import { usePermiso } from "../hooks/usePermiso";
import ModalVerificarOperador from "../components/ModalVerificarOperador";

// ─────────────────────────────────────────────
// HELPERS DE COLOR / TEXTO
// ─────────────────────────────────────────────
const obtenerColorEstado = (estado: string) => {
  switch (estado) {
    case "finalizado": case "aprobado": case "pagado": case "enviado":
      return "bg-green-100 text-green-800 border-green-300";
    case "proceso":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "detenido":
      return "bg-red-100 text-red-800 border-red-300";
    case "pendiente":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "resagado":
      return "bg-black text-white border-black";
    case "no-aplica":
      return "bg-gray-100 text-gray-400 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
};

const obtenerTextoEstado = (estado: string) => {
  const mapa: Record<string, string> = {
    finalizado: "✓", proceso: "⚙", pendiente: "–",
    resagado: "!", "no-aplica": "N/A", aprobado: "✓", pagado: "✓",
  };
  return mapa[estado] ?? "–";
};

// ─────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────
const Badge = ({
  estado, clickable = false, onClick,
}: {
  estado: string; clickable?: boolean; onClick?: () => void;
}) => {
  const base   = `inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${obtenerColorEstado(estado)}`;
  const cursor = clickable && estado !== "no-aplica"
    ? "cursor-pointer hover:scale-110 hover:shadow-md transition-transform"
    : "";
  return (
    <span title={estado} className={`${base} ${cursor}`}
      onClick={clickable && estado !== "no-aplica" ? onClick : undefined}>
      {obtenerTextoEstado(estado)}
    </span>
  );
};

const BadgeTexto = ({ estado }: { estado: string }) => {
  const textos: Record<string, string> = {
    finalizado: "Finalizado", proceso: "En Proceso", pendiente: "Pendiente",
    resagado: "Resagado", "no-aplica": "N/A", aprobado: "Aprobado", pagado: "Pagado ✓",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${obtenerColorEstado(estado)}`}>
      {textos[estado] ?? estado}
    </span>
  );
};

const BadgeTextoBtn = ({
  estado, onClick, cargando = false,
}: {
  estado: string; onClick: () => void; cargando?: boolean;
}) => {
  const textos: Record<string, string> = {
    finalizado: "Finalizado", proceso: "En Proceso", pendiente: "Pendiente",
    resagado: "Resagado", "no-aplica": "N/A", aprobado: "Aprobado", pagado: "Pagado ✓",
  };
  return (
    <button onClick={onClick} disabled={cargando} title="Abrir módulo"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-all
        hover:brightness-95 hover:shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed
        ${obtenerColorEstado(estado)}`}>
      {cargando && <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {textos[estado] ?? estado}
    </button>
  );
};

const IconoPdf = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ─────────────────────────────────────────────
// BOTON ESTADO DE CUENTA PDF
// ─────────────────────────────────────────────
function BotonEstadoCuentaPdf({ noPedido }: { noPedido: string }) {
  const [descargando, setDescargando] = useState(false);
  const handleDescargar = async () => {
    setDescargando(true);
    try {
      const datos = await getEstadoCuenta(noPedido);
      await generarPdfEstadoCuentaSimple(datos);
    } catch (e: any) {
      const msg = e?.response?.data?.detalle || e?.response?.data?.error || null;
      alert(msg
        ? `Estado de cuenta no disponible:\n${msg}`
        : "El estado de cuenta aun no esta disponible. Verifica que todos los procesos hayan finalizado."
      );
    } finally { setDescargando(false); }
  };
  return (
    <div className="flex items-center justify-center">
      <button onClick={handleDescargar} disabled={descargando}
        title="Descargar estado de cuenta cliente"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-medium rounded transition-colors">
        {descargando
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <IconoPdf />
        }
        {descargando ? "..." : "PDF"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOTON PDF ORDEN DE PRODUCCION
// ─────────────────────────────────────────────
function BotonPdfDirecto({ pedido }: { pedido: PedidoSeguimiento }) {
  const [descargando, setDescargando] = useState(false);
  const handleDescargar = async () => {
    setDescargando(true);
    try {
      const data = await getOrdenProduccion(pedido.no_pedido);
      const producto: OrdenProduccionProducto | undefined =
        data.productos.find((p: any) => p.no_produccion === pedido.no_produccion);
      if (!producto) { alert("No se encontro la orden."); return; }
      await generarPdfOrdenProduccion({
        no_pedido: data.no_pedido, no_produccion: producto.no_produccion,
        fecha: data.fecha, fecha_produccion: producto.fecha_produccion,
        fecha_aprobacion_diseno: producto.fecha_aprobacion_diseno,
        observaciones_diseno: producto.observaciones_diseno ?? null,
        cliente: data.cliente, empresa: data.empresa, telefono: data.telefono,
        correo: data.correo, impresion: data.impresion, prioridad: data.prioridad ?? false,
        nombre_producto: producto.nombre_producto, categoria: producto.categoria,
        material: producto.material, calibre: producto.calibre, medida: producto.medida,
        altura: producto.altura, ancho: producto.ancho, fuelle_fondo: producto.fuelle_fondo,
        fuelle_lat_iz: producto.fuelle_lat_iz, fuelle_lat_de: producto.fuelle_lat_de,
        refuerzo: producto.refuerzo, por_kilo: producto.por_kilo, medidas: producto.medidas,
        tintas: producto.tintas, caras: producto.caras, bk: producto.bk, foil: producto.foil,
        alto_rel: producto.alto_rel, laminado: producto.laminado, uv_br: producto.uv_br,
        pigmentos: producto.pigmentos, pantones: producto.pantones, asa_suaje: producto.asa_suaje,
        color_asa_nombre: producto.color_asa_nombre ?? null,
        medida_troquel: producto.medida_troquel ?? null, observacion: producto.observacion,
        cantidad: producto.cantidad, kilogramos: producto.kilogramos, modo_cantidad: producto.modo_cantidad,
        repeticion_extrusion: producto.repeticion_extrusion ?? null,
        repeticion_metro: producto.repeticion_metro ?? null,
        metros: producto.metros ?? null, ancho_bobina: producto.ancho_bobina ?? null,
        repeticion_kidder: producto.repeticion_kidder ?? null,
        repeticion_sicosa: producto.repeticion_sicosa ?? null,
        fecha_entrega: producto.fecha_entrega ?? null,
        kilos: producto.kilos ?? null, kilos_merma: producto.kilos_merma ?? null,
        pzas: producto.pzas ?? null, pzas_merma: producto.pzas_merma ?? null,
        kilos_extruir: producto.kilos_extruir ?? null, metros_extruir: producto.metros_extruir ?? null,
      });
    } catch { alert("No se pudo generar el PDF."); }
    finally { setDescargando(false); }
  };
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <span className="text-xs font-medium text-gray-700">{pedido.no_produccion}</span>
      <button onClick={handleDescargar} disabled={descargando}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-medium rounded transition-colors">
        {descargando
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <IconoPdf />
        }
        PDF
      </button>
    </div>
  );
}

function RenderOrdenProduccion({ pedido }: { pedido: PedidoSeguimiento }) {
  if (!pedido.puede_pdf || !pedido.no_produccion) {
    const tooltip = !pedido.anticipo_cubierto && !pedido.diseno_aprobado
      ? "Falta anticipo y diseno"
      : !pedido.anticipo_cubierto ? "Falta anticipo" : "Diseno no aprobado";
    return (
      <span title={tooltip}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 text-gray-400 text-xs rounded cursor-not-allowed">
        <IconoPdf /> PDF
      </span>
    );
  }
  return <BotonPdfDirecto pedido={pedido} />;
}

// ─────────────────────────────────────────────
// TABLA — columnas y header
// ─────────────────────────────────────────────
const COLUMNAS = [
  "Fecha", "N° Pedido", "Impresion", "Tipo",
  "Anticipo", "Diseno", "Orden",
  "Ext", "Imp", "Bol", "Asa",
  "E. Cta", "Pago", "Envio",
];
const COLS_CENTRADAS = new Set([
  "Anticipo", "Diseno", "Orden",
  "Ext", "Imp", "Bol", "Asa",
  "E. Cta", "Pago", "Envio",
]);

const renderThead = (oscuro = false) => (
  <thead className={oscuro ? "bg-gray-900 text-white" : "bg-gray-100 border-b border-gray-200"}>
    <tr>
      {COLUMNAS.map(h => (
        <th key={h}
          className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
            oscuro ? "text-white" : "text-gray-700"
          } ${COLS_CENTRADAS.has(h) ? "text-center" : "text-left"}`}>
          {h}
        </th>
      ))}
    </tr>
  </thead>
);

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function Seguimiento() {
  const [pedidos,          setPedidos]          = useState<PedidoSeguimiento[]>([]);
  const [cargando,         setCargando]         = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [filtroTipo,       setFiltroTipo]       = useState("todos");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  const [modalProceso, setModalProceso] = useState<{
    pedido: PedidoSeguimiento; nombreProceso: string;
  } | null>(null);

  const [modalAnticipo,    setModalAnticipo]    = useState<{ venta: Venta; metodos: MetodoPago[] } | null>(null);
  const [cargandoAnticipo, setCargandoAnticipo] = useState<string | null>(null);
  const [modalDiseno,      setModalDiseno]      = useState<Pedido | null>(null);

  const [modalVerificacion, setModalVerificacion] = useState<{
    pedido: PedidoSeguimiento;
    proceso: "extrusion" | "impresion" | "bolseo" | "asa_flexible";
  } | null>(null);

  const { user } = useAuth();
  const esAccesoTotal    = user?.acceso_total ?? false;
  const puedeExtrusion   = esAccesoTotal || usePermiso("Operar Extrusión");
  const puedeImpresion   = esAccesoTotal || usePermiso("Operar Impresión");
  const puedeBolseo      = esAccesoTotal || usePermiso("Operar Bolseo");
  const puedeAsaFlexible = esAccesoTotal || usePermiso("Operar Asa Flexible");
  const esRolPlanta      = usePermiso("Acceso Planta");
  const puedeVerECta     = esAccesoTotal || usePermiso("Editar Anticipo y Liquidacion");

  useEffect(() => {
    cargar();
    const onVisible = () => { if (document.visibilityState === "visible") cargar(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const cargar = async () => {
    try {
      setCargando(true); setError(null);
      const data = await getSeguimiento();
      setPedidos(data);
    } catch { setError("No se pudo cargar el seguimiento."); }
    finally { setCargando(false); }
  };

  const abrirAnticipo = async (pedido: PedidoSeguimiento) => {
    if (cargandoAnticipo) return;
    setCargandoAnticipo(pedido.no_pedido);
    try {
      const [venta, metodos] = await Promise.all([
        getVentaByPedido(pedido.no_pedido),
        getMetodosPago(),
      ]);
      setModalAnticipo({ venta, metodos });
    } catch {
      alert("No se pudo cargar la informacion de anticipo.");
    } finally { setCargandoAnticipo(null); }
  };

  const abrirDiseno = (pedido: PedidoSeguimiento) => {
    setModalDiseno({
      no_pedido:        pedido.no_pedido,
      no_cotizacion:    (pedido as any).no_cotizacion ?? null,
      cliente:          pedido.cliente ?? "",
      empresa:          (pedido as any).empresa ?? "",
      fecha:            pedido.fecha,
      impresion:        pedido.impresion ?? "",
      productos:        [],
      diseno_estado_id: pedido.diseno_aprobado ? 3 : 1,
    } as any);
  };

  const pedidosFiltrados = filtroTipo === "todos"
    ? pedidos
    : pedidos.filter(p => (p.tipo_producto || "").toLowerCase().includes(filtroTipo));

  const renderFila = (pedido: PedidoSeguimiento, grande = false) => {
    const px  = grande ? "px-4 py-3" : "px-3 py-2";
    const txt = grande ? "text-sm"   : "text-xs";

    const estadoAnticipo = pedido.anticipo_cubierto ? "pagado"   : "pendiente";
    const estadoDiseño   = pedido.diseno_aprobado   ? "aprobado" : "pendiente";
    const pagadoReal     = pedido.saldo_venta != null ? pedido.saldo_venta <= 0.01 : pedido.pago_completo;
    const estadoPago     = pagadoReal ? "pagado" : pedido.anticipo_cubierto ? "proceso" : "pendiente";

    const tieneOrden = !!pedido.no_produccion && !!pedido.idproduccion;
    const extEstado  = tieneOrden ? pedido.extrusion_estado    : "no-aplica";
    const impEstado  = tieneOrden ? pedido.impresion_estado    : "no-aplica";
    const bolEstado  = tieneOrden ? pedido.bolseo_estado       : "no-aplica";
    const asaEstado  = tieneOrden ? pedido.asa_flexible_estado : "no-aplica";

    const abrirProceso = (nombreProceso: string) => {
      if (!tieneOrden) return;
      setModalProceso({ pedido, nombreProceso });
    };

    return (
      <tr key={`${pedido.no_pedido}-${pedido.no_produccion}`}
        className="hover:bg-gray-50 transition-colors border-t border-gray-200">
        <td className={`${px} ${txt} text-gray-900 whitespace-nowrap`}>
          {new Date(pedido.fecha).toLocaleDateString("es-MX")}
        </td>
        <td className={`${px} ${txt} font-medium text-blue-600 whitespace-nowrap`}>{pedido.no_pedido}</td>
        <td className={`${px} ${txt} text-gray-900`}>{pedido.impresion}</td>
        <td className={`${px}`}>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
            {pedido.tipo_producto || "—"}
          </span>
        </td>

        <td className={`${px} text-center`}>
          {esAccesoTotal
            ? <BadgeTextoBtn estado={estadoAnticipo} cargando={cargandoAnticipo === pedido.no_pedido} onClick={() => abrirAnticipo(pedido)} />
            : <BadgeTexto estado={estadoAnticipo} />
          }
        </td>

        <td className={`${px} text-center`}>
          {esAccesoTotal
            ? <BadgeTextoBtn estado={estadoDiseño} onClick={() => abrirDiseno(pedido)} />
            : <BadgeTexto estado={estadoDiseño} />
          }
        </td>

        <td className={`${px} text-center`}><RenderOrdenProduccion pedido={pedido} /></td>

        <td className={`${px} text-center`}>
          <Badge estado={extEstado}
            clickable={tieneOrden && extEstado !== "no-aplica" && (puedeExtrusion || esRolPlanta)}
            onClick={() => {
              if (!tieneOrden) return;
              puedeExtrusion
                ? abrirProceso("extrusion")
                : setModalVerificacion({ pedido, proceso: "extrusion" });
            }}
          />
        </td>

        <td className={`${px} text-center`}>
          <Badge estado={impEstado}
            clickable={tieneOrden && impEstado !== "no-aplica" && (puedeImpresion || esRolPlanta)}
            onClick={() => {
              if (!tieneOrden) return;
              puedeImpresion
                ? abrirProceso("impresion")
                : setModalVerificacion({ pedido, proceso: "impresion" });
            }}
          />
        </td>

        <td className={`${px} text-center`}>
          <Badge estado={bolEstado}
            clickable={tieneOrden && bolEstado !== "no-aplica" && (puedeBolseo || esRolPlanta)}
            onClick={() => {
              if (!tieneOrden) return;
              puedeBolseo
                ? abrirProceso("bolseo")
                : setModalVerificacion({ pedido, proceso: "bolseo" });
            }}
          />
        </td>

        <td className={`${px} text-center`}>
          <Badge estado={asaEstado}
            clickable={tieneOrden && asaEstado !== "no-aplica" && (puedeAsaFlexible || esRolPlanta)}
            onClick={() => {
              if (!tieneOrden) return;
              puedeAsaFlexible
                ? abrirProceso("asa_flexible")
                : setModalVerificacion({ pedido, proceso: "asa_flexible" });
            }}
          />
        </td>

        <td className={`${px} text-center`}>
          {puedeVerECta
            ? <BotonEstadoCuentaPdf noPedido={pedido.no_pedido} />
            : <span className="text-gray-300 text-xs">—</span>
          }
        </td>

        <td className={`${px} text-center`}><BadgeTexto estado={estadoPago} /></td>
        <td className={`${px} text-center`}><BadgeTexto estado="pendiente" /></td>
      </tr>
    );
  };

  if (cargando) return (
    <Dashboard>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Cargando seguimiento...</p>
        </div>
      </div>
    </Dashboard>
  );

  if (error) return (
    <Dashboard>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-3">{error}</p>
          <button onClick={cargar} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Reintentar</button>
        </div>
      </div>
    </Dashboard>
  );

  if (pantallaCompleta) return (
    <div className="p-6 min-h-screen bg-gray-50">
      <button onClick={() => setPantallaCompleta(false)}
        className="mb-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cerrar
      </button>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {renderThead(true)}
            <tbody>{pedidosFiltrados.map(p => renderFila(p, true))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Dashboard>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Seguimiento de Pedidos</h1>
        <p className="text-gray-600">Monitorea el estado de todos los pedidos en tiempo real</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Filtrar por tipo:</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "todos",    label: "Todos"    },
              { key: "plastico", label: "Plastico" },
              { key: "papel",    label: "Papel"    },
              { key: "carton",   label: "Carton"   },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroTipo(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === f.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Leyenda:</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { color: "bg-green-500",  label: "Finalizado / Aprobado / Pagado" },
            { color: "bg-yellow-400", label: "En Proceso" },
            { color: "bg-orange-400", label: "Pendiente" },
            { color: "bg-red-500",    label: "Detenido" },
            { color: "bg-black",      label: "Resagado" },
            { color: "bg-gray-300",   label: "No Aplica" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${l.color}`} />
              <span className="text-xs text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de Ordenes
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({pedidosFiltrados.length} orden{pedidosFiltrados.length !== 1 ? "es" : ""})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={cargar} disabled={cargando} title="Actualizar"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 rounded-lg transition-colors">
              <svg className={"w-5 h-5 " + (cargando ? "animate-spin" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={() => setPantallaCompleta(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            {renderThead()}
            <tbody>{pedidosFiltrados.map(p => renderFila(p))}</tbody>
          </table>
        </div>
        {pedidosFiltrados.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-lg font-medium text-gray-900">No hay ordenes</p>
            <p className="text-sm text-gray-500 mt-1">No se encontraron ordenes con los filtros seleccionados</p>
          </div>
        )}
      </div>

      {/* Modal proceso */}
      {modalProceso && (
        <Modal isOpen={!!modalProceso} onClose={() => setModalProceso(null)}
          title={`${modalProceso.nombreProceso.replace("_", " ").toUpperCase()} — ${modalProceso.pedido.no_produccion}`}>
          <ModalProcesoIndividual
            pedido={modalProceso.pedido}
            nombreProceso={modalProceso.nombreProceso}
            onClose={() => setModalProceso(null)}
            onActualizar={cargar}
          />
        </Modal>
      )}

      {/* Modal anticipo */}
      {modalAnticipo && (
        <Modal isOpen={!!modalAnticipo} onClose={() => { setModalAnticipo(null); cargar(); }} title="Anticipo y Liquidacion">
          <EditarAntLiqReal
            venta={modalAnticipo.venta}
            metodos={modalAnticipo.metodos}
            onClose={() => { setModalAnticipo(null); cargar(); }}
            onActualizar={(ventaActualizada) => {
              setModalAnticipo(prev => prev ? { ...prev, venta: ventaActualizada } : null);
            }}
          />
        </Modal>
      )}

      {/* Modal diseno */}
      {modalDiseno && (
        <Modal isOpen={!!modalDiseno} onClose={() => setModalDiseno(null)} title="Gestionar Disenos">
          <EditarDisenoReal
            pedido={modalDiseno}
            onClose={() => setModalDiseno(null)}
            onEstadoChange={() => { cargar(); }}
          />
        </Modal>
      )}

      {/* Modal verificacion operador */}
      {modalVerificacion && (
        <ModalVerificarOperador
          proceso={modalVerificacion.proceso}
          onSuccess={() => {
            const { pedido, proceso } = modalVerificacion;
            setModalVerificacion(null);
            setModalProceso({ pedido, nombreProceso: proceso });
          }}
          onCancel={() => setModalVerificacion(null)}
        />
      )}
    </Dashboard>
  );
}