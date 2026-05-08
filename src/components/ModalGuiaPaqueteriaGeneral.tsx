import { useState, useEffect } from "react";
import { getGuiaPaqueteriaGeneral, getProductosSat, updateClavesSatBultos } from "../services/enviosService";
import { generarGuiaPaqueteriaGeneral } from "../utils/generarGuiaPaqueteriaGeneral";
import { inputClass, labelClass } from "./enviosConstants";
import type { GuiaPaqueteriaGeneral, ProductoSat } from "../types/envios.types";

interface Props {
  idenvio: number;
  onClose: () => void;
}

interface ClavesBulto {
  idbulto:            number;
  nombre_producto:    string;
  medida:             string;
  clave_producto_sat: string;
  clave_unidad_sat:   string;
}

type Paso = "cargando" | "claves" | "guardando" | "error";

export default function ModalGuiaPaqueteriaGeneral({ idenvio, onClose }: Props) {
  const [paso,         setPaso]         = useState<Paso>("cargando");
  const [datos,        setDatos]        = useState<GuiaPaqueteriaGeneral | null>(null);
  const [claves,       setClaves]       = useState<ClavesBulto[]>([]);
  const [productosSat, setProductosSat] = useState<ProductoSat[]>([]);
  const [error,        setError]        = useState<string | null>(null);

  // ── 1. Cargar datos + catálogo SAT ──
  useEffect(() => {
    const cargar = async () => {
      try {
        const [data, sat] = await Promise.all([
          getGuiaPaqueteriaGeneral(idenvio),
          getProductosSat(),
        ]);
        setDatos(data);
        setProductosSat(sat);
        // Pre-llenar con claves guardadas si existen
        setClaves(data.bultos.map(b => ({
          idbulto:            b.idbulto,
          nombre_producto:    b.nombre_producto,
          medida:             b.medida,
          clave_producto_sat: b.clave_producto_sat || "",
          clave_unidad_sat:   b.clave_unidad_sat   || "",
        })));
        setPaso("claves");
      } catch {
        setError("No se pudieron cargar los datos del envío.");
        setPaso("error");
      }
    };
    cargar();
  }, [idenvio]);

  const updateClaves = (idbulto: number, field: keyof ClavesBulto, value: string) => {
    setClaves(prev => prev.map(c => c.idbulto === idbulto ? { ...c, [field]: value } : c));
  };

  // ── 2. Guardar en BD → generar PDF → cerrar ──
  const handleGenerar = async () => {
    if (!datos) return;

    const incompleto = claves.some(c => !c.clave_producto_sat.trim() || !c.clave_unidad_sat.trim());
    if (incompleto) {
      alert("Por favor completa la clave de producto SAT y clave de unidad SAT para todos los bultos.");
      return;
    }

    setPaso("guardando");
    try {
      await updateClavesSatBultos(idenvio, claves.map(c => ({
        idbulto:            c.idbulto,
        clave_producto_sat: c.clave_producto_sat,
        clave_unidad_sat:   c.clave_unidad_sat,
      })));

      const datosConClaves: GuiaPaqueteriaGeneral = {
        ...datos,
        bultos: datos.bultos.map(b => {
          const c = claves.find(x => x.idbulto === b.idbulto);
          return {
            ...b,
            clave_producto_sat: c?.clave_producto_sat ?? "",
            clave_unidad_sat:   c?.clave_unidad_sat   ?? "",
          };
        }),
      };

      generarGuiaPaqueteriaGeneral(datosConClaves);
      onClose();
    } catch {
      alert("Error al guardar las claves SAT. Intenta de nuevo.");
      setPaso("claves");
    }
  };

  // ── RENDERS ──

  if (paso === "cargando") return (
    <div className="flex justify-center items-center py-16">
      <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (paso === "error") return (
    <div className="py-10 text-center text-red-500 text-sm">{error}</div>
  );

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
        Ingresa las claves SAT para cada bulto. Se guardarán para la próxima vez.
      </div>

      {claves.map((c, idx) => {
        const bultoDatos = datos?.bultos.find(b => b.idbulto === c.idbulto);
        return (
          <div key={c.idbulto} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">

            <p className="text-xs font-semibold text-gray-700">
              Bulto #{idx + 1} — {c.nombre_producto} {c.medida && `(${c.medida})`}
            </p>

            <div className="flex gap-4 bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500">
              <span>
                <span className="font-medium text-gray-600">Dimensiones: </span>
                {bultoDatos?.alto != null
                  ? `${bultoDatos.alto} × ${bultoDatos.largo} × ${bultoDatos.ancho} cm`
                  : "—"}
              </span>
              <span>
                <span className="font-medium text-gray-600">Peso: </span>
                {bultoDatos?.peso != null ? `${bultoDatos.peso} kg` : "—"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Clave Unidad SAT *</label>
                <input
                  type="text"
                  value={c.clave_unidad_sat}
                  onChange={e => updateClaves(c.idbulto, "clave_unidad_sat", e.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="Ej. KGM, H87, LTR"
                  disabled={paso === "guardando"}
                />
              </div>
              <div>
                <label className={labelClass}>Clave Producto SAT *</label>
                <select
                  value={c.clave_producto_sat}
                  onChange={e => updateClaves(c.idbulto, "clave_producto_sat", e.target.value)}
                  className={inputClass}
                  disabled={paso === "guardando"}>
                  <option value="">Seleccionar clave...</option>
                  {productosSat.map(p => (
                    <option key={p.idproducto_sat} value={p.clave}>
                      {p.clave} — {p.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        );
      })}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button onClick={onClose} disabled={paso === "guardando"}
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">
          Cancelar
        </button>
        <button onClick={handleGenerar} disabled={paso === "guardando"}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm disabled:opacity-50">
          {paso === "guardando" ? "Generando..." : "Generar Guía →"}
        </button>
      </div>
    </div>
  );
}