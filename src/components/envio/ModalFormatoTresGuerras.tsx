import { useState, useEffect } from "react";
import Modal from "./../Modal";
import { inputClass, labelClass } from "./../enviosConstants";
import { getProductosSat, updateClavesSatBultos } from "../../services/enviosService";
import { generarFormatoTresGuerras } from "../../utils/generarFormatoTresGuerras";
import { preguntarGuardarS3 } from "../../services/pdfS3.service";
import type { ProductoSat } from "../../types/envios.types";
import api from "../../services/api";
import { showAlert } from './../CustomAlert';


interface BultoForm {
  idbulto:            number;
  nombre_producto:    string;
  medida:             string;
  empaque:            string;
  clave_unidad_sat:   string;
  clave_producto_sat: string;
}

interface Props {
  idenvio: number;
  onClose: () => void;
}

export default function ModalFormatoTresGuerras({ idenvio, onClose }: Props) {
  const [loading,      setLoading]      = useState(true);
  const [generando,    setGenerando]    = useState(false);
  const [datos,        setDatos]        = useState<any>(null);
  const [productosSat, setProductosSat] = useState<ProductoSat[]>([]);

  const [condicionPago,     setCondicionPago]     = useState<"pagado" | "cobrar_destino" | "cobrar_regreso">("pagado");
  const [recoleccion,       setRecoleccion]       = useState<"si" | "no">("no");
  const [tipoEntrega,       setTipoEntrega]       = useState<"ocurre" | "domicilio">("domicilio");
  const [docFactura,        setDocFactura]        = useState(false);
  const [docOrdenCompra,    setDocOrdenCompra]    = useState(false);
  const [docPedido,         setDocPedido]         = useState(false);
  const [docOtro,           setDocOtro]           = useState(false);
  const [docOtroTexto,      setDocOtroTexto]      = useState("");
  const [asegurada,         setAsegurada]         = useState(false);
  const [valorDeclarado,    setValorDeclarado]    = useState("");
  const [matPeligroso,      setMatPeligroso]      = useState(false);
  const [clavePeligroso,    setClavePeligroso]    = useState("");
  const [claveEmbalajeSat,  setClaveEmbalajeSat]  = useState("");
  const [observaciones,     setObservaciones]     = useState("");

  const [bultosForms, setBultosForms] = useState<BultoForm[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [data, sat] = await Promise.all([
          api.get(`/formato-tres-guerras/${idenvio}`).then(r => r.data),
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
          clave_unidad_sat:   b.clave_unidad_sat   || "",
          clave_producto_sat: b.clave_producto_sat || "",
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
    setGenerando(true);
    try {
      // Guardar claves SAT en BD antes de generar
      await updateClavesSatBultos(idenvio, bultosForms.map(b => ({
        idbulto:            b.idbulto,
        clave_producto_sat: b.clave_producto_sat,
        clave_unidad_sat:   b.clave_unidad_sat,
      })));

      const guardarS3 = await preguntarGuardarS3("formato Tres Guerras");
      await generarFormatoTresGuerras({
        datos: {
          ...datos,
          bultos: datos.bultos.map((b: any) => {
            const form = bultosForms.find(f => f.idbulto === b.idbulto);
            return {
              ...b,
              empaque:            form?.empaque            ?? "Bulto",
              clave_unidad_sat:   form?.clave_unidad_sat   ?? "",
              clave_producto_sat: form?.clave_producto_sat ?? "",
            };
          }),
        },
        condicionPago,
        recoleccion,
        tipoEntrega,
        documentos: {
          factura:     docFactura,
          ordenCompra: docOrdenCompra,
          pedido:      docPedido,
          otro:        docOtro,
          otroTexto:   docOtroTexto,
        },
        mercanciaAsegurada: asegurada,
        valorDeclarado,
        materialPeligroso:  matPeligroso,
        clavePeligroso,
        claveEmbalajeSat,
        observaciones,
      });
      onClose();
    } catch (e) {
      console.error("Error generando PDF:", e);
      showAlert("Error al generar el formato");
    } finally {
      setGenerando(false);
    }
  };

  if (loading) return (
    <Modal isOpen onClose={onClose} title="Formato Tres Guerras">
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </Modal>
  );

  return (
    <Modal isOpen onClose={onClose} title={`Orden de Servicio Tres Guerras — ${datos?.no_pedido}`}>
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-semibold text-gray-700 mb-1 uppercase tracking-wide">Remitente</p>
            <p className="font-medium text-gray-800">{datos?.remitente.razon_social}</p>
            <p className="text-gray-500">{datos?.remitente.rfc}</p>
            <p className="text-gray-500">{datos?.remitente.domicilio}, {datos?.remitente.colonia}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-semibold text-gray-700 mb-1 uppercase tracking-wide">Destinatario</p>
            <p className="font-medium text-gray-800">{datos?.destinatario.nombre}</p>
            <p className="text-gray-500">{datos?.destinatario.rfc || "Sin RFC"}</p>
            <p className="text-gray-500">{datos?.destinatario.domicilio}, {datos?.destinatario.colonia}</p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Condición de Pago</label>
          <div className="flex gap-2">
            {([
              { value: "pagado",          label: "Pagado (Origen)" },
              { value: "cobrar_destino",  label: "Por Cobrar (Destino)" },
              { value: "cobrar_regreso",  label: "Cobrar al Regreso" },
            ] as const).map(op => (
              <button key={op.value} type="button"
                onClick={() => setCondicionPago(op.value)}
                className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                  condicionPago === op.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Recolección</label>
            <div className="flex gap-2">
              {(["si", "no"] as const).map(op => (
                <button key={op} type="button"
                  onClick={() => setRecoleccion(op)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    recoleccion === op
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {op === "si" ? "Sí" : "No"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Tipo de Entrega</label>
            <div className="flex gap-2">
              {([
                { value: "ocurre",    label: "Ocurre" },
                { value: "domicilio", label: "A Domicilio" },
              ] as const).map(op => (
                <button key={op.value} type="button"
                  onClick={() => setTipoEntrega(op.value)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    tipoEntrega === op.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Documentos que Anexa</label>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Factura",         value: docFactura,     set: setDocFactura },
              { label: "Orden de Compra", value: docOrdenCompra, set: setDocOrdenCompra },
              { label: "Pedido",          value: docPedido,      set: setDocPedido },
              { label: "Otro",            value: docOtro,        set: setDocOtro },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={value}
                  onChange={e => set(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                {label}
              </label>
            ))}
          </div>
          {docOtro && (
            <input type="text" value={docOtroTexto}
              onChange={e => setDocOtroTexto(e.target.value)}
              className={`${inputClass} mt-2`} placeholder="Especificar otro documento..." />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Mercancía Asegurada</label>
            <div className="flex gap-2">
              {(["si", "no"] as const).map(op => (
                <button key={op} type="button"
                  onClick={() => setAsegurada(op === "si")}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    asegurada === (op === "si")
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {op === "si" ? "Sí" : "No"}
                </button>
              ))}
            </div>
          </div>
          {asegurada && (
            <div>
              <label className={labelClass}>Valor Declarado ($)</label>
              <input type="text" inputMode="decimal" value={valorDeclarado}
                onChange={e => setValorDeclarado(e.target.value.replace(/[^0-9.]/g, ""))}
                className={inputClass} placeholder="0.00" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Material Peligroso</label>
            <div className="flex gap-2">
              {(["si", "no"] as const).map(op => (
                <button key={op} type="button"
                  onClick={() => setMatPeligroso(op === "si")}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    matPeligroso === (op === "si")
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {op === "si" ? "Sí" : "No"}
                </button>
              ))}
            </div>
            {matPeligroso && (
              <input type="text" value={clavePeligroso}
                onChange={e => setClavePeligroso(e.target.value.toUpperCase())}
                className={`${inputClass} mt-2`} placeholder="Clave material peligroso" />
            )}
          </div>
          <div>
            <label className={labelClass}>Clave Embalaje SAT</label>
            <input type="text" value={claveEmbalajeSat}
              onChange={e => setClaveEmbalajeSat(e.target.value.toUpperCase())}
              className={inputClass} placeholder="Ej. 4G, 1A2..." />
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
                      <label className={labelClass}>Tipo de Bulto (Empaque)</label>
                      <select value={bulto.empaque}
                        onChange={e => updateBulto(bulto.idbulto, "empaque", e.target.value)}
                        className={inputClass}>
                        <option value="Bulto">Bulto</option>
                        <option value="Caja">Caja</option>
                        <option value="Tarima">Tarima</option>
                        <option value="Pallet">Pallet</option>
                        <option value="Sobre">Sobre</option>
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