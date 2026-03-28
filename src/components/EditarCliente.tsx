import { useState, useEffect } from "react";
import { getRegimenesFiscales, getMetodosPago, getFormasPago } from "../services/catalogosService";
import type { RegimenFiscal, MetodoPago, FormaPago } from "../types/clientes.types";

const MONEDAS = [
  { codigo: "MXN", nombre: "Peso mexicano (MXN)" },
  { codigo: "USD", nombre: "Dólar estadounidense (USD)" },
  { codigo: "EUR", nombre: "Euro (EUR)" },
  { codigo: "JPY", nombre: "Yen japonés (JPY)" },
  { codigo: "GBP", nombre: "Libra esterlina (GBP)" },
  { codigo: "CNY", nombre: "Yuan chino (CNY)" },
  { codigo: "CAD", nombre: "Dólar canadiense (CAD)" },
  { codigo: "CHF", nombre: "Franco suizo (CHF)" },
  { codigo: "AUD", nombre: "Dólar australiano (AUD)" },
  { codigo: "INR", nombre: "Rupia india (INR)" },
];

interface EditarClienteProps {
  cliente: ClienteCompleto;
  onSubmit: (datos: ClienteCompleto) => void;
  onCancel: () => void;
}

interface ClienteCompleto {
  id: number;
  numeroCliente: string;
  correo: string;
  nombreEmpresa: string;
  razonSocial: string;
  atencionNombre: string;
  impresion: string;
  calle: string;
  numero: string;
  colonia: string;
  codigoPostal: string;
  telefono: string;
  celular: string;
  poblacion: string;
  estado: string;
  rfc: string;
  cfdi: string;
  mailFacturacion: string;
  regimen_fiscal_idregimen_fiscal: number;
  metodo_pago_idmetodo_pago: number;
  forma_pago_idforma_pago: number;
  moneda: string;
}

export default function EditarCliente({
  cliente,
  onSubmit,
  onCancel,
}: EditarClienteProps) {
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState<ClienteCompleto>(cliente);

  const [regimenesFiscales, setRegimenesFiscales] = useState<RegimenFiscal[]>([]);
  const [metodosPago,       setMetodosPago]       = useState<MetodoPago[]>([]);
  const [formasPago,        setFormasPago]        = useState<FormaPago[]>([]);

  useEffect(() => { cargarCatalogos(); }, []);

  const cargarCatalogos = async () => {
    try {
      const [regimenesData, metodosData, formasData] = await Promise.all([
        getRegimenesFiscales(),
        getMetodosPago(),
        getFormasPago(),
      ]);
      setRegimenesFiscales(regimenesData);
      setMetodosPago(metodosData);
      setFormasPago(formasData);
    } catch (error) {
      console.error("Error al cargar catálogos:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const camposNumericos = [
      "regimen_fiscal_idregimen_fiscal",
      "metodo_pago_idmetodo_pago",
      "forma_pago_idforma_pago",
    ];
    setDatos({
      ...datos,
      [name]: camposNumericos.includes(name) ? parseInt(value) : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(datos);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Indicador de pasos ── */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${paso === 1 ? "bg-blue-600 text-white" : "bg-green-600 text-white"}`}>
            {paso === 1 ? "1" : "✓"}
          </div>
          <div className={`w-24 h-1 ${paso === 2 ? "bg-blue-600" : "bg-gray-300"}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${paso === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}>
            2
          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          PASO 1 — Datos generales
      ════════════════════════════════ */}
      <div className={paso === 1 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Datos Generales</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de Empresa</label>
              <input type="text" name="nombreEmpresa" value={datos.nombreEmpresa} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="Imprenta Digital SA" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Razón Social</label>
              <input type="text" name="razonSocial" value={datos.razonSocial} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="Imprenta Digital SA de CV" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Atención (Nombre)</label>
              <input type="text" name="atencionNombre" value={datos.atencionNombre} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="Roberto Sánchez" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Impresión</label>
              <input type="text" name="impresion" value={datos.impresion} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="CocaCola, Abito..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
            <input type="text" name="correo" value={datos.correo} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
              placeholder="contacto@empresa.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Domicilio</label>
            <div className="grid grid-cols-3 gap-4">
              <input type="text" name="calle" value={datos.calle} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="Calle" />
              <input type="text" name="numero" value={datos.numero} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="# Número" />
              <input type="text" name="colonia" value={datos.colonia} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="Colonia" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Código Postal</label>
              <input type="text" name="codigoPostal" value={datos.codigoPostal}
                onChange={(e) => setDatos({ ...datos, codigoPostal: e.target.value.replace(/\D/g, "") })}
                maxLength={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="44100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Población</label>
              <input type="text" name="poblacion" value={datos.poblacion} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="Guadalajara" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <input type="text" name="estado" value={datos.estado} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="Jalisco" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input type="tel" name="telefono" value={datos.telefono}
                onChange={(e) => setDatos({ ...datos, telefono: e.target.value.replace(/\D/g, "") })}
                maxLength={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="3312345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Celular</label>
              <input type="tel" name="celular" value={datos.celular}
                onChange={(e) => setDatos({ ...datos, celular: e.target.value.replace(/\D/g, "") })}
                maxLength={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="3398765432" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="button" onClick={() => setPaso(2)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Siguiente
          </button>
        </div>
      </div>

      {/* ════════════════════════════════
          PASO 2 — Datos de facturación
      ════════════════════════════════ */}
      <div className={paso === 2 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Datos de Facturación (SAT)</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RFC</label>
              <input type="text" name="rfc" value={datos.rfc}
                onChange={(e) => setDatos({ ...datos, rfc: e.target.value.toUpperCase() })}
                maxLength={13}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="XAXX010101000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Uso de CFDI</label>
              <input type="text" name="cfdi" value={datos.cfdi} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                placeholder="G03 - Gastos en general" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mail de Facturación</label>
            <input type="text" name="mailFacturacion" value={datos.mailFacturacion} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
              placeholder="facturacion@empresa.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
            <select name="moneda" value={datos.moneda} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
              <option value="">Seleccionar moneda...</option>
              {MONEDAS.map((m) => (
                <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Régimen Fiscal</label>
            <select name="regimen_fiscal_idregimen_fiscal" value={datos.regimen_fiscal_idregimen_fiscal} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
              <option value={0}>Seleccionar régimen fiscal...</option>
              {regimenesFiscales.map((r) => (
                <option key={r.idregimen_fiscal} value={r.idregimen_fiscal}>
                  ({r.codigo}) {r.tipo_regimen}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
            <select name="metodo_pago_idmetodo_pago" value={datos.metodo_pago_idmetodo_pago} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
              <option value={0}>Seleccionar método de pago...</option>
              {metodosPago.map((m) => (
                <option key={m.idmetodo_pago} value={m.idmetodo_pago}>
                  ({m.codigo}) {m.tipo_pago}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
            <select name="forma_pago_idforma_pago" value={datos.forma_pago_idforma_pago} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
              <option value={0}>Seleccionar forma de pago...</option>
              {formasPago.map((f) => (
                <option key={f.idforma_pago} value={f.idforma_pago}>
                  ({f.codigo}) {f.tipo_forma}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => setPaso(1)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Atrás
          </button>
          <button type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Guardar Cambios
          </button>
        </div>
      </div>
    </form>
  );
}