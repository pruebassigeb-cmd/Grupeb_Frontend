import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import SelectorProducto from "../components/ConfigurarProducto";
import ArchivosProductoPlastico from "../components/plastico/ArchivosProductoPlastico";
import { useCatalogosPlastico } from "../hooks/plastico/useCatalogosPlastico";
import { useProductosPlastico } from "../hooks/plastico/useProductosPlastico";
import {
  getProductoPlasticoById,
  subirArchivoProductoPlastico,
} from "../services/productosPlasticoService";
import { getTarifas } from "../services/tarifas.service";
import type {
  CatalogosPlastico,
  DatosProducto,
  ProductoPlastico,
  ProductoPlasticoDetalle,
  ProductoPlasticoCreate,
  ArchivoPendientePlastico,
} from "../types/productos-plastico.types";
import type { Tarifa } from "../types/tarifas.types";
import { calcularPorKiloStr, calcularCelofanBopp } from "../utils/calcularPorKilo";
import { formatNumero } from "../utils/formatNumero";
import { showAlert } from "../components/CustomAlert";

// ✅ Hardcodeado temporal para celofán hasta que se construya su tabla en BD
const COSTOS_CELOFAN: Record<number, number> = {
  30: 250, 50: 200, 75: 180, 100: 150, 200: 120, 300: 95, 500: 90, 1000: 90,
};
const MERMA_CELOFAN: Record<number, number> = {
  30: 20, 50: 10, 75: 8, 100: 7, 200: 5, 300: 4, 500: 3, 1000: 1,
};
const kilosReferencia = [30, 50, 75, 100, 200, 300, 500, 1000];

const datosProductoVacio: DatosProducto = {
  tipoProducto: "", tipoProductoId: 0,
  material: "", materialId: 0,
  calibre: "", calibreId: 0,
  gramos: undefined,
  medidas: { altura: "", ancho: "", fuelleFondo: "", fuelleLateral1: "", fuelleLateral2: "", refuerzo: "" },
  medidasFormateadas: "",
  nombreCompleto: "",
  descripcion: "",
};

type Vista = "tabla" | "nuevo" | "editar";

// ═══════════════════════════════════════════════════════════════════════════
// BADGE "CREADO DESDE EXPO"
// ═══════════════════════════════════════════════════════════════════════════
// Mismo tratamiento visual que en Papel.tsx (ámbar, ⭐ Expo), aquí con
// clases Tailwind ya que esta página usa ese sistema en vez de estilos
// inline como Papel.tsx.
function BadgeExpo() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold whitespace-nowrap flex-shrink-0"
      title="Este producto se creó automáticamente desde una cotización de Expo"
    >
      ⭐ Expo
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLA / LISTADO
// ═══════════════════════════════════════════════════════════════════════════
function TablaProductosPlastico({
  productos,
  loading,
  onNuevo,
  onEditar,
  onEliminar,
}: {
  productos: ProductoPlastico[];
  loading: boolean;
  onNuevo: () => void;
  onEditar: (p: ProductoPlastico) => void;
  onEliminar: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Encabezado y filas son grids independientes. La columna final no puede
  // ser "auto", porque el encabezado está vacío y las filas contienen botones;
  // eso hacía que las columnas anteriores tuvieran anchos diferentes.
  const COLS = "1.1fr 1fr 0.9fr 0.7fr 0.8fr 1.1fr 130px 90px";

  // .toLowerCase() sobre null/undefined tronaría toda la página — ahora que
  // un producto "en blanco" de Expo puede llegar sin tipo/material/medida
  // resueltos todavía (LEFT JOIN en vez de INNER JOIN en el backend), hay
  // que blindar cada campo antes de filtrar.
  const filtered = productos.filter((p) =>
    (p.tipo_producto || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.material || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.medida || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.descripcion || "").toLowerCase().includes(search.toLowerCase()) ||
    String(p.calibre ?? "").includes(search)
  );

  return (
    <div>
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/35 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-[90%] shadow-2xl">
            <p className="text-sm font-semibold text-gray-900 mb-1">¿Eliminar producto?</p>
            <p className="text-xs text-gray-500 mb-5">
              El producto se desactivará y dejará de aparecer en cotizaciones, pero podrás reactivarlo después.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="h-9 px-4 border border-gray-300 rounded-md text-sm text-gray-600 bg-white hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => { onEliminar(deleteId); setDeleteId(null); }}
                className="h-9 px-4 border-none rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-gray-400 font-semibold mb-0.5">Alta de productos</p>
          <h1 className="text-xl font-bold text-gray-900">Productos de plástico</h1>
        </div>
        <button
          onClick={onNuevo}
          className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 whitespace-nowrap"
        >
          + Registrar nuevo producto
        </button>
      </div>

      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por tipo, material, medida, calibre o descripción..."
          className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid gap-2 bg-gray-50 border-b border-gray-200 px-4" style={{ gridTemplateColumns: COLS }}>
          {["Tipo de producto", "Descripción", "Material", "Calibre", "Medida", "Bolsas/kilo", "Archivos", ""].map((h, i) => (
            <div
              key={h}
              className={`py-2 text-[10px] font-bold tracking-wider uppercase text-gray-500 ${
                i === 0 || i === 7 ? "" : "text-center"
              }`}
            >
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            {search ? "Sin resultados." : "No hay productos registrados."}
          </div>
        ) : (
          filtered.map((p, idx) => (
            <div
              key={p.id}
              className="grid gap-2 px-4 items-center min-h-[58px]"
              style={{
                gridTemplateColumns: COLS,
                background: idx % 2 === 0 ? "#fff" : "#FAFAFA",
                borderBottom: "1px solid #F3F4F6",
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{p.tipo_producto || "—"}</p>
                  {p.origen_expo && <BadgeExpo />}
                </div>
                <p className="text-[10px] text-gray-400 truncate">
                  ID #{p.id}{p.identificador ? ` — ${p.identificador}` : ""}
                </p>
              </div>
              <span className="text-sm text-gray-700 italic truncate text-center">{p.descripcion || "—"}</span>
              <span className="text-sm text-gray-700 truncate text-center">{p.material || "—"}</span>
              <span className="text-sm text-gray-700 text-center">{p.calibre != null ? formatNumero(p.calibre) : "—"}</span>
              <span className="text-sm text-gray-700 truncate text-center">{p.medida || "—"}</span>
              <span className="text-sm text-gray-700 text-center">{formatNumero(p.por_kilo)}</span>
              <div className="flex gap-1 justify-center">
                {p.archivos_preview && p.archivos_preview.length > 0 ? (
                  p.archivos_preview.slice(0, 3).map((a) =>
                    a.tipo === "image" ? (
                      <img key={a.id_archivo} src={a.url} alt={a.nombre} className="w-9 h-9 rounded object-cover border border-gray-200" />
                    ) : (
                      <span key={a.id_archivo} className="w-9 h-9 rounded border border-blue-200 bg-blue-50 flex items-center justify-center text-xs">📄</span>
                    )
                  )
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </div>
              <div className="flex w-full gap-1.5 justify-end">
                <button onClick={() => onEditar(p)} className="h-7 px-2.5 bg-gray-100 border border-gray-300 rounded text-[11px] font-semibold text-gray-700 hover:bg-gray-200">
                  Editar
                </button>
                <button onClick={() => setDeleteId(p.id)} className="h-7 px-2 bg-red-50 border-none rounded text-[11px] font-semibold text-red-600 hover:bg-red-100">
                  x
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 text-right text-xs text-gray-400">
        {filtered.length} de {productos.length} producto{productos.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO DE ALTA/EDICIÓN (reutiliza el selector + tabla de producción)
// ═══════════════════════════════════════════════════════════════════════════
function FormularioProductoPlastico({
  catalogos,
  agregarTipoProducto,
  agregarMaterial,
  agregarCalibre,
  productoEditando,
  saving,
  onGuardar,
  onCancelar,
}: {
  catalogos: CatalogosPlastico;
  agregarTipoProducto: (nombre: string) => Promise<any>;
  agregarMaterial: (nombre: string, valor: number) => Promise<any>;
  agregarCalibre: (calibre: number, calibre_bopp?: number | null, gramos?: number | null) => Promise<any>;
  productoEditando: ProductoPlasticoDetalle | null;
  saving: boolean;
  onGuardar: (payload: ProductoPlasticoCreate, pendientes: ArchivoPendientePlastico[]) => Promise<void>;
  onCancelar: () => void;
}) {
  const isEdit = !!productoEditando;

  const datosInicialesDesdeDetalle = (d: ProductoPlasticoDetalle): DatosProducto => ({
    tipoProducto: d.tipo_producto ?? "",
    tipoProductoId: d.tipo_producto_id,
    material: d.material ?? "",
    materialId: d.material_id,
    calibre: d.calibre != null ? formatNumero(d.calibre) : "",
    calibreId: d.calibre_id,
    gramos: undefined,
    medidas: {
      altura: formatNumero(d.altura ?? ""),
      ancho: formatNumero(d.ancho ?? ""),
      fuelleFondo: d.fuelle_fondo ? formatNumero(d.fuelle_fondo) : "",
      fuelleLateral1: d.fuelle_lateral_izquierdo ? formatNumero(d.fuelle_lateral_izquierdo) : "",
      fuelleLateral2: d.fuelle_lateral_derecho ? formatNumero(d.fuelle_lateral_derecho) : "",
      refuerzo: d.refuerzo ? formatNumero(d.refuerzo) : "",
    }, 
    medidasFormateadas: d.medida ?? "",
    nombreCompleto: `${d.tipo_producto ?? ""} ${d.medida ?? ""} ${(d.material ?? "").toLowerCase()}`,
    descripcion: d.descripcion ?? "",
  });

  const [datosProducto, setDatosProducto] = useState<DatosProducto>(
    productoEditando ? datosInicialesDesdeDetalle(productoEditando) : datosProductoVacio
  );
  const [tarifasPlastico, setTarifasPlastico] = useState<Record<number, { precio: number; merma: number }>>({});
  const [errorDuplicado, setErrorDuplicado] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<ArchivoPendientePlastico[]>([]);

  useEffect(() => {
    getTarifas().then((tarifas) => {
      const map: Record<number, { precio: number; merma: number }> = {};
      tarifas.forEach((t: Tarifa) => {
        if (Number(t.cantidad_tintas) === 1) {
          map[Number(t.kilogramos)] = { precio: Number(t.precio), merma: Number(t.merma_porcentaje) };
        }
      });
      setTarifasPlastico(map);
    }).catch(() => {});
  }, []);

  const esCelofanBopp =
    datosProducto.tipoProducto === "Bolsa celofán" &&
    datosProducto.material.toUpperCase() === "BOPP";

  const resultadoCelofan =
    esCelofanBopp && datosProducto.gramos
      ? calcularCelofanBopp(datosProducto, datosProducto.gramos)
      : null;

  const bolsasPorKilo = esCelofanBopp
    ? resultadoCelofan?.bolsasPorKilo.toFixed(3) ?? ""
    : calcularPorKiloStr(datosProducto, catalogos.materiales);

  const pesoPorBolsa = resultadoCelofan?.pesoPorBolsa ?? null;

  const handleProductoChange = (datos: DatosProducto) => {
    setDatosProducto(datos);
    setErrorDuplicado(null);
  };

  const handleGuardar = async () => {
    if (!datosProducto.tipoProductoId || !datosProducto.materialId || !datosProducto.calibreId) {
      showAlert("Por favor completa todos los campos requeridos");
      return;
    }
    if (!bolsasPorKilo) {
      showAlert("No se pudo calcular las bolsas por kilo");
      return;
    }
    if (!datosProducto.medidas.altura || !datosProducto.medidas.ancho) {
      showAlert("Altura y Ancho son obligatorios");
      return;
    }

    setErrorDuplicado(null);

    const payload: ProductoPlasticoCreate = {
      tipo_producto_plastico_id: datosProducto.tipoProductoId,
      material_plastico_id: datosProducto.materialId,
      calibre_id: datosProducto.calibreId,
      altura: parseFloat(datosProducto.medidas.altura),
      ancho: parseFloat(datosProducto.medidas.ancho),
      fuelle_fondo: datosProducto.medidas.fuelleFondo ? parseFloat(datosProducto.medidas.fuelleFondo) : 0,
      fuelle_latIz: datosProducto.medidas.fuelleLateral1 ? parseFloat(datosProducto.medidas.fuelleLateral1) : 0,
      fuelle_latDe: datosProducto.medidas.fuelleLateral2 ? parseFloat(datosProducto.medidas.fuelleLateral2) : 0,
      refuerzo: datosProducto.medidas.refuerzo ? parseFloat(datosProducto.medidas.refuerzo) : 0,
      medida: datosProducto.medidasFormateadas,
      por_kilo: parseFloat(bolsasPorKilo),
      descripcion: datosProducto.descripcion?.trim() || undefined,
    };

    try {
      await onGuardar(payload, pendientes);
    } catch (error: any) {
      const data = error?.response?.data;
      if (error?.response?.status === 409 && data?.detalle) {
        setErrorDuplicado(data.detalle);
      }
    }
  };

  const redondearACentenas = (valor: number) => Math.ceil(valor / 100) * 100;

  const getCostoMerma = (kilos: number): { precio: number; merma: number } | null => {
    if (esCelofanBopp) {
      const precio = COSTOS_CELOFAN[kilos];
      const merma = MERMA_CELOFAN[kilos];
      if (!precio || merma === undefined) return null;
      return { precio, merma };
    }
    const tarifa = tarifasPlastico[kilos];
    if (!tarifa) return null;
    return tarifa;
  };

  const calcularBolsasPorKilos = (kilos: number) => {
    if (!bolsasPorKilo) return "--";
    const bolsas = parseFloat(bolsasPorKilo) * kilos;
    return redondearACentenas(bolsas).toLocaleString();
  };

  const calcularBolsasConMerma = (kilos: number) => {
    if (!bolsasPorKilo) return "--" as const;
    const costoMerma = getCostoMerma(kilos);
    if (!costoMerma) return "--" as const;
    const bpk = parseFloat(bolsasPorKilo);
    const bolsasBase = redondearACentenas(bpk * kilos);
    const bolsasMerma = Math.ceil(bolsasBase * (costoMerma.merma / 100));
    const total = bolsasBase + bolsasMerma;
    return { porcentajeMerma: costoMerma.merma, bolsasMerma, total };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isEdit ? "Editar producto" : "Dar de alta producto"}</h1>
        <button onClick={onCancelar} className="text-sm text-gray-500 hover:text-gray-700 underline">
          ← Volver al listado
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <SelectorProducto
            catalogos={catalogos}
            onProductoChange={handleProductoChange}
            mostrarFigura
            datosIniciales={productoEditando ? datosInicialesDesdeDetalle(productoEditando) : null}
            onAgregarTipoProducto={agregarTipoProducto}
            onAgregarMaterial={agregarMaterial}
            onAgregarCalibre={agregarCalibre}
          />

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Bolsas por kilo</label>
              <input value={bolsasPorKilo ? formatNumero(bolsasPorKilo) : "--"} readOnly disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium bg-gray-50 cursor-default" />
            </div>
            {esCelofanBopp && pesoPorBolsa && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Peso por bolsa (g)</label>
                <input value={formatNumero(pesoPorBolsa)} readOnly disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium bg-gray-50 cursor-default" />
              </div>
            )}
          </div>

          {errorDuplicado && (
            <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
              <span className="text-amber-500">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Producto ya registrado</p>
                <p className="text-sm text-amber-700 mt-0.5">{errorDuplicado}</p>
              </div>
              <button onClick={() => setErrorDuplicado(null)} className="text-amber-400 hover:text-amber-600">✕</button>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleGuardar}
              disabled={saving || !bolsasPorKilo}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                saving || !bolsasPorKilo ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar Producto"}
            </button>
          </div>
        </div>

        <ArchivosProductoPlastico
          idconfiguracion_plastico={productoEditando?.id ?? null}
          archivosIniciales={productoEditando?.archivos ?? []}
          onPendientesChange={setPendientes}
        />

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-1">Tabla de producción por kilogramos</h2>
          <p className="text-xs text-gray-400 mb-4">
            {esCelofanBopp ? "⚠️ Costos de celofán en configuración temporal" : "✅ Costos obtenidos de catálogo de producción"}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  {kilosReferencia.map((kilos) => (
                    <th key={kilos} className="px-4 py-3 text-center border border-blue-700">{kilos}k</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50">
                  {kilosReferencia.map((kilos) => (
                    <td key={kilos} className="px-4 py-3 text-center border border-gray-300 font-medium">
                      {calcularBolsasPorKilos(kilos)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-white">
                  {kilosReferencia.map((kilos) => {
                    const costoMerma = getCostoMerma(kilos);
                    const bpk = parseFloat(bolsasPorKilo);
                    if (!costoMerma || !bpk) {
                      return <td key={kilos} className="px-4 py-3 text-center border border-gray-300 text-gray-400">--</td>;
                    }
                    return (
                      <td key={kilos} className="px-4 py-3 text-center border border-gray-300 text-green-600 font-semibold">
                        ${(costoMerma.precio / bpk).toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>

            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-700">Merma y total de bolsas</h3>
              <div className="grid grid-cols-8 gap-2 text-center text-sm">
                {kilosReferencia.map((kilos) => {
                  const data = calcularBolsasConMerma(kilos);
                  if (data === "--") return <div key={kilos} className="text-gray-400">--</div>;
                  return (
                    <div key={kilos} className="bg-gray-50 rounded-lg p-2 border">
                      <p className="text-xs text-gray-500">Merma {data.porcentajeMerma}%</p>
                      <p className="text-xs text-orange-600 font-medium">+{data.bolsasMerma.toLocaleString()}</p>
                      <p className="text-sm font-semibold text-green-700">{data.total.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function Plastico() {
  const [vista, setVista] = useState<Vista>("tabla");
  const [productoEditando, setProductoEditando] = useState<ProductoPlasticoDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const {
    tiposProducto, materiales, calibres,
    agregarTipoProducto, agregarMaterial, agregarCalibre,
    loading: loadingCatalogos,
  } = useCatalogosPlastico();

  const { productos, loading, saving, crear, actualizar, eliminar } = useProductosPlastico();

  const catalogosParaSelector: CatalogosPlastico = {
    tiposProducto: tiposProducto.map((t) => ({ id: t.id, nombre: t.nombre, producto_id: 0 })),
    materiales: materiales.map((m) => ({ id: m.id, nombre: m.nombre, valor: String(m.valor) })),
    calibres: calibres.map((c) => ({ id: c.id, valor: c.calibre, gramos: c.gramos ?? undefined })),
  };

  const handleNuevo = () => {
    setProductoEditando(null);
    setVista("nuevo");
  };

  const handleEditar = async (p: ProductoPlastico) => {
    setVista("editar");
    setCargandoDetalle(true);
    try {
      const detalle = await getProductoPlasticoById(p.id);
      setProductoEditando(detalle);
    } catch {
      showAlert("❌ No se pudo cargar el detalle del producto");
      setVista("tabla");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleGuardar = async (
    payload: ProductoPlasticoCreate,
    pendientes: ArchivoPendientePlastico[]
  ) => {
    if (vista === "editar" && productoEditando) {
      const ok = await actualizar(productoEditando.id, payload);
      if (ok) { setVista("tabla"); setProductoEditando(null); }
      return;
    }

    const nuevoId = await crear(payload);
    if (nuevoId) {
      if (pendientes.length > 0) {
        await Promise.allSettled(
          pendientes.map((p) => subirArchivoProductoPlastico(p.file, p.categoria, nuevoId))
        );
      }
      showAlert(`✅ Producto creado exitosamente`);
      setVista("tabla");
      setProductoEditando(null);
    }
  };

  if (loadingCatalogos) {
    return (
      <Dashboard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando catálogos...</p>
          </div>
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      {vista === "tabla" ? (
        <TablaProductosPlastico
          productos={productos}
          loading={loading}
          onNuevo={handleNuevo}
          onEditar={handleEditar}
          onEliminar={eliminar}
        />
      ) : vista === "editar" && cargandoDetalle ? (
        <div className="flex items-center justify-center h-[60vh] text-sm text-gray-400">
          Cargando producto...
        </div>
      ) : (
        <FormularioProductoPlastico
          catalogos={catalogosParaSelector}
          agregarTipoProducto={agregarTipoProducto}
          agregarMaterial={agregarMaterial}
          agregarCalibre={agregarCalibre}
          productoEditando={productoEditando}
          saving={saving}
          onGuardar={handleGuardar}
          onCancelar={() => { setVista("tabla"); setProductoEditando(null); }}
        />
      )}
    </Dashboard>
  );
}