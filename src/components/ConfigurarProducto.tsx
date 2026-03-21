import { useState, useEffect, useRef } from "react";
import type {
  CatalogoTipoProducto,
  CatalogoMaterial,
  CatalogoCalibre,
  DatosProducto,
  MedidaKey,
  ConfigProducto,
} from "../types/productos-plastico.types";
import { FORMATO_MEDIDAS } from "../types/productos-plastico.types";
import { getCalibres } from "../services/productosPlasticoService";

// ✅ IMPORTS DE IMÁGENES
import planaImg from "../assets/plana.png";
import troqueladaImg from "../assets/troquelada.png";
import celofanImg from "../assets/celofan.png";
import enviosImg from "../assets/envios.png";
import asaFlexibleImg from "../assets/asaflexible.png";
import bobinaImg from "../assets/bobina.png";
import rolloPerfImg from "../assets/rolloPerf.png";
import faldonImg from "../assets/faldon.png";
import laminaImg from "../assets/lamina.png";

export const CONFIG_PRODUCTOS: Record<string, ConfigProducto> = {
  "Bolsa plana": {
    imagen: planaImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
    ],
  },
  "Bolsa troquelada": {
    imagen: troqueladaImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
      { key: "fuelleFondo", label: "Fuelle fondo", position: "bottom" },
      { key: "refuerzo", label: "Refuerzo", position: "right-top" },
      { key: "fuelleLateral1", label: "Fuelle lateral", position: "right" },
      { key: "fuelleLateral2", label: "Fuelle lateral", position: "left-bottom" },
    ],
  },
  "Bolsa celofán": {
    imagen: celofanImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
      { key: "fuelleFondo", label: "Fuelle fondo", position: "bottom" },
      { key: "refuerzo", label: "Refuerzo", position: "right-top" },
      { key: "fuelleLateral1", label: "Fuelle lateral", position: "right" },
      { key: "fuelleLateral2", label: "Fuelle lateral", position: "left-bottom" },
    ],
  },
  "Bolsa envíos": {
    imagen: enviosImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
      { key: "solapa", label: "Solapa", position: "top-inside" },
      { key: "fuelleFondo", label: "Fuelle fondo", position: "bottom" },
    ],
  },
  "Bolsa asa flexible": {
    imagen: asaFlexibleImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
      { key: "fuelleFondo", label: "Fuelle fondo", position: "bottom" },
      { key: "fuelleLateral1", label: "Fuelle lateral", position: "right" },
      { key: "fuelleLateral2", label: "Fuelle lateral", position: "left-bottom" },
    ],
  },
  Bobina: {
    imagen: bobinaImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
    ],
  },
  "Rollo perforado": {
    imagen: rolloPerfImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
    ],
  },
  Faldón: {
    imagen: faldonImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
    ],
  },
  Lámina: {
    imagen: laminaImg,
    medidas: [
      { key: "altura", label: "Altura", position: "left" },
      { key: "ancho", label: "Ancho", position: "top" },
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
}

export default function SelectorProducto({
  catalogos,
  onProductoChange,
  mostrarFigura = true,
  datosIniciales = null,
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

  const [medidas, setMedidas] = useState<Record<MedidaKey, string>>({
    altura: "",
    ancho: "",
    fuelleFondo: "",
    fuelleLateral1: "",
    fuelleLateral2: "",
    refuerzo: "",
    solapa: "",
  });

  const [mostrarDropdownTipo, setMostrarDropdownTipo] = useState(false);
  const [mostrarDropdownMaterial, setMostrarDropdownMaterial] = useState(false);
  const [mostrarDropdownCalibre, setMostrarDropdownCalibre] = useState(false);

  const tipoRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<HTMLDivElement>(null);
  const calibreRef = useRef<HTMLDivElement>(null);

  const materialDeshabilitado = tipoProducto === "Bolsa celofán";

  useEffect(() => {
    const cargarCalibres = async () => {
      const esBOPP = tipoProducto === "Bolsa celofán" && material.toUpperCase() === "BOPP";
      const tipoCalibre = esBOPP ? "bopp" : "normal";
      try {
        setCargandoCalibres(true);
        const calibres = await getCalibres(tipoCalibre);
        setCalibresDisponibles(calibres);
        setCalibre("");
        setCalibreId(0);
        setCalibreGramos(null);
      } catch (error) {
        console.error("❌ Error al cargar calibres:", error);
        setCalibresDisponibles([]);
      } finally {
        setCargandoCalibres(false);
      }
    };

    if (tipoProducto && material) {
      cargarCalibres();
    } else {
      setCalibresDisponibles(catalogos.calibres);
    }
  }, [tipoProducto, material, catalogos.calibres]);

  useEffect(() => {
    if (datosIniciales) {
      setTipoProducto(datosIniciales.tipoProducto);
      setTipoProductoId(datosIniciales.tipoProductoId);
      setMaterial(datosIniciales.material);
      setMaterialId(datosIniciales.materialId);
      setCalibre(datosIniciales.calibre);
      setCalibreId(datosIniciales.calibreId);
      setCalibreGramos(datosIniciales.gramos ?? null);
      setMedidas(datosIniciales.medidas);
    }
  }, [datosIniciales]);

  const getTiposProductoFiltrados = () => {
    const materialEsBopp = material.toUpperCase() === "BOPP";
    if (materialEsBopp) return catalogos.tiposProducto;
    if (material && !materialEsBopp) {
      return catalogos.tiposProducto.filter((tipo) => tipo.nombre !== "Bolsa celofán");
    }
    return catalogos.tiposProducto;
  };

  const getMaterialesFiltrados = () => {
    const tipoEsCelofan = tipoProducto === "Bolsa celofán";
    if (tipoEsCelofan) {
      return catalogos.materiales.filter((mat) => mat.nombre.toUpperCase() === "BOPP");
    }
    if (tipoProducto && !tipoEsCelofan) {
      return catalogos.materiales.filter((mat) => mat.nombre.toUpperCase() !== "BOPP");
    }
    return catalogos.materiales;
  };

  const construirMedidasFormateadas = () => {
    const verticales = FORMATO_MEDIDAS.verticales.map((k) => medidas[k]).filter((v) => v);
    const horizontales = FORMATO_MEDIDAS.horizontales.map((k) => medidas[k]).filter((v) => v);
    if (!verticales.length && !horizontales.length) return "";
    if (!horizontales.length) return verticales.join("+");
    if (!verticales.length) return horizontales.join("+");
    return `${verticales.join("+")}x${horizontales.join("+")}`;
  };

  const construirNombreCompleto = () => {
    if (!tipoProducto || !material) return "";
    const medidasFormateadas = construirMedidasFormateadas();
    if (!medidasFormateadas) return "";
    return `${tipoProducto} ${medidasFormateadas} ${material.toLowerCase()}`;
  };

  useEffect(() => {
    const nombreCompleto = construirNombreCompleto();
    const medidasFormateadas = construirMedidasFormateadas();
    onProductoChange({
      tipoProducto,
      tipoProductoId,
      material,
      materialId,
      calibre,
      calibreId,
      gramos: calibreGramos ?? undefined,
      medidas: { ...medidas },
      medidasFormateadas,
      nombreCompleto,
    });
  }, [tipoProducto, tipoProductoId, material, materialId, calibre, calibreId, calibreGramos, medidas]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !tipoRef.current?.contains(event.target as Node) &&
        !materialRef.current?.contains(event.target as Node) &&
        !calibreRef.current?.contains(event.target as Node)
      ) {
        setMostrarDropdownTipo(false);
        setMostrarDropdownMaterial(false);
        setMostrarDropdownCalibre(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Sincronizar fuelles laterales entre sí
  // ✅ Exclusividad: fuelle lateral <-> refuerzo/fuelle fondo
  // ✅ Permite decimales con hasta 2 decimales en medidas
  const setMedida = (key: MedidaKey, value: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;

    setMedidas((prev) => {
      const nuevo = { ...prev, [key]: value };
      const v = value.trim();

      if (key === "fuelleLateral1" || key === "fuelleLateral2") {
        nuevo.fuelleLateral1 = v;
        nuevo.fuelleLateral2 = v;
        if (v !== "" && Number(v) > 0) {
          nuevo.refuerzo    = "0";
          nuevo.fuelleFondo = "0";
        }
      }

      if (key === "refuerzo" || key === "fuelleFondo") {
        if (v !== "" && Number(v) > 0) {
          nuevo.fuelleLateral1 = "0";
          nuevo.fuelleLateral2 = "0";
        }
      }

      return nuevo;
    });
  };

  // Helpers para saber si un campo está bloqueado
  const tieneLateral = Number(medidas.fuelleLateral1) > 0 || Number(medidas.fuelleLateral2) > 0;
  const tieneFondoORefuerzo = Number(medidas.fuelleFondo) > 0 || Number(medidas.refuerzo) > 0;

  return (
    <div
      className={`grid ${
        mostrarFigura ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      } gap-6`}
    >
      {/* Columna izquierda: Formulario */}
      <div className="space-y-4">
        {/* Tipo de Producto */}
        <div ref={tipoRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Producto
          </label>
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
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {mostrarDropdownTipo && (
            <ul className="absolute w-full bg-white border border-gray-300 mt-1 max-h-60 overflow-auto rounded-lg shadow-lg z-20">
              {getTiposProductoFiltrados().map((tipo) => (
                <li
                  key={tipo.id}
                  onClick={() => {
                    setTipoProducto(tipo.nombre);
                    setTipoProductoId(tipo.id);
                    setMostrarDropdownTipo(false);
                    setMedidas({
                      altura: "",
                      ancho: "",
                      fuelleFondo: "",
                      fuelleLateral1: "",
                      fuelleLateral2: "",
                      refuerzo: "",
                      solapa: "",
                    });
                    if (tipo.nombre === "Bolsa celofán") {
                      const materialBopp = catalogos.materiales.find(
                        (m) => m.nombre.toUpperCase() === "BOPP"
                      );
                      if (materialBopp) {
                        setMaterial(materialBopp.nombre);
                        setMaterialId(materialBopp.id);
                      }
                    } else if (material.toUpperCase() === "BOPP") {
                      setMaterial("");
                      setMaterialId(0);
                    }
                    setCalibre("");
                    setCalibreId(0);
                    setCalibreGramos(null);
                  }}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
                >
                  {tipo.nombre}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Material */}
        <div ref={materialRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Material
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={material}
              readOnly
              placeholder="Selecciona material"
              disabled={materialDeshabilitado}
              className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 ${
                materialDeshabilitado
                  ? "bg-gray-100 cursor-not-allowed"
                  : "bg-white cursor-pointer"
              }`}
              onClick={() =>
                !materialDeshabilitado &&
                setMostrarDropdownMaterial(!mostrarDropdownMaterial)
              }
            />
            <button
              type="button"
              onClick={() =>
                !materialDeshabilitado &&
                setMostrarDropdownMaterial(!mostrarDropdownMaterial)
              }
              disabled={materialDeshabilitado}
              className={`px-4 py-2 rounded-lg ${
                materialDeshabilitado
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
            >
              <svg
                className={`w-5 h-5 transition-transform ${mostrarDropdownMaterial ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {mostrarDropdownMaterial && !materialDeshabilitado && (
            <ul className="absolute w-full bg-white border border-gray-300 mt-1 max-h-60 overflow-auto rounded-lg shadow-lg z-20">
              {getMaterialesFiltrados().map((mat) => (
                <li
                  key={mat.id}
                  onClick={() => {
                    setMaterial(mat.nombre);
                    setMaterialId(mat.id);
                    setMostrarDropdownMaterial(false);
                    if (
                      mat.nombre.toUpperCase() !== "BOPP" &&
                      tipoProducto === "Bolsa celofán"
                    ) {
                      setTipoProducto("");
                      setTipoProductoId(0);
                      setMedidas({
                        altura: "",
                        ancho: "",
                        fuelleFondo: "",
                        fuelleLateral1: "",
                        fuelleLateral2: "",
                        refuerzo: "",
                        solapa: "",
                      });
                    }
                    setCalibre("");
                    setCalibreId(0);
                    setCalibreGramos(null);
                  }}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
                >
                  {mat.nombre}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Calibre */}
        <div ref={calibreRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calibre
            {tipoProducto === "Bolsa celofán" && material.toUpperCase() === "BOPP" && (
              <span className="ml-2 text-xs text-blue-600 font-normal">(BOPP)</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={calibre}
              readOnly
              placeholder={cargandoCalibres ? "Cargando..." : "Selecciona calibre"}
              disabled={cargandoCalibres}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              onClick={() =>
                !cargandoCalibres && setMostrarDropdownCalibre(!mostrarDropdownCalibre)
              }
            />
            <button
              type="button"
              onClick={() =>
                !cargandoCalibres && setMostrarDropdownCalibre(!mostrarDropdownCalibre)
              }
              disabled={cargandoCalibres}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {cargandoCalibres ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg
                  className={`w-5 h-5 transition-transform ${mostrarDropdownCalibre ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
          {mostrarDropdownCalibre && !cargandoCalibres && (
            <ul className="absolute w-full bg-white border border-gray-300 mt-1 max-h-60 overflow-auto rounded-lg shadow-lg z-20">
              {calibresDisponibles.length > 0 ? (
                calibresDisponibles.map((cal) => (
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
                    {cal.valor}
                    {cal.gramos && (
                      <span className="ml-2 text-xs text-gray-400">({cal.gramos}g)</span>
                    )}
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-gray-500 text-center">
                  No hay calibres disponibles
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Nombre generado automáticamente */}
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

      {/* Columna derecha: Figura con medidas */}
      {mostrarFigura && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="relative w-full h-[400px] flex items-center justify-center">
            {tipoProducto && CONFIG_PRODUCTOS[tipoProducto] ? (
              <>
                <img
                  src={CONFIG_PRODUCTOS[tipoProducto].imagen}
                  alt={tipoProducto}
                  className="max-w-[200px] max-h-[300px] object-contain"
                />

                {CONFIG_PRODUCTOS[tipoProducto].medidas.map((m) => {
                  const esLateral = m.key === "fuelleLateral1" || m.key === "fuelleLateral2";
                  const esFondoORefuerzo = m.key === "fuelleFondo" || m.key === "refuerzo";
                  const bloqueado = (esLateral && tieneFondoORefuerzo) || (esFondoORefuerzo && tieneLateral);

                  return (
                    <div
                      key={m.key}
                      className={`absolute flex items-center gap-1 ${
                        m.position === "top" && "top-4 left-1/2 -translate-x-1/2 flex-col"
                      } ${
                        m.position === "left" && "left-4 top-1/2 -translate-y-1/2 flex-row"
                      } ${
                        m.position === "bottom" && "bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse"
                      } ${
                        m.position === "right" && "right-4 top-1/2 -translate-y-1/2 flex-row-reverse"
                      } ${
                        m.position === "right-top" && "right-4 top-16 flex-row-reverse"
                      } ${
                        m.position === "left-bottom" && "left-4 bottom-16 flex-row"
                      } ${
                        m.position === "top-inside" && "top-16 right-4 flex-col"
                      }`}
                    >
                      <label className={`text-xs font-medium whitespace-nowrap ${bloqueado ? "text-gray-300" : "text-gray-700"}`}>
                        {m.label}
                        {(m.key === "fuelleLateral1" || m.key === "fuelleLateral2") && !bloqueado && (
                          <span className="ml-1 text-blue-400 text-xs" title="Se sincroniza con el otro fuelle lateral">⇄</span>
                        )}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={medidas[m.key]}
                        onChange={(e) => !bloqueado && setMedida(m.key, e.target.value)}
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