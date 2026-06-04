import { useState, useEffect } from "react";
import Modal from "./../Modal";
import { inputClass, labelClass } from "./../enviosConstants";
import { getFormatoCastores, getProductosSat, updateClavesSatBultos } from "../../services/enviosService";
import { generarFormatoCastores } from "../../utils/generarFormatoCastores";
import { preguntarGuardarS3 } from "../../services/pdfS3.service";
import type { ProductoSat } from "../../types/envios.types";
import { showAlert } from './../CustomAlert';


interface BultoForm {
  idbulto:            number;
  nombre_producto:    string;
  medida:             string;
  empaque:            string;
  clave_producto_sat: string;
  clave_unidad_sat:   string;
}

interface Props {
  idenvio: number;
  onClose: () => void;
}

const FORMAS_PAGO = [
  { codigo: "01", label: "Efectivo" },
  { codigo: "02", label: "Cheque nominativo" },
  { codigo: "03", label: "Transferencia electrónica" },
  { codigo: "04", label: "Tarjeta de crédito" },
];

const METODOS_PAGO = [
  { codigo: "PUE", label: "Pago en una sola exhibición" },
  { codigo: "PPD", label: "Pago en parcialidades o diferido" },
];

export default function ModalFormatoCastores({ idenvio, onClose }: Props) {
  const [loading,      setLoading]      = useState(true);
  const [generando,    setGenerando]    = useState(false);
  const [datos,        setDatos]        = useState<any>(null);
  const [productosSat, setProductosSat] = useState<ProductoSat[]>([]);

  const [requiereFactura, setRequiereFactura] = useState<"si" | "no" | null>(null);
  const [formaPago,       setFormaPago]       = useState("");
  const [metodoPago,      setMetodoPago]      = useState("");
  const [pagado,          setPagado]          = useState(false);
  const [cobrarOrigen,    setCobrarOrigen]    = useState(false);
  const [cobrarDestino,   setCobrarDestino]   = useState(false);
  const [observaciones,   setObservaciones]   = useState("");
  const [noConvenio,      setNoConvenio]      = useState("");

  const [bultosForms, setBultosForms] = useState<BultoForm[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [data, sat] = await Promise.all([
          getFormatoCastores(idenvio),
          getProductosSat(),
        ]);
        setDatos(data);
        setProductosSat(sat);
        // Pre-llenar claves guardadas en BD
        setBultosForms(data.bultos.map((b: any) => ({
          idbulto:            b.idbulto,
          nombre_producto:    b.nombre_producto,
          medida:             b.medida,
          empaque:            "Bulto",
          clave_producto_sat: b.clave_producto_sat || "",
          clave_unidad_sat:   b.clave_unidad_sat   || "",
        })));
      } catch { showAlert("Error al cargar datos del formato"); }
      finally { setLoading(false); }
    };
    cargar();
  }, [idenvio]);

  const updateBulto = (idbulto: number, field: keyof BultoForm, value: string) => {
    setBultosForms(prev =>
      prev.map(b => b.idbulto === idbulto ? { ...b, [field]: value } : b)
    );
  };

  const handleGenerar = async () => {
    if (!requiereFactura) { showAlert("Indica si requiere factura"); return; }
    setGenerando(true);
    try {
      // Guardar claves SAT en BD antes de generar
      await updateClavesSatBultos(idenvio, bultosForms.map(b => ({
        idbulto:            b.idbulto,
        clave_producto_sat: b.clave_producto_sat,
        clave_unidad_sat:   b.clave_unidad_sat,
      })));

      const guardarS3 = await preguntarGuardarS3("formato Castores");
      await generarFormatoCastores({
        datos,
        bultosForms,
        requiereFactura,
        formaPago,
        metodoPago,
        pagado,
        cobrarOrigen,
        cobrarDestino,
        observaciones,
        noConvenio,
      }, guardarS3);
      onClose();
    } catch (e) {
      console.error("Error generando PDF:", e);
      showAlert("Error al generar el formato");
    } finally {
      setGenerando(false);
    }
  };

  if (loading) return (
    <Modal isOpen onClose={onClose} title="Formato Castores">
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </Modal>
  );

  return (
    <Modal isOpen onClose={onClose} title={`Solicitud de Servicio Castores — ${datos?.no_pedido}`}>
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-semibold text-gray-700 mb-1 uppercase tracking-wide text-xs">Remitente</p>
            <p className="font-medium text-gray-800">{datos?.remitente.razon_social}</p>
            <p className="text-gray-500">{datos?.remitente.rfc}</p>
            <p className="text-gray-500">{datos?.remitente.direccion_completa}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-semibold text-gray-700 mb-1 uppercase tracking-wide text-xs">Destinatario</p>
            <p className="font-medium text-gray-800">{datos?.destinatario.razon_social}</p>
            <p className="text-gray-500">{datos?.destinatario.rfc || "Sin RFC"}</p>
            <p className="text-gray-500">{datos?.destinatario.direccion_completa}</p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Requiere Factura *</label>
          <div className="flex gap-3">
            {(["si", "no"] as const).map(op => (
              <button key={op} type="button"
                onClick={() => setRequiereFactura(op)}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  requiereFactura === op
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                {op === "si" ? "✓ Sí" : "✗ No"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Número de Convenio (Opcional)</label>
          <input type="text" value={noConvenio}
            onChange={e => setNoConvenio(e.target.value)}
            className={inputClass} placeholder="Ej. 12345" />
          <p className="mt-1 text-xs text-gray-400">
            Se imprimirá en la fila de teléfono del destinatario en el formato físico.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Forma de Pago</label>
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className={inputClass}>
              <option value="">Sin especificar</option>
              {FORMAS_PAGO.map(f => (
                <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Método de Pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className={inputClass}>
              <option value="">Sin especificar</option>
              {METODOS_PAGO.map(m => (
                <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Cobro</label>
          <div className="flex gap-6">
            {[
              { label: "Pagado",         value: pagado,        set: setPagado },
              { label: "Cobrar Origen",  value: cobrarOrigen,  set: setCobrarOrigen },
              { label: "Cobrar Destino", value: cobrarDestino, set: setCobrarDestino },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={value}
                  onChange={e => set(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Observaciones</label>
          <input type="text" value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            className={inputClass} placeholder="Observaciones generales..." />
        </div>

        <div>
          <label className={labelClass}>Datos por Bulto</label>
          <div className="space-y-3">
            {bultosForms.map((bulto, idx) => {
              const bultoDatos = datos?.bultos?.find((b: any) => b.idbulto === bulto.idbulto);
              return (
                <div key={bulto.idbulto} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-700">
                    Bulto #{idx + 1} — {bulto.nombre_producto} {bulto.medida && `(${bulto.medida})`}
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
                      <label className={labelClass}>Empaque</label>
                      <select value={bulto.empaque}
                        onChange={e => updateBulto(bulto.idbulto, "empaque", e.target.value)}
                        className={inputClass}>
                        <option value="Bulto">Bulto</option>
                        <option value="Caja">Caja</option>
                        <option value="Tarima">Tarima</option>
                        <option value="Pallet">Pallet</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Clave Unidad SAT</label>
                      <input type="text"
                        value={bulto.clave_unidad_sat}
                        onChange={e => updateBulto(bulto.idbulto, "clave_unidad_sat", e.target.value.toUpperCase())}
                        className={inputClass}
                        placeholder="Ej. KGM, H87, LTR" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Clave Producto SAT</label>
                    <select value={bulto.clave_producto_sat}
                      onChange={e => updateBulto(bulto.idbulto, "clave_producto_sat", e.target.value)}
                      className={inputClass}>
                      <option value="">Seleccionar clave...</option>
                      {productosSat.map(p => (
                        <option key={p.idproducto_sat} value={p.clave}>
                          {p.clave} — {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} disabled={generando}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleGenerar} disabled={generando}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {generando ? "Generando PDF..." : "Generar e Imprimir"}
          </button>
        </div>
      </div>
    </Modal>
  );
}