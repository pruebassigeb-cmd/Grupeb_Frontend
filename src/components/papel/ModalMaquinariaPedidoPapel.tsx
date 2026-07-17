import { useEffect, useMemo, useState } from "react";
import { getProductoPapelDetalle } from "../../services/papel/papelCotizacionService";
import type { ProductoPapelDetalleCotizacion } from "../../services/papel/papelCotizacionService";
import type { ProductoCotizacion } from "../../types/cotizaciones.types";
import type {
  MaquinariaProductoPedidoPapel,
  MaquinariaSeleccionadaPedidoPapel,
} from "../../types/papel/maquinaria-pedido.types";
import type { MaquinaPapelOpcion } from "../../types/papel/cotizacion-papel.types";

type ProductoEntrada = ProductoCotizacion | (Record<string, any> & { nombre?: string });

type Props = {
  productos: ProductoEntrada[];
  onCancel: () => void;
  onConfirm: (selecciones: MaquinariaProductoPedidoPapel[]) => void;
};

const asAny = (producto: ProductoEntrada) => producto as any;

const getIdSolicitudProducto = (producto: ProductoEntrada) => {
  const p = asAny(producto);
  return Number(
    p.idsolicitud_producto ??
      p.idcotizacion_producto ??
      p.idcotizacion_producto_papel ??
      p.idproducto_solicitud ??
      0,
  );
};

const getIdProductoPapel = (producto: ProductoEntrada) => {
  const p = asAny(producto);
  return Number(
    p.idproducto_papel ??
      p.producto_papel_idproducto_papel ??
      p.producto_papel_id ??
      0,
  );
};

const esPapel = (producto: ProductoEntrada) => {
  const p = asAny(producto);
  return (
    p.tipo_material === "papel" ||
    p.tipoCotizacion === "papel" ||
    p.idproducto_papel != null ||
    p.producto_papel_idproducto_papel != null
  );
};

const procesosProducto = (producto: any) => [
  { key: "hojeadora", label: "Hojeadora", aplica: true },
  { key: "guillotina", label: "Guillotina", aplica: true },
  { key: "impresora", label: "Impresión", aplica: true },
  {
    key: "laminado_maquina",
    label: "Laminación",
    aplica: producto.idcat_laminado != null,
  },
  { key: "uv", label: "Barniz UV", aplica: producto.uv === true },
  {
    key: "hs_ar",
    label:
      producto.idfoil != null && producto.alto_relieve === true
        ? "Hot Stamping / Alto relieve"
        : producto.alto_relieve === true
          ? "Alto relieve"
          : "Hot Stamping",
    aplica: producto.idfoil != null || producto.alto_relieve === true,
  },
  {
    key: "texturizadora",
    label: "Texturizado",
    aplica: producto.idcat_textura != null,
  },
  { key: "suaje_maquina", label: "Suaje", aplica: true },
  {
    key: "armado",
    label: "Armado",
    // NUEVO: "¿lleva armado?" ya no se decide aquí — se captura en
    // FormularioProductoPapel.tsx (specs.lleva_armado), junto a UV y Alto
    // relieve, como parte de la cotización del producto. Aquí solo se lee.
    aplica: producto.lleva_armado === true,
  },
  { key: "empaque_maquina", label: "Empaque", aplica: true },
];

const nombreMaquina = (maquina: MaquinaPapelOpcion) => {
  const numero = maquina.numero_maquina ? ` (${maquina.numero_maquina})` : "";
  const tipo =
    maquina.tipo_maquina === "hojeadora"
      ? " — Hojeadora"
      : maquina.tipo_maquina === "guillotina"
        ? " — Guillotina"
        : "";
  return `${maquina.nombre}${numero}${tipo}`;
};

// NUEVO: "hojeadora" y "guillotina" ya no son procesos separados en el
// catálogo de maquinaria del producto — siguen viviendo juntos bajo la
// clave "hojeado_guillotina" (getMaquinaria en producto_papel.controller.ts
// no cambió). Aquí se separan las opciones por tipo_maquina para mostrar
// dos selects independientes.
const opcionesParaProceso = (
  detalle: ProductoPapelDetalleCotizacion | undefined,
  procesoKey: string,
): MaquinaPapelOpcion[] => {
  const combinadas = detalle?.maquinaria?.["hojeado_guillotina"] ?? [];
  if (procesoKey === "hojeadora" || procesoKey === "guillotina") {
    return combinadas.filter((m) => m.tipo_maquina === procesoKey);
  }
  return detalle?.maquinaria?.[procesoKey] ?? [];
};

const detallesAprobados = (producto: any) => {
  const detalles = producto.detalles ?? [];
  const tieneCampoAprobado = detalles.some((detalle: any) =>
    Object.prototype.hasOwnProperty.call(detalle, "aprobado"),
  );

  if (!tieneCampoAprobado) return detalles;
  return detalles.filter((detalle: any) => detalle.aprobado === true);
};

const formatoNumero = (valor: number) =>
  Number(valor || 0).toLocaleString("es-MX", {
    maximumFractionDigits: 2,
  });

const formatoMoneda = (valor: number) =>
  Number(valor || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const resumenCantidadesAprobadas = (producto: any) => {
  const aprobados = detallesAprobados(producto);
  if (aprobados.length === 0) return "Sin cantidad capturada";

  return aprobados
    .map((detalle: any) => {
      if (detalle.modo_cantidad === "kilo" && detalle.kilogramos != null) {
        return `${formatoNumero(Number(detalle.kilogramos))} kg · ${formatoNumero(Number(detalle.cantidad))} pzas`;
      }
      return `${formatoNumero(Number(detalle.cantidad))} pzas`;
    })
    .join(" + ");
};

const subtotalAprobado = (producto: any) =>
  detallesAprobados(producto).reduce(
    (total: number, detalle: any) => total + Number(detalle.precio_total ?? 0),
    0,
  );

function detailOrNull(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const txt = String(valor).trim();
  return txt ? txt : null;
}

const chipsProducto = (
  producto: any,
  detalle?: ProductoPapelDetalleCotizacion,
) => {
  const chips = [
    producto.medida ? `Medida: ${producto.medida}` : null,
    producto.grupo_descripcion
      ? `Material: ${producto.grupo_descripcion}`
      : null,
    producto.tintas != null ? `Tintas frente: ${producto.tintas}` : null,
    producto.tintasDentro ? `Tintas dentro: ${producto.tintasDentro}` : null,
    producto.laminado_nombre ? `Laminado: ${producto.laminado_nombre}` : null,
    producto.foil_nombre ? `Foil: ${producto.foil_nombre}` : null,
    producto.textura_nombre ? `Textura: ${producto.textura_nombre}` : null,
    producto.uv === true ? "Barniz UV" : null,
    producto.alto_relieve === true ? "Alto relieve" : null,
    producto.asa_nombre ? `Asa: ${producto.asa_nombre}` : null,
    detailOrNull(detalle?.acabados?.empaque)
      ? `Empaque: ${detalle?.acabados?.empaque}`
      : null,
    detailOrNull(detalle?.acabados?.pzs_caja)
      ? `${detalle?.acabados?.pzs_caja} pzas/caja`
      : null,
  ];

  return chips.filter(Boolean) as string[];
};

export default function ModalMaquinariaPedidoPapel({
  productos,
  onCancel,
  onConfirm,
}: Props) {
  const productosPapel = useMemo(() => productos.filter(esPapel), [productos]);

  const [detalles, setDetalles] = useState<Record<number, ProductoPapelDetalleCotizacion>>({});
  const [selecciones, setSelecciones] = useState<Record<number, MaquinariaSeleccionadaPedidoPapel>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const seleccionesIniciales: Record<number, MaquinariaSeleccionadaPedidoPapel> = {};

    for (const producto of productosPapel) {
      const id = getIdSolicitudProducto(producto);
      const p = asAny(producto);
      if (!id) continue;

      seleccionesIniciales[id] = p.maquinaria_seleccionada ?? {};
    }

    setSelecciones(seleccionesIniciales);
  }, [productosPapel]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    Promise.all(
      productosPapel.map(async (producto) => {
        const idProductoPapel = getIdProductoPapel(producto);
        const idSolicitudProducto = getIdSolicitudProducto(producto);

        if (!idProductoPapel) {
          throw new Error(
            `El producto "${asAny(producto).nombre ?? "Producto papel"}" no tiene idproducto_papel`,
          );
        }

        const detalle = await getProductoPapelDetalle(Number(idProductoPapel));
        return [idSolicitudProducto, detalle] as const;
      }),
    )
      .then((resultados) => {
        if (!activo) return;
        const detallesPorProducto: Record<number, ProductoPapelDetalleCotizacion> = {};
        for (const [idSolicitudProducto, detalle] of resultados) {
          detallesPorProducto[idSolicitudProducto] = detalle;
        }
        setDetalles(detallesPorProducto);
      })
      .catch(() => {
        if (activo) {
          setError("No se pudieron cargar las máquinas de los productos.");
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [productosPapel]);

  // NUEVO: como cada proceso ahora tiene, cuando mucho, UNA máquina
  // registrada en el producto (single-select desde el alta), esta
  // auto-selección se dispara siempre que exista esa única opción — el
  // usuario ya no necesita elegir manualmente entre varias.
  useEffect(() => {
    if (cargando) return;

    setSelecciones((prev) => {
      let cambio = false;
      const next: Record<number, MaquinariaSeleccionadaPedidoPapel> = { ...prev };

      for (const producto of productosPapel) {
        const id = getIdSolicitudProducto(producto);
        const detalle = detalles[id];
        const p = asAny(producto);
        if (!id || !detalle) continue;

        for (const proceso of procesosProducto(p).filter((proc) => proc.aplica)) {
          const opciones = opcionesParaProceso(detalle, proceso.key);
          if (opciones.length !== 1) continue;

          const actual = next[id]?.[proceso.key];
          if (actual) continue;

          next[id] = {
            ...(next[id] ?? {}),
            [proceso.key]: opciones[0],
          };
          cambio = true;
        }
      }

      return cambio ? next : prev;
    });
  }, [cargando, detalles, productosPapel]);

  const seleccionar = (
    idsolicitudProducto: number,
    proceso: string,
    maquinaId: string,
  ) => {
    setError(null);
    const opciones = opcionesParaProceso(detalles[idsolicitudProducto], proceso);
    const maquina = opciones.find((item) => item.id === Number(maquinaId)) ?? null;

    setSelecciones((prev) => ({
      ...prev,
      [idsolicitudProducto]: {
        ...(prev[idsolicitudProducto] ?? {}),
        [proceso]: maquina,
      },
    }));
  };

  const confirmar = () => {
    for (const producto of productosPapel) {
      const id = getIdSolicitudProducto(producto);
      const detalle = detalles[id];
      const p = asAny(producto);

      for (const proceso of procesosProducto(p).filter((proc) => proc.aplica)) {
        const opciones = opcionesParaProceso(detalle, proceso.key);
        if (opciones.length > 0 && !selecciones[id]?.[proceso.key]) {
          setError(
            `Selecciona la máquina de ${proceso.label} para "${p.nombre}".`,
          );
          return;
        }
      }
    }

    onConfirm(
      productosPapel.map((producto) => {
        const id = getIdSolicitudProducto(producto);
        const p = asAny(producto);
        return {
          idsolicitud_producto: id,
          // NUEVO: se lee directo del producto (specs.lleva_armado, capturado
          // en FormularioProductoPapel.tsx) en vez de un checkbox de este modal.
          lleva_armado: p.lleva_armado !== false,
          maquinaria_seleccionada: selecciones[id] ?? {},
        };
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="font-bold text-gray-900">
            Procesos y maquinaria de papel
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Revisa la máquina asignada a cada proceso. Cuando el producto
            tiene una sola máquina registrada, se selecciona automáticamente.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
          {cargando && (
            <p className="py-8 text-center text-sm text-gray-500">
              Cargando maquinaria...
            </p>
          )}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!cargando && productosPapel.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No hay productos de papel para configurar.
            </div>
          )}

          {!cargando &&
            productosPapel.map((producto) => {
              const id = getIdSolicitudProducto(producto);
              const p = asAny(producto);
              const detalle = detalles[id];
              return (
                <section
                  key={id}
                  className="overflow-hidden rounded-lg border border-gray-300 bg-white"
                >
                  <div className="border-b border-gray-200 bg-gray-100 px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {p.nombre}
                          </h4>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            Papel
                          </span>
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                            Solicitud #{id}
                          </span>
                        </div>
                        {p.descripcion && (
                          <p className="mt-1 text-xs text-gray-500">
                            {p.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="grid min-w-[260px] grid-cols-2 gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs">
                        <div>
                          <span className="block font-bold uppercase tracking-wide text-green-700">
                            Cantidad
                          </span>
                          <span className="mt-0.5 block font-semibold text-gray-900">
                            {resumenCantidadesAprobadas(p)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold uppercase tracking-wide text-green-700">
                            Subtotal
                          </span>
                          <span className="mt-0.5 block font-semibold text-gray-900">
                            {formatoMoneda(subtotalAprobado(p))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chipsProducto(p, detalle).map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* NUEVO: ya no se muestra "Preparación" (Hojeado/
                      Guillotina) — ambas opciones quedan disponibles en la
                      orden de producción y se decide físicamente en piso,
                      no en el sistema. Armado sigue siendo informativo: se
                      decide en FormularioProductoPapel como parte de la
                      cotización. */}
                  <div className="border-b border-gray-100 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="mr-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
                          Armado:
                        </span>
                        <span
                          className={`font-semibold ${p.lleva_armado !== false ? "text-green-700" : "text-gray-400"}`}
                        >
                          {p.lleva_armado !== false ? "Sí" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {procesosProducto(p)
                      .filter((proceso) => proceso.aplica)
                      .map((proceso) => {
                        const opciones = opcionesParaProceso(detalle, proceso.key);
                        const seleccion = selecciones[id]?.[proceso.key];

                        return (
                          <div
                            key={proceso.key}
                            className="grid grid-cols-[minmax(140px,0.7fr)_minmax(220px,1.3fr)] items-center gap-3 px-4 py-3"
                          >
                            <div>
                              <span className="block text-sm font-medium text-gray-800">
                                {proceso.label}
                              </span>
                              {proceso.key === "texturizadora" && (
                                <span className="text-xs text-gray-500">
                                  Acabado: {p.textura_nombre ?? "N/A"}
                                </span>
                              )}
                              {proceso.key === "empaque_maquina" && (
                                <span className="text-xs text-gray-500">
                                  {detalle?.acabados?.empaque ??
                                    "Sin tipo de empaque"}
                                  {detalle?.acabados?.pzs_caja
                                    ? ` - ${detalle.acabados.pzs_caja} pzas/caja`
                                    : ""}
                                </span>
                              )}
                            </div>

                            <select
                              value={seleccion?.id ?? ""}
                              onChange={(event) =>
                                seleccionar(id, proceso.key, event.target.value)
                              }
                              disabled={opciones.length === 0}
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                            >
                              <option value="">
                                {opciones.length === 0
                                  ? "Sin máquinas configuradas"
                                  : "Selecciona una máquina"}
                              </option>
                              {opciones.map((maquina) => (
                                <option key={maquina.id} value={maquina.id}>
                                  {nombreMaquina(maquina)}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                  </div>
                </section>
              );
            })}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={cargando || productosPapel.length === 0}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
  );
}