import { useState, useEffect } from "react";
import Dashboard from "../layouts/Sidebar";
import SelectorProducto from "../components/ConfigurarProducto";
import {
  getCatalogosPlastico,
  createProductoPlastico,
} from "../services/productosPlasticoService";
import { getTarifas } from "../services/tarifas.service";
import type {
  CatalogosPlastico,
  DatosProducto,
} from "../types/productos-plastico.types";
import type { Tarifa } from "../types/tarifas.types";
import { calcularPorKiloStr, calcularCelofanBopp } from "../utils/calcularPorKilo";

// ✅ Hardcodeado temporal para celofán hasta que se construya su tabla en BD
const COSTOS_CELOFAN: Record<number, number> = {
  30: 250, 50: 200, 75: 180, 100: 150, 200: 120, 300: 95, 500: 90, 1000: 90,
};

const MERMA_CELOFAN: Record<number, number> = {
  30: 20, 50: 10, 75: 8, 100: 7, 200: 5, 300: 4, 500: 3, 1000: 1,
};

const kilosReferencia = [30, 50, 75, 100, 200, 300, 500, 1000];

export default function Plastico() {
  const [datosProducto, setDatosProducto] = useState<DatosProducto>({
    tipoProducto: "",
    tipoProductoId: 0,
    material: "",
    materialId: 0,
    calibre: "",
    calibreId: 0,
    gramos: undefined,
    medidas: {
      altura: "", ancho: "", fuelleFondo: "",
      fuelleLateral1: "", fuelleLateral2: "", refuerzo: "", solapa: "",
    },
    medidasFormateadas: "",
    nombreCompleto: "",
  });

  const [catalogos, setCatalogos] = useState<CatalogosPlastico>({
    tiposProducto: [], materiales: [], calibres: [],
  });

  const [tarifasPlastico, setTarifasPlastico] = useState<Record<number, { precio: number; merma: number }>>({});
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogos,    setErrorCatalogos]    = useState("");
  const [guardando,         setGuardando]         = useState(false);

  // ── Estado para error de duplicado ──────────────────────────
  const [errorDuplicado, setErrorDuplicado] = useState<string | null>(null);

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

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      setCargandoCatalogos(true);
      setErrorCatalogos("");

      const [datosCatalogos, tarifas] = await Promise.all([
        getCatalogosPlastico(),
        getTarifas(),
      ]);

      setCatalogos(datosCatalogos);

      const tarifasMap: Record<number, { precio: number; merma: number }> = {};
      tarifas.forEach((tarifa: Tarifa) => {
        if (Number(tarifa.cantidad_tintas) === 1) {
          tarifasMap[Number(tarifa.kilogramos)] = {
            precio: Number(tarifa.precio),
            merma:  Number(tarifa.merma_porcentaje),
          };
        }
      });

      setTarifasPlastico(tarifasMap);
    } catch (error: any) {
      console.error("❌ Error al cargar datos:", error);
      setErrorCatalogos(error.response?.data?.error || "Error al cargar los catálogos");
    } finally {
      setCargandoCatalogos(false);
    }
  };

  const handleProductoChange = (datos: DatosProducto) => {
    setDatosProducto(datos);
    // Limpiar error de duplicado al cambiar características
    setErrorDuplicado(null);
  };

  const guardarProducto = async () => {
    if (!datosProducto.tipoProductoId || !datosProducto.materialId || !datosProducto.calibreId) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    if (!bolsasPorKilo) {
      alert("No se pudo calcular las bolsas por kilo");
      return;
    }

    if (!datosProducto.medidas.altura || !datosProducto.medidas.ancho) {
      alert("Altura y Ancho son obligatorios");
      return;
    }

    setGuardando(true);
    setErrorDuplicado(null);

    try {
      const payload = {
        tipo_producto_plastico_id: datosProducto.tipoProductoId,
        material_plastico_id:      datosProducto.materialId,
        calibre_id:                datosProducto.calibreId,
        altura:       parseInt(datosProducto.medidas.altura),
        ancho:        parseInt(datosProducto.medidas.ancho),
        fuelle_fondo: datosProducto.medidas.fuelleFondo    ? parseInt(datosProducto.medidas.fuelleFondo)    : 0,
        fuelle_latIz: datosProducto.medidas.fuelleLateral1 ? parseInt(datosProducto.medidas.fuelleLateral1) : 0,
        fuelle_latDe: datosProducto.medidas.fuelleLateral2 ? parseInt(datosProducto.medidas.fuelleLateral2) : 0,
        refuerzo:     datosProducto.medidas.refuerzo       ? parseInt(datosProducto.medidas.refuerzo)       : 0,
        medida:       datosProducto.medidasFormateadas,
        por_kilo:     parseFloat(bolsasPorKilo),
      };

      const response = await createProductoPlastico(payload);

const prod = response.producto as typeof response.producto & { identificador?: string };

alert(
  `✅ Producto creado exitosamente\n\n🔖 Identificador: ${prod.identificador ?? "—"}\n📦 Bolsas por kilo: ${prod.por_kilo}`
);

      // Reset formulario
      setDatosProducto({
        tipoProducto: "", tipoProductoId: 0,
        material: "", materialId: 0,
        calibre: "", calibreId: 0,
        gramos: undefined,
        medidas: {
          altura: "", ancho: "", fuelleFondo: "",
          fuelleLateral1: "", fuelleLateral2: "", refuerzo: "", solapa: "",
        },
        medidasFormateadas: "",
        nombreCompleto: "",
      });
    } catch (error: any) {
      console.error("❌ Error al guardar producto:", error);
      const status = error.response?.status;
      const data   = error.response?.data;

      if (status === 409 && data?.detalle) {
        // ── Producto duplicado — mostrar inline en lugar de alert ──
        setErrorDuplicado(data.detalle);
      } else {
        const errorMessage =
          data?.error ||
          data?.details?.join(", ") ||
          "Error al guardar el producto";
        alert(`❌ Error: ${errorMessage}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const redondearACentenas = (valor: number) => Math.ceil(valor / 100) * 100;

  const getCostoMerma = (kilos: number): { precio: number; merma: number } | null => {
    if (esCelofanBopp) {
      const precio = COSTOS_CELOFAN[kilos];
      const merma  = MERMA_CELOFAN[kilos];
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
    if (!bolsasPorKilo) return "--";
    const costoMerma = getCostoMerma(kilos);
    if (!costoMerma) return "--";
    const bpk         = parseFloat(bolsasPorKilo);
    const bolsasBase  = redondearACentenas(bpk * kilos);
    const bolsasMerma = Math.ceil(bolsasBase * (costoMerma.merma / 100));
    const total       = bolsasBase + bolsasMerma;
    return { porcentajeMerma: costoMerma.merma, bolsasMerma, total };
  };

  if (cargandoCatalogos) {
    return (
      <Dashboard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando catálogos...</p>
          </div>
        </div>
      </Dashboard>
    );
  }

  if (errorCatalogos) {
    return (
      <Dashboard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-red-800 font-semibold mb-2">Error al cargar catálogos</h2>
            <p className="text-red-600 mb-4">{errorCatalogos}</p>
            <button onClick={cargarDatos} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Reintentar
            </button>
          </div>
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      <h1 className="text-2xl font-bold mb-6">Dar de alta producto</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow col-span-2">
          <SelectorProducto
            catalogos={catalogos}
            onProductoChange={handleProductoChange}
            mostrarFigura={true}
          />

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Bolsas por kilo
              </label>
              <input
                value={bolsasPorKilo || "--"}
                readOnly
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium bg-gray-50 cursor-default"
              />
            </div>

            {esCelofanBopp && pesoPorBolsa && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Peso por bolsa (g)
                </label>
                <input
                  value={pesoPorBolsa}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium bg-gray-50 cursor-default"
                />
              </div>
            )}
          </div>

          {/* ── Error de producto duplicado — inline, claro y visible ── */}
          {errorDuplicado && (
            <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Producto ya registrado</p>
                <p className="text-sm text-amber-700 mt-0.5">{errorDuplicado}</p>
              </div>
              <button
                onClick={() => setErrorDuplicado(null)}
                className="flex-shrink-0 text-amber-400 hover:text-amber-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={guardarProducto}
              disabled={guardando || !bolsasPorKilo}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                guardando || !bolsasPorKilo
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {guardando ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </span>
              ) : (
                "Guardar Producto"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TABLA DE PRODUCCIÓN */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-bold mb-1">Tabla de producción por kilogramos</h2>
        <p className="text-xs text-gray-400 mb-4">
          {esCelofanBopp
            ? "⚠️ Costos de celofán en configuración temporal"
            : "✅ Costos obtenidos de catálogo de producción"}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                {kilosReferencia.map((kilos) => (
                  <th key={kilos} className="px-4 py-3 text-center border border-blue-700">
                    {kilos}k
                  </th>
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
                  const bpk        = parseFloat(bolsasPorKilo);
                  if (!costoMerma || !bpk) {
                    return (
                      <td key={kilos} className="px-4 py-3 text-center border border-gray-300 text-gray-400">
                        --
                      </td>
                    );
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
                if (data === "--") {
                  return <div key={kilos} className="text-gray-400">--</div>;
                }
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
    </Dashboard>
  );
}