import { useState, useRef, useEffect } from "react";
import type {
  TipoProductoAdminItem,
  MaterialAdminItem,
  CalibreAdminItem,
} from "../../types/productos-plastico.types";

const inputCls =
  "w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none";

const triggerCls =
  "w-full px-4 py-2 text-left text-sm text-blue-600 font-medium hover:bg-blue-50 cursor-pointer border-t border-gray-100";

const avisoCls =
  "flex items-start gap-1.5 mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-2";

function BotonesGuardarCancelar({
  onGuardar,
  onCancelar,
  saving,
}: {
  onGuardar: () => void;
  onCancelar: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex gap-2 justify-end mt-2">
      <button
        type="button"
        onClick={onCancelar}
        className="px-3 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onGuardar}
        disabled={saving}
        className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400"
      >
        {saving ? "Guardando..." : "+ Agregar"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPO DE PRODUCTO
// ✅ Aviso si el nombre escrito es exactamente "Bolsa celofán": al registrarlo
// el selector lo va a emparejar automáticamente con material BOPP.
// ═══════════════════════════════════════════════════════════════════════════
export function AgregarTipoProductoInline({
  onAgregar,
}: {
  onAgregar: (nombre: string) => Promise<TipoProductoAdminItem>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) ref.current?.focus();
  }, [abierto]);

  const esCelofan = nombre.trim().toLowerCase() === "bolsa celofán" || nombre.trim().toLowerCase() === "bolsa celofan";

  const handleGuardar = async () => {
    const t = nombre.trim();
    if (!t) return;
    setSaving(true);
    try {
      await onAgregar(t);
      setNombre("");
      setAbierto(false);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar el tipo de producto");
    } finally {
      setSaving(false);
    }
  };

  if (!abierto) {
    return (
      <li onClick={() => setAbierto(true)} className={triggerCls}>
        + Agregar nuevo tipo de producto...
      </li>
    );
  }

  return (
    <li className="p-3 border-t border-gray-100 bg-blue-50/40" onClick={(e) => e.stopPropagation()}>
      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del tipo de producto</label>
      <input
        ref={ref}
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleGuardar()}
        placeholder="Ej. Bolsa camiseta"
        className={inputCls}
      />
      {esCelofan && (
        <div className={avisoCls}>
          <span>🔒</span>
          <span>Este tipo se emparejará automáticamente con material <strong>BOPP</strong> — no podrá usarse con ningún otro material.</span>
        </div>
      )}
      <BotonesGuardarCancelar
        onGuardar={handleGuardar}
        onCancelar={() => { setAbierto(false); setNombre(""); }}
        saving={saving}
      />
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL (requiere nombre + valor — factor usado en la fórmula de
// bolsas-por-kilo, así que es obligatorio)
// ✅ Aviso si el nombre es "BOPP": el selector lo va a limitar exclusivamente
// a "Bolsa celofán".
// ═══════════════════════════════════════════════════════════════════════════
export function AgregarMaterialInline({
  onAgregar,
}: {
  onAgregar: (nombre: string, valor: number) => Promise<MaterialAdminItem>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) ref.current?.focus();
  }, [abierto]);

  const esBopp = nombre.trim().toUpperCase() === "BOPP";

  const handleGuardar = async () => {
    const t = nombre.trim();
    const v = parseFloat(valor);
    if (!t) return;
    if (isNaN(v) || v <= 0) {
      alert("El valor (factor de cálculo) debe ser un número mayor a 0");
      return;
    }
    setSaving(true);
    try {
      await onAgregar(t, v);
      setNombre("");
      setValor("");
      setAbierto(false);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar el material");
    } finally {
      setSaving(false);
    }
  };

  if (!abierto) {
    return (
      <li onClick={() => setAbierto(true)} className={triggerCls}>
        + Agregar nuevo material...
      </li>
    );
  }

  return (
    <li className="p-3 border-t border-gray-100 bg-blue-50/40" onClick={(e) => e.stopPropagation()}>
      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del material</label>
      <input
        ref={ref}
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej. HDPE"
        className={inputCls}
      />
      {esBopp && (
        <div className={avisoCls}>
          <span>🔒</span>
          <span>Con nombre <strong>BOPP</strong>, este material quedará limitado exclusivamente a "Bolsa celofán".</span>
        </div>
      )}
      <label className="block text-xs font-medium text-gray-600 mb-1 mt-2">
        Valor (factor de cálculo) <span className="text-gray-400 font-normal">— usado en bolsas por kilo</span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={valor}
        onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setValor(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleGuardar()}
        placeholder="Ej. 0.92"
        className={inputCls}
      />
      <BotonesGuardarCancelar
        onGuardar={handleGuardar}
        onCancelar={() => { setAbierto(false); setNombre(""); setValor(""); }}
        saving={saving}
      />
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRE (numérico; opcionalmente calibre_bopp + gramos para BOPP)
// ✅ El PRIMER paso al abrir el formulario es elegir explícitamente el tipo
// de calibre ("Normal" o "Celofán + BOPP") con un selector tipo pestañas —
// ya no se infiere en silencio ni depende solo de un checkbox al final.
//
// esContextoBopp: si el dropdown se abrió estando en Celofán+BOPP, el
// selector queda bloqueado en "Celofán + BOPP" (ahí solo tiene sentido ese
// tipo, porque la lista visible ya está filtrada a calibres con gramaje).
// Fuera de ese contexto, el usuario elige libremente entre ambos.
// ═══════════════════════════════════════════════════════════════════════════
export function AgregarCalibreInline({
  esContextoBopp = false,
  onAgregar,
}: {
  esContextoBopp?: boolean;
  onAgregar: (
    calibre: number,
    calibre_bopp?: number | null,
    gramos?: number | null
  ) => Promise<CalibreAdminItem>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [tipoCalibre, setTipoCalibre] = useState<"normal" | "bopp">(esContextoBopp ? "bopp" : "normal");
  const [calibre, setCalibre] = useState("");
  const [calibreBopp, setCalibreBopp] = useState("");
  const [gramos, setGramos] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) ref.current?.focus();
  }, [abierto]);

  // Si se abre en contexto Celofán+BOPP, el tipo queda fijo en "bopp"
  useEffect(() => {
    if (esContextoBopp) setTipoCalibre("bopp");
  }, [esContextoBopp]);

  const esBopp = tipoCalibre === "bopp";

  const limpiar = () => {
    setCalibre(""); setCalibreBopp(""); setGramos("");
    setTipoCalibre(esContextoBopp ? "bopp" : "normal");
    setAbierto(false);
  };

  const handleGuardar = async () => {
    const c = parseInt(calibre, 10);
    if (isNaN(c) || c <= 0) {
      alert("El calibre debe ser un número entero mayor a 0");
      return;
    }

    if (esBopp) {
      const cb = parseInt(calibreBopp, 10);
      const g = parseFloat(gramos);
      if (isNaN(cb) || cb <= 0) {
        alert("El calibre BOPP es obligatorio para este tipo");
        return;
      }
      if (isNaN(g) || g <= 0) {
        alert("Los gramos son obligatorios para este tipo");
        return;
      }
      setSaving(true);
      try {
        await onAgregar(c, cb, g);
        limpiar();
      } catch (e: any) {
        alert(e.response?.data?.error ?? "Error al agregar el calibre");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      await onAgregar(c, null, null);
      limpiar();
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar el calibre");
    } finally {
      setSaving(false);
    }
  };

  if (!abierto) {
    return (
      <li onClick={() => setAbierto(true)} className={triggerCls}>
        + Agregar nuevo calibre...
      </li>
    );
  }

  return (
    <li className="p-3 border-t border-gray-100 bg-blue-50/40" onClick={(e) => e.stopPropagation()}>
      {esContextoBopp ? (
        // ── Contexto bloqueado: no tiene caso mostrar el selector de tipo,
        //    vamos directo a los campos de Celofán + BOPP ──────────────────
        <div className={avisoCls}>
          <span>🔒</span>
          <span>
            Este calibre es para <strong>Celofán + BOPP</strong>. El calibre BOPP y los gramos son
            obligatorios — solo los calibres con ambos datos aparecen para esta combinación.
          </span>
        </div>
      ) : (
        // ── Contexto libre: el usuario elige el tipo primero ────────────────
        <>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">¿Para qué es este calibre?</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setTipoCalibre("normal")}
              className={`py-2 px-3 rounded-md text-xs font-semibold border transition-colors ${
                tipoCalibre === "normal"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              Calibre normal
            </button>
            <button
              type="button"
              onClick={() => setTipoCalibre("bopp")}
              className={`py-2 px-3 rounded-md text-xs font-semibold border transition-colors ${
                tipoCalibre === "bopp"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              Celofán + BOPP
            </button>
          </div>
          {esBopp && (
            <div className={avisoCls}>
              <span>ℹ️</span>
              <span>Este calibre quedará disponible también para "Bolsa celofán" + material BOPP.</span>
            </div>
          )}
        </>
      )}

      {/* ── Campos: solo lo relevante al tipo elegido/forzado ── */}
      <label className="block text-xs font-medium text-gray-600 mb-1 mt-3">
        {esBopp ? "Calibre (normal, de referencia)" : "Calibre"}
      </label>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={calibre}
        onChange={(e) => /^\d*$/.test(e.target.value) && setCalibre(e.target.value)}
        placeholder="Ej. 200"
        className={inputCls}
      />

      {esBopp && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Calibre BOPP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={calibreBopp}
              onChange={(e) => /^\d*$/.test(e.target.value) && setCalibreBopp(e.target.value)}
              placeholder="Ej. 30"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Gramos <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={gramos}
              onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setGramos(e.target.value)}
              placeholder="Ej. 28"
              className={inputCls}
            />
          </div>
        </div>
      )}

      <BotonesGuardarCancelar
        onGuardar={handleGuardar}
        onCancelar={limpiar}
        saving={saving}
      />
    </li>
  );
}