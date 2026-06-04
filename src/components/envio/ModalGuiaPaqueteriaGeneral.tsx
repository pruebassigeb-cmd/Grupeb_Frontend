import { useState, useEffect } from "react";
import Modal from "./../Modal";
import { getGuiaPaqueteriaGeneral, getProductosSat } from "../../services/enviosService";
import { generarGuiaPaqueteriaGeneral } from "../../utils/generarGuiaPaqueteriaGeneral";
import { preguntarGuardarS3 } from "../../services/pdfS3.service";
import { inputClass, labelClass } from "./../enviosConstants";
import type { GuiaPaqueteriaGeneral, ProductoSat } from "../../types/envios.types";
import { showAlert } from './../CustomAlert';


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

type Paso      = "cargando" | "claves" | "guardando" | "error";
type TipoCobro = "pagado" | "por_cobrar" | "cobrar_al_regreso";

const OPCIONES_COBRO: { value: TipoCobro; label: string }[] = [
  { value: "pagado",            label: "Pagado"            },
  { value: "por_cobrar",        label: "Por cobrar"        },
  { value: "cobrar_al_regreso", label: "Cobrar al regreso" },
];

export default function ModalGuiaPaqueteriaGeneral({ idenvio, onClose }: Props) {
  const [paso,         setPaso]         = useState<Paso>("cargando");
  const [datos,        setDatos]        = useState<GuiaPaqueteriaGeneral | null>(null);
  const [claves,       setClaves]       = useState<ClavesBulto[]>([]);
  const [productosSat, setProductosSat] = useState<ProductoSat[]>([]);
  const [error,        setError]        = useState<string | null>(null);

  // Solo para el PDF — no se persisten en BD
  const [tipoCobro,       setTipoCobro]       = useState<TipoCobro>("pagado");
  const [asegurado,       setAsegurado]       = useState(false);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [tipoEntrega,     setTipoEntrega]     = useState<"domicilio" | "ocurre">("domicilio");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [data, sat] = await Promise.all([
          getGuiaPaqueteriaGeneral(idenvio),
          getProductosSat(),
        ]);
        setDatos(data);
        setProductosSat(sat);
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

  const handleGenerar = async () => {
    if (!datos) return;

    const incompleto = claves.some(c => !c.clave_producto_sat.trim() || !c.clave_unidad_sat.trim());
    if (incompleto) {
      showAlert("Por favor completa la clave de producto SAT y clave de unidad SAT para todos los bultos.");
      return;
    }

    setPaso("guardando");
    try {
      const datosConClaves: GuiaPaqueteriaGeneral = {
        ...datos,
        tipo_cobro:       tipoCobro,
        asegurado,
        requiere_factura: requiereFactura,
        tipo_entrega:     tipoEntrega,
        bultos: datos.bultos.map(b => {
          const c = claves.find(x => x.idbulto === b.idbulto);
          return {
            ...b,
            clave_producto_sat: c?.clave_producto_sat ?? "",
            clave_unidad_sat:   c?.clave_unidad_sat   ?? "",
          };
        }),
      };

      const guardarS3 = await preguntarGuardarS3("guía de paquetería");
      generarGuiaPaqueteriaGeneral(datosConClaves, guardarS3);
      onClose();
    } catch {
      showAlert("Error al generar la guía. Intenta de nuevo.");
      setPaso("claves");
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Guía de Envío">

      {paso === "cargando" && (
        <div className="flex justify-center items-center py-16">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {paso === "error" && (
        <div className="py-10 text-center text-red-500 text-sm">{error}</div>
      )}

      {(paso === "claves" || paso === "guardando") && (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
            Ingresa las claves SAT para cada bulto.
          </div>

          {/* ── Opciones del PDF ── */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">

            {/* Tipo de cobro */}
            <div>
              <label className={labelClass}>Tipo de cobro *</label>
              <div className="flex gap-1 mt-1">
                {OPCIONES_COBRO.map(op => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setTipoCobro(op.value)}
                    disabled={paso === "guardando"}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${
                      tipoCobro === op.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}>
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Factura + Tipo de entrega */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200">

              <div>
                <label className={labelClass}>Factura</label>
                <div className="flex gap-1 mt-1">
                  {([false, true] as const).map(val => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setRequiereFactura(val)}
                      disabled={paso === "guardando"}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${
                        requiereFactura === val
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}>
                      {val ? "Con factura" : "Sin factura"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Tipo de entrega</label>
                <div className="flex gap-1 mt-1">
                  {(["domicilio", "ocurre"] as const).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTipoEntrega(val)}
                      disabled={paso === "guardando"}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${
                        tipoEntrega === val
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}>
                      {val === "domicilio" ? "🏠 Domicilio" : "📦 Ocurre"}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Asegurado */}
            <div className="flex items-center gap-3 pt-1 border-t border-gray-200">
              <label className={labelClass}>¿Va asegurado?</label>
              <button
                type="button"
                onClick={() => setAsegurado(v => !v)}
                disabled={paso === "guardando"}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  asegurado ? "bg-blue-600" : "bg-gray-300"
                }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  asegurado ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              <span className="text-sm text-gray-600 font-medium">
                {asegurado ? "Sí" : "No"}
              </span>
            </div>

          </div>

          {/* ── Claves SAT por bulto ── */}
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
      )}

    </Modal>
  );
}