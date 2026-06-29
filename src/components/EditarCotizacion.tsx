import { useState } from "react";
import type {
  Cotizacion,
  ProductoCotizacion,
  ProductoPapelCotizacionLeido,
} from "../types/cotizaciones.types";
import {
  aprobarDetalle,
  aprobarHerramental,
  actualizarObservacion,
  actualizarEstado,
} from "../services/cotizacionesService";
import { generarPdfPedido } from "../services/generarPdfPedido";
import { getVentaByPedido } from "../services/ventasservice";
import { showConfirm } from "./CustomConfirm";
import ModalMaquinariaPedidoPapel from "./papel/ModalMaquinariaPedidoPapel";
import type { MaquinariaProductoPedidoPapel } from "../types/papel/maquinaria-pedido.types";

const ESTADO_ID = {
  PENDIENTE: 1,
  EN_PROCESO: 2,
  APROBADO: 3,
  RECHAZADO: 4,
} as const;

interface EditarCotizacionProps {
  cotizacion: Cotizacion;
  onSave: (cotizacionActualizada: Cotizacion) => void;
  onCancel: () => void;
}

function normalizarEstado(
  estado: string,
): "Pendiente" | "Aprobada" | "Rechazada" {
  const valor = (estado ?? "").toLowerCase().trim();
  if (valor === "aprobado" || valor === "aprobada") return "Aprobada";
  if (valor === "rechazado" || valor === "rechazada") return "Rechazada";
  return "Pendiente";
}

function esLineaPapel(
  producto: ProductoCotizacion,
): producto is ProductoPapelCotizacionLeido {
  const valor = producto as unknown as Record<string, unknown>;

  return (
    valor.tipo_material === "papel" ||
    valor.tipoCotizacion === "papel" ||
    valor.idproducto_papel != null ||
    valor.producto_papel_idproducto_papel != null
  );
}

function tieneCantidadAprobada(producto: ProductoCotizacion): boolean {
  return (producto.detalles ?? []).some((detalle) => detalle.aprobado === true);
}

function filtrarProductosConCantidadAprobada(
  productos: ProductoCotizacion[],
): ProductoCotizacion[] {
  return productos.filter(tieneCantidadAprobada).map((producto) => ({
    ...producto,
    detalles: producto.detalles.filter((detalle) => detalle.aprobado === true),
  }));
}

function resolverCalibre(producto: any): string {
  const material = (producto.material || "").toUpperCase();
  const esBopp =
    material.includes("BOPP") ||
    material.includes("CELOFAN") ||
    material.includes("CELOFÁN");

  if (esBopp) {
    const calibreBopp = producto.calibre_bopp
      ? String(producto.calibre_bopp).trim()
      : "";
    if (calibreBopp && calibreBopp !== "0") return calibreBopp;
  }

  const calibre = producto.calibre ? String(producto.calibre).trim() : "";
  if (calibre && calibre !== "0") return calibre;

  const calibreBopp = producto.calibre_bopp
    ? String(producto.calibre_bopp).trim()
    : "";
  return calibreBopp && calibreBopp !== "0" ? calibreBopp : "";
}

function parsearMaterialYCalibre(
  grupoDescripcion: string,
  fallbackMaterial: string,
  fallbackCalibre: string,
) {
  if (!grupoDescripcion) {
    return {
      materialStr: fallbackMaterial,
      calibreStr: fallbackCalibre,
    };
  }

  const partes = grupoDescripcion
    .split(/\s*\+\s*/)
    .map((parte) => parte.trim());
  const regexCalibre = /(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/gi;

  const materialStr =
    partes
      .map((parte) => parte.replace(regexCalibre, "").trim())
      .filter(Boolean)
      .join(" + ") || fallbackMaterial;

  const calibreStr =
    partes
      .map((parte) => {
        const coincidencia = parte.match(/(\d+(?:\.\d+)?\s*(?:pts|gms|ect))/i);
        return coincidencia ? coincidencia[1] : "";
      })
      .filter(Boolean)
      .join(" / ") || fallbackCalibre;

  return { materialStr, calibreStr };
}

function buildProductosPdf(productos: ProductoCotizacion[]) {
  return productos.map((producto) => {
    if (esLineaPapel(producto)) {
      const grupoDescripcion = producto.grupo_descripcion ?? "";
      const { materialStr, calibreStr } = parsearMaterialYCalibre(
        grupoDescripcion,
        "",
        "",
      );

      return {
        tipo_material: "papel",
        tipoCotizacion: "papel",
        nombre: producto.nombre,
        material: materialStr,
        calibre: calibreStr,
        grupo_descripcion: grupoDescripcion,
        tintas: producto.tintas ?? 0,
        tintasDentro: producto.tintasDentro ?? 0,
        caras: producto.caras ?? 0,
        medidasFormateadas: producto.medida || "",
        medidas: {},
        bk: null,
        foil: producto.foil_nombre ? true : null,
        foil_nombre: producto.foil_nombre || null,
        laminado: producto.laminado_nombre ? true : null,
        laminado_nombre: producto.laminado_nombre || null,
        asa_suaje: producto.asa_nombre || null,
        asa_nombre: producto.asa_nombre || null,
        uvBr: producto.uv ? true : null,
        alto_relieve: producto.alto_relieve === true,
        alto_rel: null,
        textura_nombre: producto.textura_nombre || null,
        pigmentos: null,
        pantones: producto.pantones ?? null,
        pantonesDentro: producto.pantonesDentro || null,
        observacion: producto.observacion ?? null,
        descripcion: producto.descripcion ?? null,
        perforacion: false,
        por_kilo: null,
        herramental_descripcion: producto.herramental_descripcion ?? null,
        herramental_precio:
          producto.herramental_precio != null
            ? Number(producto.herramental_precio)
            : null,
        herramental_aprobado: producto.herramental_aprobado ?? null,
        detalles: (producto.detalles || [])
          .filter((detalle) => detalle.aprobado === true)
          .map((detalle) => ({
            cantidad: detalle.cantidad,
            precio_total: detalle.precio_total,
            kilogramos: detalle.kilogramos ?? null,
            modo_cantidad: detalle.modo_cantidad || "unidad",
          })),
      };
    }

    return {
      nombre: producto.nombre,
      material: producto.material || "",
      calibre: resolverCalibre(producto),
      tintas: producto.tintas,
      caras: producto.caras,
      medidasFormateadas: producto.medidasFormateadas || "",
      medidas: producto.medidas || {},
      bk: null,
      foil: null,
      laminado: null,
      uvBr: null,
      pigmentos: producto.pigmentos ?? null,
      pantones: producto.pantones ?? null,
      asa_suaje: producto.asa_suaje ?? null,
      observacion: producto.observacion ?? null,
      descripcion: producto.descripcion ?? null,
      perforacion: producto.perforacion ?? false,
      por_kilo: producto.por_kilo ?? null,
      herramental_descripcion: producto.herramental_descripcion ?? null,
      herramental_precio:
        producto.herramental_precio != null
          ? Number(producto.herramental_precio)
          : null,
      herramental_aprobado: producto.herramental_aprobado ?? null,
      detalles: (producto.detalles || [])
        .filter((detalle) => detalle.aprobado === true)
        .map((detalle) => ({
          cantidad: detalle.cantidad,
          precio_total: detalle.precio_total,
          kilogramos: detalle.kilogramos ?? null,
          modo_cantidad: detalle.modo_cantidad || "unidad",
        })),
    };
  });
}

export default function EditarCotizacion({
  cotizacion,
  onSave,
  onCancel,
}: EditarCotizacionProps) {
  const [estadoActual, setEstadoActual] = useState<
    "Pendiente" | "Aprobada" | "Rechazada"
  >(normalizarEstado(cotizacion.estado));

  const [productos, setProductos] = useState<ProductoCotizacion[]>(
    cotizacion.productos.map((producto) => ({
      ...producto,
      detalles: [...producto.detalles],
    })),
  );

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState<number | null>(null);
  const [loadingHerramental, setLoadingHerramental] = useState<number | null>(
    null,
  );
  const [modalConfirmarOpen, setModalConfirmarOpen] = useState(false);
  const [modalMaquinariaOpen, setModalMaquinariaOpen] = useState(false);
  const [maquinariaConversion, setMaquinariaConversion] = useState<
    MaquinariaProductoPedidoPapel[]
  >([]);

  const totalDetallesAprobados = productos
    .flatMap((producto) => producto.detalles)
    .filter((detalle) => detalle.aprobado === true).length;

  const totalDetalles = productos.flatMap(
    (producto) => producto.detalles,
  ).length;

  const productosPapelAprobados = productos.filter(
    (producto) => esLineaPapel(producto) && tieneCantidadAprobada(producto),
  );
  const esConversionAPedido = !cotizacion.no_pedido;

  const textoBotonAprobar =
    estadoActual === "Pendiente" && totalDetallesAprobados === 0
      ? "Aprobar Cotización"
      : "Guardar Cambios";

  const handleToggleHerramental = async (
    indexProducto: number,
    herramentalId: number,
    valorActual: boolean | null,
  ) => {
    const nuevoValor = valorActual !== true;
    setLoadingHerramental(herramentalId);
    setError(null);

    try {
      await aprobarHerramental(herramentalId, nuevoValor);
      setProductos((actuales) => {
        const copia = [...actuales];
        copia[indexProducto] = {
          ...copia[indexProducto],
          herramental_aprobado: nuevoValor,
        };
        return copia;
      });
    } catch {
      setError("No se pudo actualizar el herramental.");
    } finally {
      setLoadingHerramental(null);
    }
  };

  const handleToggleDetalle = async (
    indexProducto: number,
    indexDetalle: number,
    detalleId: number,
    valorActual: boolean | null,
  ) => {
    const nuevoValor = valorActual !== true;
    setLoadingDetalle(detalleId);
    setError(null);
    setMensajeExito(null);

    try {
      if (nuevoValor) {
        const otrosDetalles = productos[indexProducto].detalles.filter(
          (detalle, indice) =>
            indice !== indexDetalle && detalle.aprobado === true,
        );

        for (const detalle of otrosDetalles) {
          await aprobarDetalle(detalle.iddetalle, false);
        }
      }

      await aprobarDetalle(detalleId, nuevoValor);

      setProductos((actuales) => {
        const copia = actuales.map((producto) => ({
          ...producto,
          detalles: [...producto.detalles],
        }));

        if (nuevoValor) {
          copia[indexProducto].detalles = copia[indexProducto].detalles.map(
            (detalle, indice) => ({
              ...detalle,
              aprobado: indice === indexDetalle,
            }),
          );
        } else {
          copia[indexProducto].detalles[indexDetalle] = {
            ...copia[indexProducto].detalles[indexDetalle],
            aprobado: false,
          };
        }

        return copia;
      });
    } catch {
      setError("No se pudo actualizar la selección.");
    } finally {
      setLoadingDetalle(null);
    }
  };

  const handleObservacion = async (
    indexProducto: number,
    productoId: number,
    valor: string,
  ) => {
    setProductos((actuales) => {
      const copia = [...actuales];
      copia[indexProducto] = {
        ...copia[indexProducto],
        observacion: valor,
      };
      return copia;
    });

    try {
      await actualizarObservacion(productoId, valor);
    } catch {
      setError("No se pudo guardar la observación.");
    }
  };

  const handleClickAprobar = () => {
    if (totalDetallesAprobados === 0) return;

    if (esConversionAPedido) {
      if (productosPapelAprobados.length > 0) {
        setModalMaquinariaOpen(true);
      } else {
        setMaquinariaConversion([]);
        setModalConfirmarOpen(true);
      }
      return;
    }

    handleCambiarEstado(ESTADO_ID.APROBADO);
  };

  const handleConfirmarMaquinaria = (
    selecciones: MaquinariaProductoPedidoPapel[],
  ) => {
    setMaquinariaConversion(selecciones);
    setModalMaquinariaOpen(false);
    setModalConfirmarOpen(true);
  };

  const handleConfirmarConversion = () => {
    setModalConfirmarOpen(false);
    handleCambiarEstado(ESTADO_ID.APROBADO, maquinariaConversion);
  };

  const descargarPdfPedido = async (noPedido: string) => {
    try {
      const venta = await getVentaByPedido(noPedido);

      await generarPdfPedido(
        {
          no_pedido: noPedido,
          no_cotizacion: cotizacion.no_cotizacion,
          fecha: new Date().toISOString(),
          cliente: cotizacion.cliente || "",
          empresa: cotizacion.empresa || "",
          telefono: cotizacion.telefono || "",
          correo: cotizacion.correo || "",
          impresion: cotizacion.impresion ?? null,
          celular: cotizacion.celular ?? null,
          razon_social: cotizacion.razon_social ?? null,
          rfc: cotizacion.rfc ?? null,
          domicilio: cotizacion.domicilio ?? null,
          numero: cotizacion.numero ?? null,
          colonia: cotizacion.colonia ?? null,
          codigo_postal: cotizacion.codigo_postal ?? null,
          poblacion: cotizacion.poblacion ?? null,
          estado_cliente: cotizacion.estado_cliente ?? null,
          cliente_id: cotizacion.cliente_id ?? null,
          identificar: cotizacion.identificar ?? null,
          subtotal: Number(venta.subtotal),
          iva: Number(venta.iva),
          total: Number(venta.total),
          anticipo: Number(venta.anticipo),
          saldo: Number(venta.saldo),
          productos: buildProductosPdf(
            filtrarProductosConCantidadAprobada(productos),
          ),
        },
        true,
      );
    } catch (pdfError) {
      console.warn(
        "No se pudo generar automáticamente el PDF de pedido:",
        pdfError,
      );
    }
  };

  const handleCambiarEstado = async (
    estadoId: number,
    maquinariaPapel: MaquinariaProductoPedidoPapel[] = [],
  ) => {
    if (estadoId === ESTADO_ID.RECHAZADO) {
      const mensaje =
        totalDetallesAprobados === 0
          ? "¿Rechazar la cotización sin aprobar ninguna opción?"
          : "¿Estás seguro de rechazar esta cotización?";
      if (!(await showConfirm(mensaje))) return;
    }

    setGuardando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const respuesta = await actualizarEstado(
        cotizacion.no_cotizacion,
        estadoId,
        maquinariaPapel,
      );

      const estadoNombre =
        estadoId === ESTADO_ID.APROBADO ? "Aprobada" : "Rechazada";
      setEstadoActual(estadoNombre);

      if (respuesta.convertida_a_pedido && respuesta.no_pedido) {
        setMensajeExito(
          `Cotización convertida al Pedido #${respuesta.no_pedido}.`,
        );
        await descargarPdfPedido(respuesta.no_pedido);
      } else {
        setMensajeExito(
          estadoId === ESTADO_ID.APROBADO
            ? "Cotización aprobada exitosamente."
            : "Cotización marcada como rechazada.",
        );
      }

      onSave({
        ...cotizacion,
        productos,
        estado_id: estadoId,
        estado: estadoNombre,
        tipo_documento: respuesta.convertida_a_pedido
          ? "pedido"
          : cotizacion.tipo_documento,
        no_pedido: respuesta.no_pedido ?? cotizacion.no_pedido,
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.error ?? "No se pudo actualizar el estado.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const calcularTotal = () =>
    productos.reduce((suma, producto) => {
      const subtotal = producto.detalles
        .filter((detalle) => detalle.aprobado === true)
        .reduce((acumulado, detalle) => acumulado + detalle.precio_total, 0);
      const herramental =
        producto.herramental_aprobado === true
          ? (producto.herramental_precio ?? 0)
          : 0;
      return suma + subtotal + herramental;
    }, 0);

  const totalHerramental = productos.reduce(
    (suma, producto) =>
      suma +
      (producto.herramental_aprobado === true
        ? (producto.herramental_precio ?? 0)
        : 0),
    0,
  );

  const estadoColor = {
    Aprobada: "text-green-600",
    Rechazada: "text-red-600",
    Pendiente: "text-yellow-600",
  };

  const estadoIcono = {
    Aprobada: "✓",
    Rechazada: "✕",
    Pendiente: "⏱",
  };

  const parsearPantones = (pantones: unknown): string[] => {
    if (!pantones) return [];
    if (Array.isArray(pantones)) {
      return pantones.filter(Boolean).map(String);
    }
    if (typeof pantones === "string") {
      return pantones
        .split(",")
        .map((valor) => valor.trim())
        .filter(Boolean);
    }
    return [];
  };

  return (
    <div className="space-y-5">
      {modalMaquinariaOpen && (
        <ModalMaquinariaPedidoPapel
          productos={productosPapelAprobados}
          onCancel={() => setModalMaquinariaOpen(false)}
          onConfirm={handleConfirmarMaquinaria}
        />
      )}

      {modalConfirmarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Convertir a Pedido
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cotización #{cotizacion.no_cotizacion}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
              <p className="font-semibold">
                ⚠️ Esta acción convertirá la cotización en un pedido.
              </p>
              <p>
                Se le asignará un <strong>folio de pedido nuevo</strong> e
                independiente.
              </p>
              <p>
                La cotización original seguirá visible en el módulo de{" "}
                <strong>Cotizaciones</strong>.
              </p>
              <p>
                Esta acción <strong>no se puede deshacer</strong>.
              </p>
              <p className="text-amber-700">
                📄 El PDF del pedido se descargará automáticamente.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p>
                Se convertirán solamente los productos con cantidad aprobada.
              </p>
              <p className="mt-1 font-semibold text-gray-900">
                Productos aprobados:{" "}
                {filtrarProductosConCantidadAprobada(productos).length}
                {productosPapelAprobados.length > 0
                  ? ` · Papel: ${productosPapelAprobados.length}`
                  : ""}
              </p>
            </div>

            <p className="text-sm text-gray-700">
              ¿Confirmas que el cliente aprobó esta cotización y deseas
              convertirla a pedido?
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalConfirmarOpen(false)}
                disabled={guardando}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarConversion}
                disabled={guardando}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                Sí, convertir a Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-2">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {mensajeExito && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start justify-between gap-2">
          <p className="text-green-700 text-sm font-medium">{mensajeExito}</p>
          <button
            onClick={() => setMensajeExito(null)}
            className="text-green-400 hover:text-green-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {cotizacion.tipo_documento === "pedido" && cotizacion.no_pedido && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <svg
            className="w-4 h-4 text-blue-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span className="text-sm text-blue-800">
            Esta cotización fue convertida al{" "}
            <strong>Pedido #{cotizacion.no_pedido}</strong>
          </span>
        </div>
      )}

      <section className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3">
          Información del Cliente
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p>
            <span className="text-gray-500">Cliente:</span>{" "}
            <strong>{cotizacion.cliente || "—"}</strong>
          </p>
          <p>
            <span className="text-gray-500">Empresa:</span>{" "}
            <strong>{cotizacion.empresa || "—"}</strong>
          </p>
          <p>
            <span className="text-gray-500">Teléfono:</span>{" "}
            {cotizacion.telefono || "—"}
          </p>
          <p>
            <span className="text-gray-500">Correo:</span>{" "}
            {cotizacion.correo || "—"}
          </p>
        </div>
      </section>

      <section className="border-2 border-purple-200 rounded-lg overflow-hidden">
        <header className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 border-b border-purple-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Selección de Cantidades
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Haz clic para aprobar o desaprobar.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Cantidades aprobadas</div>
            <div
              className={`text-lg font-bold ${totalDetallesAprobados > 0 ? "text-green-600" : "text-orange-500"}`}
            >
              {totalDetallesAprobados}/{totalDetalles}
            </div>
          </div>
        </header>

        <div className="space-y-4 bg-gray-50 p-4">
          {productos.map((producto, indexProducto) => {
            const papel = esLineaPapel(producto);
            const pantones = parsearPantones(producto.pantones);
            const herramentalId = producto.herramental_id ?? null;

            return (
              <article
                key={producto.idcotizacion_producto}
                className="bg-white border-2 border-gray-200 rounded-lg p-4"
              >
                <div className="mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-900 text-base">
                      {producto.nombre}
                    </h4>
                    {papel && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        📄 Papel
                      </span>
                    )}
                    {producto.descripcion && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        {producto.descripcion}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                    {!papel && producto.calibre && (
                      <span>
                        Calibre:{" "}
                        <strong className="text-gray-700">
                          {producto.calibre}
                        </strong>
                      </span>
                    )}
                    <span>
                      Tintas:{" "}
                      <strong className="text-gray-700">
                        {producto.tintas ?? 0}
                      </strong>
                    </span>
                    <span>
                      Caras:{" "}
                      <strong className="text-gray-700">
                        {producto.caras ?? 0}
                      </strong>
                    </span>
                    {!papel && producto.asa_suaje && (
                      <span>
                        Suaje:{" "}
                        <strong className="text-blue-700">
                          {producto.asa_suaje}
                        </strong>
                      </span>
                    )}
                  </div>

                  {pantones.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                        🎨 Pantones:
                      </span>
                      {pantones.map((pantone, indice) => (
                        <span
                          key={indice}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium border border-purple-200"
                        >
                          <span className="w-4 h-4 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xs">
                            {indice + 1}
                          </span>
                          {pantone}
                        </span>
                      ))}
                    </div>
                  )}

                  {!papel && producto.pigmentos && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                        🧪 Pigmento:
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-medium border border-orange-200">
                        {producto.pigmentos}
                      </span>
                    </div>
                  )}
                </div>

                {producto.herramental_precio != null &&
                  producto.herramental_precio > 0 &&
                  herramentalId != null && (
                    <div
                      onClick={() =>
                        loadingHerramental !== herramentalId &&
                        handleToggleHerramental(
                          indexProducto,
                          herramentalId,
                          producto.herramental_aprobado ?? null,
                        )
                      }
                      className={`mt-2 mb-3 flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all select-none ${
                        loadingHerramental === herramentalId
                          ? "opacity-50 cursor-wait"
                          : ""
                      } ${
                        producto.herramental_aprobado === true
                          ? "bg-orange-100 border-orange-500 shadow-md"
                          : producto.herramental_aprobado === false
                            ? "bg-red-50 border-red-300 opacity-60 hover:opacity-80"
                            : "bg-white border-gray-300 hover:border-orange-400 hover:shadow"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          loadingHerramental === herramentalId
                            ? "border-gray-300 bg-gray-100"
                            : producto.herramental_aprobado === true
                              ? "bg-orange-500 border-orange-500"
                              : "border-gray-400 bg-white"
                        }`}
                      >
                        {loadingHerramental === herramentalId ? (
                          <div className="w-3 h-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                        ) : producto.herramental_aprobado === true ? (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🔧</span>
                          <span className="text-xs font-semibold text-gray-800">
                            Herramental
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              producto.herramental_aprobado === true
                                ? "bg-orange-500 text-white"
                                : producto.herramental_aprobado === false
                                  ? "bg-red-200 text-red-700"
                                  : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {producto.herramental_aprobado === true
                              ? "✓ Aprobado"
                              : producto.herramental_aprobado === false
                                ? "✕ Rechazado"
                                : "Sin aprobar"}
                          </span>
                        </div>
                        {producto.herramental_descripcion && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {producto.herramental_descripcion}
                          </p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-sm font-bold text-orange-700">
                        +${Number(producto.herramental_precio).toFixed(2)}
                      </span>
                    </div>
                  )}

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200 mb-3">
                  <h5 className="text-xs font-bold text-gray-700 uppercase mb-2">
                    Cantidades cotizadas — selecciona las que aprueba el cliente
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {producto.detalles.map((detalle, indexDetalle) => {
                      const seleccionado = detalle.aprobado === true;
                      const rechazado = detalle.aprobado === false;
                      const cargando = loadingDetalle === detalle.iddetalle;
                      const precioUnitario =
                        detalle.cantidad > 0
                          ? detalle.precio_total / detalle.cantidad
                          : 0;

                      return (
                        <div
                          key={detalle.iddetalle}
                          onClick={() =>
                            !cargando &&
                            handleToggleDetalle(
                              indexProducto,
                              indexDetalle,
                              detalle.iddetalle,
                              detalle.aprobado,
                            )
                          }
                          className={`p-3 rounded-lg border-2 transition-all select-none ${
                            cargando
                              ? "opacity-50 cursor-wait"
                              : "cursor-pointer"
                          } ${
                            seleccionado
                              ? "bg-green-100 border-green-500 shadow-md"
                              : rechazado
                                ? "bg-red-50 border-red-300 opacity-60 hover:opacity-80"
                                : "bg-white border-gray-300 hover:border-green-400 hover:shadow"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                cargando
                                  ? "border-gray-300 bg-gray-100"
                                  : seleccionado
                                    ? "bg-green-600 border-green-600"
                                    : "border-gray-400 bg-white"
                              }`}
                            >
                              {cargando ? (
                                <div className="w-3 h-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                              ) : seleccionado ? (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : null}
                            </div>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                seleccionado
                                  ? "bg-green-600 text-white"
                                  : rechazado
                                    ? "bg-red-200 text-red-700"
                                    : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {seleccionado
                                ? "✓ Aprobada"
                                : rechazado
                                  ? "✕ Rechazada"
                                  : `Opción ${indexDetalle + 1}`}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                {detalle.modo_cantidad === "kilo" &&
                                detalle.kilogramos
                                  ? "Kilogramos:"
                                  : "Cantidad:"}
                              </span>
                              <span className="font-bold text-gray-900">
                                {detalle.modo_cantidad === "kilo" &&
                                detalle.kilogramos
                                  ? `${Number(detalle.kilogramos).toFixed(2)} kg`
                                  : detalle.cantidad.toLocaleString()}
                              </span>
                            </div>
                            {detalle.modo_cantidad === "kilo" &&
                              detalle.kilogramos && (
                                <div className="flex justify-between text-xs text-gray-400">
                                  <span>Piezas:</span>
                                  <span>
                                    {detalle.cantidad.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            <div className="flex justify-between">
                              <span className="text-gray-500">Precio c/u:</span>
                              <span className="font-semibold text-gray-900">
                                ${precioUnitario.toFixed(4)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-gray-200 mt-1">
                              <span className="font-semibold text-gray-700">
                                Subtotal:
                              </span>
                              <span className="font-bold text-green-700">
                                ${detalle.precio_total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Observación del producto
                  <textarea
                    value={producto.observacion ?? ""}
                    onChange={(event) =>
                      handleObservacion(
                        indexProducto,
                        producto.idcotizacion_producto,
                        event.target.value,
                      )
                    }
                    rows={2}
                    placeholder="Notas internas sobre este producto..."
                    className="mt-1 w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </label>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
          Resumen
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span className="text-gray-600 text-sm">Estado actual:</span>
            <span className={`font-bold text-lg ${estadoColor[estadoActual]}`}>
              {estadoIcono[estadoActual]} {estadoActual}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">Total aprobado:</span>
            <span className="text-2xl font-bold text-gray-900">
              ${calcularTotal().toFixed(2)}
            </span>
          </div>
          {totalHerramental > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-orange-700 flex items-center gap-1">
                <span>🔧</span> Herramental incluido:
              </span>
              <span className="font-semibold text-orange-700">
                +${totalHerramental.toFixed(2)}
              </span>
            </div>
          )}
          {totalDetallesAprobados === 0 && (
            <p className="text-xs text-orange-500 mt-1">
              ⚠️ Ninguna cantidad seleccionada aún
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3 pt-4 border-t-2 border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={guardando || totalDetallesAprobados === 0}
            onClick={handleClickAprobar}
            title={
              totalDetallesAprobados === 0
                ? "Selecciona al menos una cantidad primero"
                : ""
            }
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
          >
            {guardando ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {guardando ? "Guardando..." : textoBotonAprobar}
          </button>
          <button
            disabled={guardando}
            onClick={() => handleCambiarEstado(ESTADO_ID.RECHAZADO)}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Rechazar
          </button>
        </div>

        {estadoActual !== "Pendiente" && (
          <div
            className={`p-3 rounded-lg text-center text-sm font-medium ${
              estadoActual === "Aprobada"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-yellow-50 text-yellow-800 border border-yellow-300"
            }`}
          >
            {estadoActual === "Aprobada"
              ? "✓ Cotización aprobada. Puedes cambiar la selección y guardar de nuevo si es necesario."
              : "⚠️ Cotización rechazada. Cambia la selección y aprueba de nuevo si lo requieres."}
          </div>
        )}

        <button
          onClick={onCancel}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
