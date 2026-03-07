import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import { getSeguimiento, getOrdenProduccion } from "../services/seguimientoService";
import type { OrdenProduccionProducto } from "../services/seguimientoService";
import { generarPdfOrdenProduccion } from "../services/generarPdfOrdenProduccion";
import type { PedidoSeguimiento } from "../types/seguimiento.types";

type EstadoProceso =
  | "pendiente" | "proceso" | "finalizado"
  | "detenido"  | "resagado" | "no-aplica";

const PROCESOS_DEFAULT: Record<string, EstadoProceso> = {
  extrusion:   "pendiente",
  impresion:   "pendiente",
  bolseo:      "pendiente",
  troquelado:  "pendiente",
  asaFlexible: "pendiente",
};

const obtenerColorEstado = (estado: string) => {
  switch (estado) {
    case "finalizado": case "aprobado": case "pagado": case "enviado":
      return "bg-green-100 text-green-800 border-green-300";
    case "proceso": case "revision": case "parcial":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "detenido":
      return "bg-red-100 text-red-800 border-red-300";
    case "pendiente":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "resagado":
      return "bg-black text-white border-black";
    case "no-aplica":
      return "bg-gray-100 text-gray-500 border-gray-300";
    default:
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
};

const obtenerTextoEstado = (estado: string) => {
  const mapa: Record<string, string> = {
    finalizado:  "Finalizado",  proceso:     "En Proceso",
    pendiente:   "Pendiente",   detenido:    "Detenido",
    resagado:    "Resagado",    "no-aplica": "N/A",
    aprobado:    "Aprobado",    revision:    "En Revisión",
    pagado:      "Pagado",      parcial:     "Pago Parcial",
    enviado:     "Enviado",
  };
  return mapa[estado] ?? estado;
};

const Badge = ({ estado }: { estado: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${obtenerColorEstado(estado)}`}>
    {obtenerTextoEstado(estado)}
  </span>
);

const IconoPdf = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const COLUMNAS = [
  "Fecha", "N° Pedido", "Cliente", "Tipo",
  "Anticipo", "Diseño", "Orden Producción",
  "Extrusión", "Impresión", "Bolseo", "Troquelado", "Asa Flex",
  "Pago", "Envío",
];

const COLS_CENTRADAS = new Set([
  "Anticipo", "Diseño", "Orden Producción",
  "Extrusión", "Impresión", "Bolseo", "Troquelado", "Asa Flex",
  "Pago", "Envío",
]);

// ── Botón PDF por orden individual ───────────────────────────
function BotonPdfDirecto({ pedido }: { pedido: PedidoSeguimiento }) {
  const [descargando, setDescargando] = useState(false);

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      const data = await getOrdenProduccion(pedido.no_pedido);

      const producto: OrdenProduccionProducto | undefined = data.productos.find(
        (p) => p.no_produccion === pedido.no_produccion
      );

      if (!producto) {
        alert("No se encontró la orden de producción.");
        return;
      }

      await generarPdfOrdenProduccion({
        no_pedido:               data.no_pedido,
        no_produccion:           producto.no_produccion,
        fecha:                   data.fecha,
        fecha_produccion:        producto.fecha_produccion,
        fecha_aprobacion_diseno: producto.fecha_aprobacion_diseno,
        cliente:                 data.cliente,
        empresa:                 data.empresa,
        telefono:                data.telefono,
        correo:                  data.correo,
        impresion:               data.impresion,
        nombre_producto:         producto.nombre_producto,
        categoria:               producto.categoria,
        material:                producto.material,
        calibre:                 producto.calibre,
        medida:                  producto.medida,
        altura:                  producto.altura,
        ancho:                   producto.ancho,
        fuelle_fondo:            producto.fuelle_fondo,
        fuelle_lat_iz:           producto.fuelle_lat_iz,
        fuelle_lat_de:           producto.fuelle_lat_de,
        refuerzo:                producto.refuerzo,
        por_kilo:                producto.por_kilo,
        medidas:                 producto.medidas,
        tintas:                  producto.tintas,
        caras:                   producto.caras,
        bk:                      producto.bk,
        foil:                    producto.foil,
        alto_rel:                producto.alto_rel,
        laminado:                producto.laminado,
        uv_br:                   producto.uv_br,
        pigmentos:               producto.pigmentos,
        pantones:                producto.pantones,
        asa_suaje:               producto.asa_suaje,
        observacion:             producto.observacion,
        cantidad:                producto.cantidad,
        kilogramos:              producto.kilogramos,
        modo_cantidad:           producto.modo_cantidad,
      });
    } catch (e) {
      console.error("❌ PDF orden producción:", e);
      alert("No se pudo generar la Orden de Producción.");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 justify-center">
      <span className="text-xs font-medium text-gray-700">
        {pedido.no_produccion}
      </span>
      <button
        onClick={handleDescargar}
        disabled={descargando}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-medium rounded transition-colors"
        title={`Descargar ${pedido.no_produccion}`}
      >
        {descargando
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <IconoPdf />
        }
        PDF
      </button>
    </div>
  );
}

// ── Columna Orden de Producción ───────────────────────────────
function RenderOrdenProduccion({ pedido }: { pedido: PedidoSeguimiento }) {
  if (!pedido.puede_pdf || !pedido.no_produccion) {
    const tooltip = !pedido.anticipo_cubierto && !pedido.diseno_aprobado
      ? "Falta anticipo y aprobación de diseño"
      : !pedido.anticipo_cubierto
      ? "Falta anticipo del 50%"
      : "Diseño de este producto aún no aprobado";

    return (
      <span
        title={tooltip}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 text-gray-400 text-xs font-medium rounded cursor-not-allowed select-none"
      >
        <IconoPdf />
        PDF
      </span>
    );
  }

  return <BotonPdfDirecto pedido={pedido} />;
}

// ── Agrupar filas por pedido ──────────────────────────────────
function agruparPorPedido(pedidos: PedidoSeguimiento[]) {
  const grupos: Map<number, PedidoSeguimiento[]> = new Map();
  for (const p of pedidos) {
    if (!grupos.has(p.no_pedido)) grupos.set(p.no_pedido, []);
    grupos.get(p.no_pedido)!.push(p);
  }
  return grupos;
}

export default function Seguimiento() {
  const [pedidos,          setPedidos]          = useState<PedidoSeguimiento[]>([]);
  const [cargando,         setCargando]         = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [filtroTipo,       setFiltroTipo]       = useState("todos");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError(null);
        setPedidos(await getSeguimiento());
      } catch (err: any) {
        console.error("❌ Seguimiento:", err);
        setError("No se pudo cargar el seguimiento. Intenta de nuevo.");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const pedidosFiltrados = filtroTipo === "todos"
    ? pedidos
    : pedidos.filter(p => (p.tipo_producto || "").toLowerCase().includes(filtroTipo));

  const grupos = agruparPorPedido(pedidosFiltrados);

  const renderFilas = (grupo: PedidoSeguimiento[], grande = false) => {
    const px  = grande ? "px-4 py-3" : "px-3 py-2";
    const txt = grande ? "text-sm"   : "text-xs";
    const p   = PROCESOS_DEFAULT;

    return grupo.map((pedido, idx) => {
      const esPrimera      = idx === 0;
      const estadoAnticipo = pedido.anticipo_cubierto ? "pagado"   : "pendiente";
      const estadoDiseño   = pedido.diseno_aprobado   ? "aprobado" : "pendiente";

      return (
        <tr
          key={`${pedido.no_pedido}-${pedido.no_produccion ?? idx}`}
          className={`hover:bg-gray-50 transition-colors ${
            esPrimera
              ? "border-t-2 border-gray-300"
              : "border-t border-dashed border-gray-200"
          }`}
        >
          {/* Datos del pedido — solo en primera fila */}
          <td className={`${px} ${txt} text-gray-900 whitespace-nowrap`}>
            {esPrimera ? new Date(pedido.fecha).toLocaleDateString("es-MX") : ""}
          </td>
          <td className={`${px} ${txt} font-medium text-blue-600 whitespace-nowrap`}>
            {esPrimera ? `PED-${pedido.no_pedido}` : ""}
          </td>
          <td className={`${px} ${txt} text-gray-900`}>
            {esPrimera ? pedido.cliente : ""}
          </td>
          <td className={`${px}`}>
            {esPrimera && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                {pedido.tipo_producto || "—"}
              </span>
            )}
          </td>
          <td className={`${px} text-center`}>
            {esPrimera && <Badge estado={estadoAnticipo} />}
          </td>
          <td className={`${px} text-center`}>
            {esPrimera && <Badge estado={estadoDiseño} />}
          </td>

          {/* Columna individual por producto — siempre visible */}
          <td className={`${px} text-center`}>
            <RenderOrdenProduccion pedido={pedido} />
          </td>

          <td className={`${px} text-center`}><Badge estado={p.extrusion}   /></td>
          <td className={`${px} text-center`}><Badge estado={p.impresion}   /></td>
          <td className={`${px} text-center`}><Badge estado={p.bolseo}      /></td>
          <td className={`${px} text-center`}><Badge estado={p.troquelado}  /></td>
          <td className={`${px} text-center`}><Badge estado={p.asaFlexible} /></td>
          <td className={`${px} text-center`}><Badge estado="pendiente"     /></td>
          <td className={`${px} text-center`}><Badge estado="pendiente"     /></td>
        </tr>
      );
    });
  };

  const renderThead = (oscuro = false) => (
    <thead className={oscuro ? "bg-gray-900 text-white" : "bg-gray-100 border-b border-gray-200"}>
      <tr>
        {COLUMNAS.map(h => (
          <th key={h} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider
            ${oscuro ? "text-white" : "text-gray-700"}
            ${COLS_CENTRADAS.has(h) ? "text-center" : "text-left"}`}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );

  if (cargando) return (
    <Dashboard userName="Administrador">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Cargando seguimiento...</p>
        </div>
      </div>
    </Dashboard>
  );

  if (error) return (
    <Dashboard userName="Administrador">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-3">{error}</p>
          <button onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Reintentar
          </button>
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
            <tbody className="divide-y divide-gray-200">
              {Array.from(grupos.values()).map(grupo => renderFilas(grupo, true))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Dashboard userName="Administrador">
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
              { key: "plástico", label: "Plástico" },
              { key: "papel",    label: "Papel"    },
              { key: "cartón",   label: "Cartón"   },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroTipo(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === f.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Leyenda de Estados:</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { color: "bg-green-500",  label: "Finalizado / Aprobado / Pagado" },
            { color: "bg-yellow-500", label: "En Proceso"                     },
            { color: "bg-orange-500", label: "Pendiente"                      },
            { color: "bg-red-500",    label: "Detenido"                       },
            { color: "bg-black",      label: "Resagado"                       },
            { color: "bg-gray-400",   label: "No Aplica"                      },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${l.color}`} />
              <span className="text-sm text-gray-700">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de Pedidos
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({grupos.size} pedido{grupos.size !== 1 ? "s" : ""})
            </span>
          </h2>
          <button onClick={() => setPantallaCompleta(true)} title="Pantalla completa"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            {renderThead()}
            <tbody>
              {Array.from(grupos.values()).map(grupo => renderFilas(grupo))}
            </tbody>
          </table>
        </div>
        {grupos.size === 0 && (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-900">No hay pedidos</p>
            <p className="text-sm text-gray-500 mt-1">No se encontraron pedidos con los filtros seleccionados</p>
          </div>
        )}
      </div>
    </Dashboard>
  );
}