import { useState, useEffect } from "react";
import type {
  Proveedor,
  CreateProveedorDto,
  DomicilioProveedor,
  FacturacionProveedor,
  RegimenFiscal,
} from "../services/proveedoresService";
import {
  crearProveedor,
  actualizarProveedor,
  getDomicilioProveedor,
  getFacturacionProveedor,
  getRegimenesFiscales,
  guardarProveedorCompleto,
} from "../services/proveedoresService";
import { useCodigoPostal } from "../hooks/useCodigoPostal";
import type { OpcionCP } from "../types/formulario-solicitud.types";
import { showAlert } from "./CustomAlert";
import { showConfirm } from "./CustomConfirm";

interface Props {
  proveedor?: Proveedor | null;
  onGuardado: (p: Proveedor) => void;
  onCancel: () => void;
}

type Pestaña = "general" | "domicilio" | "facturacion";

const VACIO_PROVEEDOR: CreateProveedorDto = {
  nombre: "", contacto: "", telefono: "", correo: "",
  notas: "", rfc_proveedor: "",
  regimen_fiscal_idregimen_fiscal: null,
};

const VACIO_DOMICILIO: DomicilioProveedor = {
  codigo_postal: "", colonia: "", domicilio: "", municipio: "", estado: "",
};

const VACIO_FACT: FacturacionProveedor = {
  banco: "", cuenta: "", clabe: "", convenio: "", nombre_cuenta: "", condicion_compra: "",
};

const PESTAÑAS: { key: Pestaña; label: string }[] = [
  { key: "general",     label: "General" },
  { key: "domicilio",   label: "Domicilio" },
  { key: "facturacion", label: "Facturación" },
];

export default function FormularioProveedor({ proveedor, onGuardado, onCancel }: Props) {
  const [pestaña, setPestaña] = useState<Pestaña>("general");
  const [proveedorLocal, setProveedorLocal] = useState<Proveedor | null>(proveedor ?? null);

  // ── Estado acumulado ──────────────────────────────────────────────────────
  const [form, setForm] = useState<CreateProveedorDto>(VACIO_PROVEEDOR);
  const [domicilio, setDomicilio] = useState<DomicilioProveedor>(VACIO_DOMICILIO);
  const [facturaciones, setFacturaciones] = useState<FacturacionProveedor[]>([]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [regimenes, setRegimenes] = useState<RegimenFiscal[]>([]);
  const [opcionesCP, setOpcionesCP] = useState<OpcionCP[]>([]);
  const [formFact, setFormFact] = useState<FacturacionProveedor>(VACIO_FACT);
  const [editandoFactIdx, setEditandoFactIdx] = useState<number | null>(null);
  const [mostrarFormFact, setMostrarFormFact] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [pasosVisitados, setPasosVisitados] = useState<Set<Pestaña>>(new Set(["general"]));

  const esEdicion = !!proveedor;
  const { buscarCP, cargandoCP, errorCP, setErrorCP } = useCodigoPostal();
  const pasoNumero: Record<Pestaña, number> = { general: 1, domicilio: 2, facturacion: 3 };

  // ── Cargar catálogos ──────────────────────────────────────────────────────
  useEffect(() => {
    getRegimenesFiscales().then(setRegimenes).catch(() => {});
  }, []);

  useEffect(() => {
    setProveedorLocal(proveedor ?? null);
  }, [proveedor]);

  // ── Cargar datos del proveedor en edición ─────────────────────────────────
  useEffect(() => {
    if (proveedorLocal) {
      setForm({
        nombre:                          proveedorLocal.nombre             ?? "",
        contacto:                        proveedorLocal.contacto           ?? "",
        telefono:                        proveedorLocal.telefono           ?? "",
        correo:                          proveedorLocal.correo             ?? "",
        notas:                           proveedorLocal.notas              ?? "",
        rfc_proveedor:                   proveedorLocal.rfc_proveedor      ?? "",
        regimen_fiscal_idregimen_fiscal: proveedorLocal.regimen_fiscal_idregimen_fiscal ?? null,
      });
      setPasosVisitados(new Set(["general", "domicilio", "facturacion"]));
      // Cargar domicilio y facturación existentes
      cargarDatosEdicion();
    } else {
      setForm(VACIO_PROVEEDOR);
      setDomicilio(VACIO_DOMICILIO);
      setFacturaciones([]);
      setPasosVisitados(new Set(["general"]));
    }
  }, [proveedorLocal]);

  const cargarDatosEdicion = async () => {
    if (!proveedorLocal) return;
    setLoadingExtra(true);
    try {
      const [dom, facts] = await Promise.all([
        getDomicilioProveedor(proveedorLocal.idproveedor),
        getFacturacionProveedor(proveedorLocal.idproveedor),
      ]);
      setDomicilio(dom ?? VACIO_DOMICILIO);
      setFacturaciones(facts);
      if (dom?.codigo_postal && dom.codigo_postal.length === 5) {
        const opciones = await buscarCP(dom.codigo_postal);
        setOpcionesCP(opciones);
      }
    } catch { /* silencioso */ }
    finally { setLoadingExtra(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setF = (field: keyof CreateProveedorDto, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const setD = (field: keyof DomicilioProveedor, value: string) =>
    setDomicilio(prev => ({ ...prev, [field]: value }));

  const handleCPChange = async (valor: string) => {
    const cp = valor.replace(/\D/g, "");
    setDomicilio(prev => ({ ...prev, codigo_postal: cp, colonia: "", municipio: "", estado: "" }));
    setOpcionesCP([]);
    setErrorCP(null);
    if (cp.length === 5) {
      const opciones = await buscarCP(cp);
      setOpcionesCP(opciones);
    }
  };

  const handleSeleccionCP = (colonia: string) => {
    const opcion = opcionesCP.find(o => o.colonia === colonia);
    if (!opcion) return;
    setDomicilio(prev => ({ ...prev, colonia: opcion.colonia, municipio: opcion.poblacion, estado: opcion.estado }));
  };

  const irA = (p: Pestaña) => {
    setPasosVisitados(prev => new Set([...prev, p]));
    setPestaña(p);
  };

  // ── Facturación local (sin guardar aún) ───────────────────────────────────
  const handleGuardarFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (editandoFactIdx !== null) {
      setFacturaciones(prev => prev.map((f, i) => i === editandoFactIdx ? { ...formFact } : f));
    } else {
      setFacturaciones(prev => [...prev, { ...formFact }]);
    }
    cerrarFormFact();
  };

  const handleEliminarFact = async (idx: number) => {
    const f = facturaciones[idx];
    const ok = await showConfirm(`¿Eliminar el registro "${f.banco ?? f.nombre_cuenta ?? "sin nombre"}"?`);
    if (!ok) return;
    setFacturaciones(prev => prev.filter((_, i) => i !== idx));
  };

  const abrirEditarFact = (idx: number) => {
    setFormFact({ ...facturaciones[idx] });
    setEditandoFactIdx(idx);
    setMostrarFormFact(true);
  };

  const cerrarFormFact = () => {
    setMostrarFormFact(false);
    setEditandoFactIdx(null);
    setFormFact(VACIO_FACT);
  };

  // ── Guardar todo al finalizar ─────────────────────────────────────────────
  const handleFinalizar = async () => {
    if (!form.nombre.trim()) {
      showAlert("El nombre del proveedor es requerido", "warning");
      setPestaña("general");
      return;
    }
    setGuardando(true);
    try {
      let resultado: Proveedor;

      if (esEdicion && proveedorLocal) {
        // Edición: usar endpoint completo
        resultado = await guardarProveedorCompleto(
          proveedorLocal.idproveedor, form, domicilio, facturaciones
        );
      } else {
        // Alta nueva: primero crear, luego guardar completo
        resultado = await crearProveedor(form);
        resultado = await guardarProveedorCompleto(
          resultado.idproveedor, form, domicilio, facturaciones
        );
      }

      showAlert("Proveedor guardado correctamente", "success");
      onGuardado(resultado);
    } catch (error: any) {
      showAlert(error?.response?.data?.error || "Error al guardar proveedor", "error");
    } finally {
      setGuardando(false);
    }
  };

  // ── Estilos ───────────────────────────────────────────────────────────────
  const inputClass = "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 text-sm transition-colors";
  const inputClassError = "w-full px-3.5 py-2.5 border border-orange-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder-gray-400 text-sm transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const pasoActual = pasoNumero[pestaña];

  const PlaceholderGuardarPrimero = () => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <p className="text-sm font-medium text-gray-500">Completa primero los datos generales</p>
      <button type="button" onClick={() => setPestaña("general")}
        className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
        Ir a General →
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {esEdicion ? "Editar proveedor" : "Nuevo proveedor"}
          </h3>
          <p className="text-xs text-gray-500">
            {proveedorLocal ? proveedorLocal.nombre : "Completa los datos y guarda al finalizar"}
          </p>
        </div>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center justify-center mb-2">
        <div className="flex items-center gap-0">
          {PESTAÑAS.map((p, idx) => {
            const num = idx + 1;
            const visitado = pasosVisitados.has(p.key);
            const activo = pestaña === p.key;
            return (
              <div key={p.key} className="flex items-center">
                <button type="button"
                  onClick={() => visitado && setPestaña(p.key)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-colors
                    ${activo ? "bg-blue-600 text-white" :
                      visitado ? "bg-green-100 text-green-700 border-2 border-green-500 cursor-pointer" :
                      "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                  {num}
                </button>
                {idx < PESTAÑAS.length - 1 && (
                  <div className={`w-20 h-1 ${visitado && !activo ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center gap-16 mb-5 text-xs text-gray-500">
        {PESTAÑAS.map(p => (
          <span key={p.key} className={pestaña === p.key ? "text-blue-600 font-semibold" : ""}>{p.label}</span>
        ))}
      </div>

      {/* Pestañas visuales */}
      <div className="flex gap-1.5 mb-5 p-1 bg-gray-100 rounded-xl">
        {PESTAÑAS.map((p, idx) => (
          <button key={p.key} type="button"
            onClick={() => pasosVisitados.has(p.key) && setPestaña(p.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex-1 justify-center
              ${pestaña === p.key ? "bg-blue-600 text-white shadow-sm" :
                pasosVisitados.has(p.key) ? "text-gray-600 hover:bg-gray-200 cursor-pointer" :
                "text-gray-400 cursor-not-allowed"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ══════════════ GENERAL ══════════════ */}
      {pestaña === "general" && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
            <input type="text" value={form.nombre} onChange={e => setF("nombre", e.target.value)}
              placeholder="Ej: Tintas del Norte S.A. de C.V."
              className={inputClass} maxLength={150} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>RFC</label>
              <input type="text" value={form.rfc_proveedor ?? ""}
                onChange={e => setF("rfc_proveedor", e.target.value.toUpperCase())}
                placeholder="XAXX010101000" className={inputClass} maxLength={13} />
            </div>
            <div>
              <label className={labelClass}>Régimen fiscal</label>
              <select value={form.regimen_fiscal_idregimen_fiscal ?? ""}
                onChange={e => setF("regimen_fiscal_idregimen_fiscal", e.target.value ? Number(e.target.value) : null)}
                className={inputClass}>
                <option value="">Sin especificar</option>
                {regimenes.map(r => (
                  <option key={r.idregimen_fiscal} value={r.idregimen_fiscal}>
                    ({r.codigo}) {r.tipo_regimen}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contacto</label>
              <input type="text" value={form.contacto ?? ""}
                onChange={e => setF("contacto", e.target.value)}
                placeholder="Nombre de la persona" className={inputClass} maxLength={100} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input type="text" value={form.telefono ?? ""}
                onChange={e => setF("telefono", e.target.value)}
                placeholder="33 1234 5678" className={inputClass} maxLength={30} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input type="email" value={form.correo ?? ""}
              onChange={e => setF("correo", e.target.value)}
              placeholder="contacto@proveedor.com" className={inputClass} maxLength={100} />
          </div>

          <div>
            <label className={labelClass}>Notas <span className="text-xs text-gray-400 font-normal">(opcional)</span></label>
            <textarea value={form.notas ?? ""} onChange={e => setF("notas", e.target.value)}
              rows={3} placeholder="Condiciones de pago, tiempo de entrega..."
              className={`${inputClass} resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Cancelar
            </button>
            <button type="button" onClick={() => {
              if (!form.nombre.trim()) { showAlert("El nombre es requerido", "warning"); return; }
              irA("domicilio");
            }} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ DOMICILIO ══════════════ */}
      {pestaña === "domicilio" && (
        <div>
          {loadingExtra ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Código postal
                    {cargandoCP && <span className="ml-2 text-xs text-blue-500 animate-pulse">Buscando...</span>}
                  </label>
                  <div className="relative">
                    <input type="text" value={domicilio.codigo_postal ?? ""}
                      onChange={e => handleCPChange(e.target.value)}
                      placeholder="44100"
                      className={errorCP ? inputClassError : inputClass} maxLength={5} />
                    {cargandoCP && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errorCP && (
                    <p className="mt-1 text-xs text-orange-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errorCP}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Colonia</label>
                  {opcionesCP.length > 0 ? (
                    <select value={domicilio.colonia ?? ""}
                      onChange={e => handleSeleccionCP(e.target.value)} className={inputClass}>
                      <option value="">Selecciona colonia...</option>
                      {opcionesCP.map((o, i) => (
                        <option key={`${o.colonia}-${i}`} value={o.colonia}>{o.colonia}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={domicilio.colonia ?? ""}
                      onChange={e => setD("colonia", e.target.value)}
                      placeholder="Centro" className={inputClass} maxLength={150} />
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Calle y número</label>
                <input type="text" value={domicilio.domicilio ?? ""}
                  onChange={e => setD("domicilio", e.target.value)}
                  placeholder="Av. Juárez 123" className={inputClass} maxLength={255} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Municipio</label>
                  <input type="text" value={domicilio.municipio ?? ""}
                    onChange={e => setD("municipio", e.target.value)}
                    placeholder="Guadalajara" className={inputClass} maxLength={100} />
                </div>
                <div>
                  <label className={labelClass}>Estado</label>
                  <input type="text" value={domicilio.estado ?? ""}
                    onChange={e => setD("estado", e.target.value)}
                    placeholder="Jalisco" className={inputClass} maxLength={100} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPestaña("general")}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Atrás
                </button>
                <button type="button" onClick={() => irA("facturacion")}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ FACTURACIÓN ══════════════ */}
      {pestaña === "facturacion" && (
        <div className="space-y-4">
          {facturaciones.length > 0 && (
            <div className="space-y-3">
              {facturaciones.map((f, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        {f.banco ?? "—"}{f.nombre_cuenta ? ` — ${f.nombre_cuenta}` : ""}
                      </p>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                        {f.cuenta   && <span>Cuenta: <span className="font-mono text-gray-700">{f.cuenta}</span></span>}
                        {f.clabe    && <span>CLABE: <span className="font-mono text-gray-700">{f.clabe}</span></span>}
                        {f.convenio && <span>Convenio: <span className="text-gray-700">{f.convenio}</span></span>}
                        {f.condicion_compra && (
                          <span className="col-span-2">Condición: <span className="text-gray-700">{f.condicion_compra}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button type="button" onClick={() => abrirEditarFact(idx)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => handleEliminarFact(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {facturaciones.length === 0 && !mostrarFormFact && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-sm font-medium">Sin registros de facturación</p>
              <p className="text-xs text-gray-400 mt-1">Opcional — puedes finalizar sin agregar</p>
            </div>
          )}

          {!mostrarFormFact && (
            <button type="button"
              onClick={() => { setMostrarFormFact(true); setEditandoFactIdx(null); setFormFact(VACIO_FACT); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar cuenta bancaria / condición
            </button>
          )}

          {mostrarFormFact && (
            <form onSubmit={handleGuardarFact}
              className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-blue-900">
                  {editandoFactIdx !== null ? "Editando registro" : "Nuevo registro"}
                </h4>
                <button type="button" onClick={cerrarFormFact} className="text-blue-400 hover:text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Banco</label>
                  <input type="text" value={formFact.banco ?? ""}
                    onChange={e => setFormFact(p => ({ ...p, banco: e.target.value }))}
                    placeholder="BBVA, Santander..." className={inputClass} maxLength={100} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de la cuenta</label>
                  <input type="text" value={formFact.nombre_cuenta ?? ""}
                    onChange={e => setFormFact(p => ({ ...p, nombre_cuenta: e.target.value }))}
                    placeholder="Razón social o titular" className={inputClass} maxLength={150} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Número de cuenta</label>
                  <input type="text" value={formFact.cuenta ?? ""}
                    onChange={e => setFormFact(p => ({ ...p, cuenta: e.target.value }))}
                    placeholder="0123456789"
                    className={`${inputClass} font-mono`} maxLength={50} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CLABE interbancaria</label>
                  <input type="text" value={formFact.clabe ?? ""}
                    onChange={e => setFormFact(p => ({ ...p, clabe: e.target.value }))}
                    placeholder="18 dígitos"
                    className={`${inputClass} font-mono`} maxLength={18} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Convenio <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input type="text" value={formFact.convenio ?? ""}
                  onChange={e => setFormFact(p => ({ ...p, convenio: e.target.value }))}
                  placeholder="Número de convenio CIE" className={inputClass} maxLength={50} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Condición de pago <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input type="text" value={formFact.condicion_compra ?? ""}
                  onChange={e => setFormFact(p => ({ ...p, condicion_compra: e.target.value }))}
                  placeholder="Ej: Crédito 30 días, Contado..."
                  className={inputClass} maxLength={255} />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={cerrarFormFact}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                  {editandoFactIdx !== null ? "Guardar cambios" : "Agregar"}
                </button>
              </div>
            </form>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPestaña("domicilio")}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Atrás
            </button>
            <button type="button" onClick={handleFinalizar} disabled={guardando}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold disabled:bg-green-400 transition-colors">
              {guardando
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                : "Finalizar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}