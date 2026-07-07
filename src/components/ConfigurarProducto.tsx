import { useState, useEffect, useRef, useMemo } from "react";
import type {
  CatalogoTipoProducto,
  CatalogoMaterial,
  CatalogoCalibre,
  DatosProducto,
  MedidaKey,
  ConfigProducto,
} from "../types/productos-plastico.types";
import type {
  TipoProductoAdminItem,
  MaterialAdminItem,
  CalibreAdminItem,
} from "../types/productos-plastico.types";
import { FORMATO_MEDIDAS } from "../types/productos-plastico.types";
import { getCalibres } from "../services/productosPlasticoService";
import { formatNumero } from "../utils/formatNumero";
import {
  AgregarTipoProductoInline,
  AgregarMaterialInline,
  AgregarCalibreInline,
} from "./plastico/AgregarCatalogoPlasticoInline";

import planaImg       from "../assets/plana.png";
import troqueladaImg from "../assets/troquelada.png";
import celofanImg    from "../assets/celofan.png";
import enviosImg     from "../assets/envios.png";
import asaFlexibleImg from "../assets/asaflexible.png";
import bobinaImg      from "../assets/bobina.png";
import rolloPerfImg   from "../assets/rolloPerf.png";
import faldonImg      from "../assets/faldon.png";
import laminaImg      from "../assets/lamina.png";

export const CONFIG_PRODUCTOS: Record<string, ConfigProducto> = {
  "Bolsa plana": {
    imagen: planaImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho",  label: "Ancho",  position: "top"  },
    ],
  },
  "Bolsa troquelada": {
    imagen: troqueladaImg,
    medidas: [
      { key: "altura",         label: "Altura",         position: "left"        },
      { key: "ancho",          label: "Ancho",          position: "top"         },
      { key: "fuelleFondo",    label: "Fuelle fondo",   position: "bottom"      },
      { key: "refuerzo",       label: "Refuerzo",       position: "right-top"   },
      { key: "fuelleLateral1", label: "Fuelle lateral", position: "right"       },
      { key: "fuelleLateral2", label: "Fuelle lateral", position: "left-bottom" },
    ],
  },
  "Bolsa celofán": {
    imagen: celofanImg,
    medidas: [
      { key: "altura",         label: "Altura",         position: "left"        },
      { key: "ancho",          label: "Ancho",          position: "top"         },
      { key: "fuelleFondo",    label: "Fuelle fondo",   position: "bottom"      },
      { key: "refuerzo",       label: "Refuerzo",       position: "right-top"   },
      { key: "fuelleLateral1", label: "Fuelle lateral", position: "right"       },
      { key: "fuelleLateral2", label: "Fuelle lateral", position: "left-bottom" },
    ],
  },
  "Bolsa envíos": {
    imagen: enviosImg,
    medidas: [
      { key: "altura",      label: "Altura",       position: "left"       },
      { key: "ancho",       label: "Ancho",        position: "top"        },
      { key: "refuerzo",    label: "Refuerzo",     position: "top-inside" },
      { key: "fuelleFondo", label: "Fuelle fondo", position: "bottom"     },
    ],
  },
  "Bolsa asa flexible": {
    imagen: asaFlexibleImg,
    medidas: [
      { key: "altura",         label: "Altura",         position: "left"        },
      { key: "ancho",          label: "Ancho",          position: "top"         },
      { key: "fuelleFondo",    label: "Fuelle fondo",   position: "bottom"      },
      { key: "fuelleLateral1", label: "Fuelle lateral", position: "right"       },
      { key: "fuelleLateral2", label: "Fuelle lateral", position: "left-bottom" },
    ],
  },
  Bobina: {
    imagen: bobinaImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho",  label: "Ancho",  position: "top"  },
    ],
  },
  "Rollo perforado": {
    imagen: rolloPerfImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho",  label: "Ancho",  position: "top"  },
    ],
  },
  "Faldón": {
    imagen: faldonImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho",  label: "Ancho",  position: "top"  },
    ],
  },
  "Lámina": {
    imagen: laminaImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho",  label: "Ancho",  position: "top"  },
    ],
  },
};

interface SelectorProductoProps {
  catalogos: {
    tiposProducto: CatalogoTipoProducto[];
    materiales: CatalogoMaterial[];
    calibres: CatalogoCalibre[];
  };
  onProductoChange: (datos: DatosProducto) => void;
  mostrarFigura?: boolean;
  datosIniciales?: DatosProducto | null;
  onAgregarTipoProducto?: (nombre: string) => Promise<TipoProductoAdminItem>;
  onAgregarMaterial?: (nombre: string, valor: number) => Promise<MaterialAdminItem>;
  onAgregarCalibre?: (
    calibre: number,
    calibre_bopp?: number | null,
    gramos?: number | null
  ) => Promise<CalibreAdminItem>;
}

const medidasVacias: Record<MedidaKey, string> = {
  altura: "",
  ancho: "",
  fuelleFondo: "",
  fuelleLateral1: "",
  fuelleLateral2: "",
  refuerzo: "",
};

export default function SelectorProducto({
  catalogos,
  onProductoChange,
  mostrarFigura = true,
  datosIniciales = null,
  onAgregarTipoProducto,
  onAgregarMaterial,
  onAgregarCalibre,
}: SelectorProductoProps) {
  const [tipoProducto, setTipoProducto] = useState("");
  const [tipoProductoId, setTipoProductoId] = useState(0);
  const [material, setMaterial] = useState("");
  const [materialId, setMaterialId] = useState(0);
  const [calibre, setCalibre] = useState("");
  const [calibreId, setCalibreId] = useState(0);
  const [calibreGramos, setCalibreGramos] = useState<number | null>(null);

  const [calibresDisponibles, setCalibresDisponibles] = useState<CatalogoCalibre[]>([]);
  const [cargandoCalibres, setCargandoCalibres] = useState(false);
  const [calibreRefreshTick, setCalibreRefreshTick] = useState(0);

  const [medidas, setMedidas] = useState<Record<MedidaKey, string>>(medidasVacias);

  const [mostrarDropdownTipo, setMostrarDropdownTipo] = useState(false);
  const [mostrarDropdownMaterial, setMostrarDropdownMaterial] = useState(false);
  const [mostrarDropdownCalibre, setMostrarDropdownCalibre] = useState(false);

  const tipoRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<HTMLDivElement>(null);
  const calibreRef = useRef<HTMLDivElement>(null);

  const tipoProductoRef = useRef(tipoProducto);
  const materialRef2 = useRef(material);
  const calibrePendienteRef = useRef<{ id: number; valor: string } | null>(null);
  const inicializadoRef = useRef(false);

  const materialDeshabilitado = tipoProducto === "Bolsa celofán";

  const configProducto = useMemo(() => {
    return tipoProducto ? CONFIG_PRODUCTOS[tipoProducto] ?? null : null;
  }, [tipoProducto]);

  useEffect(() => {
    tipoProductoRef.current = tipoProducto;
  }, [tipoProducto]);

  useEffect(() => {
    materialRef2.current = material;
  }, [material]);

  useEffect(() => {
    if (!datosIniciales || inicializadoRef.current) return;

    inicializadoRef.current = true;

    if (datosIniciales.calibreId && datosIniciales.calibre) {
      calibrePendienteRef.current = {
        id: datosIniciales.calibreId,
        valor: String(datosIniciales.calibre),
      };
    }

    setTipoProducto(datosIniciales.tipoProducto || "");
    setTipoProductoId(datosIniciales.tipoProductoId || 0);
    setMaterial(datosIniciales.material || "");
    setMaterialId(datosIniciales.materialId || 0);
    setCalibreGramos(datosIniciales.gramos ?? null);
    setMedidas({ ...medidasVacias, ...(datosIniciales.medidas || {}) });
  }, [datosIniciales]);

  useEffect(() => {
    if (!tipoProducto) {
      setCalibresDisponibles(catalogos.calibres);
      setCargandoCalibres(false);
      return;
    }

    if (!material) {
      setCalibresDisponibles(catalogos.calibres);
      setCargandoCalibres(false);
      return;
    }

    const controller = new AbortController();

    const cargarCalibres = async () => {
      const tipoActual = tipoProductoRef.current;
      const matActual = materialRef2.current;
      const esBOPP = tipoActual === "Bolsa celofán" && matActual.toUpperCase() === "BOPP";
      const tipoCalibre = esBOPP ? "bopp" : "normal";

      setCargandoCalibres(true);

      try {
        const lista = await getCalibres(tipoCalibre);

        if (controller.signal.aborted) return;

        setCalibresDisponibles(lista);

        const pendiente = calibrePendienteRef.current;

        if (pendiente) {
          const encontrado =
            lista.find(c => c.id === pendiente.id) ??
            lista.find(c => String(c.valor) === pendiente.valor);

          if (encontrado) {
            setCalibre(String(encontrado.valor));
            setCalibreId(encontrado.id);
            setCalibreGramos(encontrado.gramos ?? null);
          } else {
            setCalibre("");
            setCalibreId(0);
            setCalibreGramos(null);
          }

          calibrePendienteRef.current = null;
          return;
        }

        setCalibre("");
        setCalibreId(0);
        setCalibreGramos(null);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("❌ Error al cargar calibres:", err);
        setCalibresDisponibles([]);
        setCalibre("");
        setCalibreId(0);
        setCalibreGramos(null);
        calibrePendienteRef.current = null;
      } finally {
        if (!controller.signal.aborted) setCargandoCalibres(false);
      }
    };

    cargarCalibres();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoProducto, material, catalogos.calibres, calibreRefreshTick]);

  const construirMedidasFormateadas = () => {
    const v = FORMATO_MEDIDAS.verticales.map(k => medidas[k]).filter(Boolean);
    const h = FORMATO_MEDIDAS.horizontales.map(k => medidas[k]).filter(Boolean);

    if (!v.length && !h.length) return "";
    if (!h.length) return v.join("+");
    if (!v.length) return h.join("+");

    return `${v.join("+")}x${h.join("+")}`;
  };

  const construirNombreCompleto = () => {
    if (!tipoProducto || !material) return "";

    const mf = construirMedidasFormateadas();
    if (!mf) return "";

    return `${tipoProducto} ${mf} ${material.toLowerCase()}`;
  };

  useEffect(() => {
    onProductoChange({
      tipoProducto,
      tipoProductoId,
      material,
      materialId,
      calibre,
      calibreId,
      gramos: calibreGramos ?? undefined,
      medidas: { ...medidas },
      medidasFormateadas: construirMedidasFormateadas(),
      nombreCompleto: construirNombreCompleto(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoProducto, tipoProductoId, material, materialId, calibre, calibreId, calibreGramos, medidas]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !tipoRef.current?.contains(e.target as Node) &&
        !materialRef.current?.contains(e.target as Node) &&
        !calibreRef.current?.contains(e.target as Node)
      ) {
        setMostrarDropdownTipo(false);
        setMostrarDropdownMaterial(false);
        setMostrarDropdownCalibre(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // REGLA CELOFÁN ⟷ BOPP
  //   - Tipo = "Bolsa celofán"  →  Material se fuerza a BOPP (seleccionarTipo)
  //   - Material = "BOPP"       →  Tipo se fuerza a "Bolsa celofán" (seleccionarMaterial)
  //   - Calibre, en ese combo, solo muestra los que tienen calibre_bopp/gramos
  //
  // ✅ FIX: el dropdown de TIPO ya NO se limita a solo "Bolsa celofán" cuando
  // material=BOPP. Antes eso atrapaba al usuario (una vez en celofán+BOPP,
  // el dropdown de tipo solo mostraba esa única opción y no había forma de
  // cambiar a otro producto). Ahora, si material=BOPP o no hay material aún,
  // se muestran TODOS los tipos; si eligen uno distinto de celofán,
  // seleccionarTipo ya se encarga de limpiar el material BOPP automáticamente.
  // Solo se sigue ocultando "Bolsa celofán" cuando ya hay un material
  // DISTINTO de BOPP elegido (eso sí es válido: celofán nunca puede ir con
  // otro material, y no atrapa nada porque el resto de opciones sigue ahí).
  // ═══════════════════════════════════════════════════════════════════════
  const getTiposProductoFiltrados = () => {
    const esBoppMaterial = material.toUpperCase() === "BOPP";

    if (material && !esBoppMaterial) {
      return catalogos.tiposProducto.filter(t => t.nombre !== "Bolsa celofán");
    }

    return catalogos.tiposProducto;
  };

  const getMaterialesFiltrados = () => {
    const esCelofan = tipoProducto === "Bolsa celofán";

    if (esCelofan) {
      return catalogos.materiales.filter(m => m.nombre.toUpperCase() === "BOPP");
    }

    if (tipoProducto && !esCelofan) {
      return catalogos.materiales.filter(m => m.nombre.toUpperCase() !== "BOPP");
    }

    return catalogos.materiales;
  };

  const limpiarCalibre = () => {
    setCalibre("");
    setCalibreId(0);
    setCalibreGramos(null);
    calibrePendienteRef.current = null;
  };

  const seleccionarTipo = (tipo: { id: number; nombre: string }) => {
    setTipoProducto(tipo.nombre);
    setTipoProductoId(tipo.id);
    setMostrarDropdownTipo(false);
    setMedidas({ ...medidasVacias });

    if (tipo.nombre === "Bolsa celofán") {
      const bopp = catalogos.materiales.find(m => m.nombre.toUpperCase() === "BOPP");
      if (bopp) { setMaterial(bopp.nombre); setMaterialId(bopp.id); }
    } else if (material.toUpperCase() === "BOPP") {
      // Cambiaron a un tipo que no es celofán teniendo BOPP puesto → se limpia
      setMaterial(""); setMaterialId(0);
    }
    limpiarCalibre();
  };

  const seleccionarMaterial = (mat: { id: number; nombre: string }) => {
    setMaterial(mat.nombre);
    setMaterialId(mat.id);
    setMostrarDropdownMaterial(false);

    if (mat.nombre.toUpperCase() === "BOPP") {
      if (tipoProducto !== "Bolsa celofán") {
        const celofan = catalogos.tiposProducto.find(t => t.nombre === "Bolsa celofán");
        if (celofan) {
          setTipoProducto(celofan.nombre);
          setTipoProductoId(celofan.id);
          setMedidas({ ...medidasVacias });
        }
      }
    } else if (tipoProducto === "Bolsa celofán") {
      setTipoProducto(""); setTipoProductoId(0);
      setMedidas({ ...medidasVacias });
    }

    limpiarCalibre();
  };

  const setMedida = (key: MedidaKey, value: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;

    setMedidas(prev => {
      const nuevo = { ...prev, [key]: value };
      const v = value.trim();

      if (key === "fuelleLateral1" || key === "fuelleLateral2") {
        nuevo.fuelleLateral1 = v;
        nuevo.fuelleLateral2 = v;

        if (v !== "" && Number(v) > 0) {
          nuevo.refuerzo = "";
          nuevo.fuelleFondo = "";
        }
      }

      if (key === "refuerzo" || key === "fuelleFondo") {
        if (v !== "" && Number(v) > 0) {
          nuevo.fuelleLateral1 = "";
          nuevo.fuelleLateral2 = "";
        }
      }

      return nuevo;
    });
  };

  const tieneLateral =
    Number(medidas.fuelleLateral1) > 0 ||
    Number(medidas.fuelleLateral2) > 0;

  const tieneFondoORefuerzo =
    Number(medidas.fuelleFondo) > 0 ||
    Number(medidas.refuerzo) > 0;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Formulario ── */}
      <div className="space-y-4">

        {/* Tipo de Producto */}
        <div ref={tipoRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Producto</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tipoProducto}
              readOnly
              placeholder="Selecciona tipo"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer"
              onClick={() => setMostrarDropdownTipo(!mostrarDropdownTipo)}
            />
            <button
              type="button"
              onClick={() => setMostrarDropdownTipo(!mostrarDropdownTipo)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg
                className={`w-5 h-5 transition-transform ${mostrarDropdownTipo ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {material.toUpperCase() === "BOPP" && (
            <p className="mt-1 text-xs text-blue-600">
              ℹ️ Con material BOPP, este producto es "Bolsa celofán". Puedes cambiar el tipo si lo necesitas;
              el material se limpiará automáticamente.
            </p>
          )}
          {mostrarDropdownTipo && (
            <ul className="absolute w-full bg-white border border-gray-300 mt-1 max-h-72 overflow-auto rounded-lg shadow-lg z-20">
              {getTiposProductoFiltrados().map(tipo => (
                <li
                  key={tipo.id}
                  onClick={() => seleccionarTipo(tipo)}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
                >
                  {tipo.nombre}
                </li>
              ))}
              {onAgregarTipoProducto && (
                <AgregarTipoProductoInline
                  onAgregar={async (nombre) => {
                    const nuevo = await onAgregarTipoProducto(nombre);
                    seleccionarTipo({ id: nuevo.id, nombre: nuevo.nombre });
                    return nuevo;
                  }}
                />
              )}
            </ul>
          )}
        </div>

        {/* Material */}
        <div ref={materialRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={material}
              readOnly
              placeholder="Selecciona material"
              disabled={materialDeshabilitado}
              className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 ${
                materialDeshabilitado ? "bg-gray-100 cursor-not-allowed" : "bg-white cursor-pointer"
              }`}
              onClick={() => !materialDeshabilitado && setMostrarDropdownMaterial(!mostrarDropdownMaterial)}
            />
            <button
              type="button"
              disabled={materialDeshabilitado}
              onClick={() => !materialDeshabilitado && setMostrarDropdownMaterial(!mostrarDropdownMaterial)}
              className={`px-4 py-2 rounded-lg text-white ${
                materialDeshabilitado ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <svg
                className={`w-5 h-5 transition-transform ${mostrarDropdownMaterial ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {materialDeshabilitado && (
            <p className="mt-1 text-xs text-blue-600">
              🔒 "Bolsa celofán" solo puede usarse con material BOPP. Cambia el tipo de producto arriba
              si quieres usar otro material.
            </p>
          )}
          {mostrarDropdownMaterial && !materialDeshabilitado && (
            <ul className="absolute w-full bg-white border border-gray-300 mt-1 max-h-72 overflow-auto rounded-lg shadow-lg z-20">
              {getMaterialesFiltrados().map(mat => (
                <li
                  key={mat.id}
                  onClick={() => seleccionarMaterial(mat)}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
                >
                  {mat.nombre}
                </li>
              ))}
              {onAgregarMaterial && (
                <AgregarMaterialInline
                  onAgregar={async (nombre, valor) => {
                    const nuevo = await onAgregarMaterial(nombre, valor);
                    seleccionarMaterial({ id: nuevo.id, nombre: nuevo.nombre });
                    return nuevo;
                  }}
                />
              )}
            </ul>
          )}
        </div>

        {/* Calibre */}
        <div ref={calibreRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calibre
            {tipoProducto === "Bolsa celofán" && material.toUpperCase() === "BOPP" && (
              <span className="ml-2 text-xs text-blue-600 font-normal">(BOPP — solo calibres con gramaje)</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formatNumero(calibre)}
              readOnly
              placeholder={cargandoCalibres ? "Cargando..." : "Selecciona calibre"}
              disabled={cargandoCalibres}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              onClick={() => !cargandoCalibres && setMostrarDropdownCalibre(!mostrarDropdownCalibre)}
            />
            <button
              type="button"
              disabled={cargandoCalibres}
              onClick={() => !cargandoCalibres && setMostrarDropdownCalibre(!mostrarDropdownCalibre)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {cargandoCalibres ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg
                  className={`w-5 h-5 transition-transform ${mostrarDropdownCalibre ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
          {mostrarDropdownCalibre && !cargandoCalibres && (
            <ul className="absolute w-full bg-white border border-gray-300 mt-1 max-h-72 overflow-auto rounded-lg shadow-lg z-20">
              {calibresDisponibles.length > 0 ? (
                calibresDisponibles.map(cal => (
                  <li
                    key={cal.id}
                    onClick={() => {
                      setCalibre(cal.valor.toString());
                      setCalibreId(cal.id);
                      setCalibreGramos(cal.gramos ?? null);
                      setMostrarDropdownCalibre(false);
                    }}
                    className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
                  >
                    {formatNumero(cal.valor)}
                    {cal.gramos && <span className="ml-2 text-xs text-gray-400">({formatNumero(cal.gramos)}g)</span>}
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-gray-500 text-center">No hay calibres disponibles</li>
              )}
              {onAgregarCalibre && (
                <AgregarCalibreInline
                  esContextoBopp={tipoProducto === "Bolsa celofán" && material.toUpperCase() === "BOPP"}
                  onAgregar={async (nuevoCalibre, calibre_bopp, gramos) => {
                    const nuevo = await onAgregarCalibre(nuevoCalibre, calibre_bopp, gramos);
                    const valorMostrado =
                      tipoProducto === "Bolsa celofán" && material.toUpperCase() === "BOPP" && nuevo.calibre_bopp
                        ? nuevo.calibre_bopp
                        : nuevo.calibre;
                    calibrePendienteRef.current = { id: nuevo.id, valor: String(valorMostrado) };
                    setMostrarDropdownCalibre(false);
                    setCalibreRefreshTick(t => t + 1);
                    return nuevo;
                  }}
                />
              )}
            </ul>
          )}
        </div>

        {/* Nombre generado */}
        {construirNombreCompleto() && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Nombre del producto:</p>
            <p className="text-sm text-gray-900">{construirNombreCompleto()}</p>
          </div>
        )}

        {/* Medidas formateadas */}
        {construirMedidasFormateadas() && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medidas</label>
            <input
              value={construirMedidasFormateadas()}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium bg-gray-50"
            />
          </div>
        )}
      </div>

      {/* ── Figura — siempre debajo del formulario ── */}
      {mostrarFigura && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div
            className="relative w-full flex items-center justify-center"
            style={{ height: "420px", padding: "40px 60px" }}
          >
            {configProducto ? (
              <>
                <img
                  src={configProducto.imagen}
                  alt={tipoProducto}
                  className="max-w-[200px] max-h-[300px] object-contain"
                />

                {configProducto.medidas.map(m => {
                  const esLateral = m.key === "fuelleLateral1" || m.key === "fuelleLateral2";
                  const esFondoORefuerzo = m.key === "fuelleFondo" || m.key === "refuerzo";
                  const bloqueado =
                    (esLateral && tieneFondoORefuerzo) ||
                    (esFondoORefuerzo && tieneLateral);

                  return (
                    <div
                      key={m.key}
                      className={`absolute flex items-center gap-1
                        ${m.position === "top" && "top-4 left-1/2 -translate-x-1/2 flex-col"}
                        ${m.position === "left" && "left-4 top-1/2 -translate-y-1/2 flex-row"}
                        ${m.position === "bottom" && "bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse"}
                        ${m.position === "right" && "right-4 top-1/2 -translate-y-1/2 flex-row-reverse"}
                        ${m.position === "right-top" && "right-4 top-16 flex-row-reverse"}
                        ${m.position === "left-bottom" && "left-4 bottom-16 flex-row"}
                        ${m.position === "top-inside" && "top-16 right-4 flex-col"}
                      `}
                    >
                      <label className={`text-xs font-medium whitespace-nowrap ${bloqueado ? "text-gray-300" : "text-gray-700"}`}>
                        {m.label}
                        {(m.key === "fuelleLateral1" || m.key === "fuelleLateral2") && !bloqueado && (
                          <span className="ml-1 text-blue-400 text-xs" title="Se sincroniza con el otro fuelle lateral">
                            ⇄
                          </span>
                        )}
                      </label>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={medidas[m.key]}
                        onChange={e => !bloqueado && setMedida(m.key, e.target.value)}
                        disabled={bloqueado}
                        className={`w-16 px-2 py-1 text-sm text-center border-2 rounded focus:outline-none ${
                          bloqueado
                            ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : "border-gray-300 focus:border-blue-500"
                        }`}
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-gray-400 text-center">Selecciona un tipo de producto</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}