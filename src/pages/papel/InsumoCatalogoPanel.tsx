import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTiposInsumo,
  getProveedores,
  buscarInsumos,
  registrarInsumoRapido,
  crearProductoProveedor,
  eliminarProductoProveedor,
  desactivarInsumo,
  reactivarInsumo,
  type TipoInsumo,
  type Insumo,
  type Proveedor,
} from "../../services/proveedoresService";
import ModalRegistrarInsumo from "../../components/ModalRegistrarInsumo";
import FormularioProveedor from "../../components/FormularioProveedor";
import { showAlert } from "../../components/CustomAlert";

// ── Primitivos (mismo estilo visual que FoilPanel) ─────────────────────────
function Btn({ children, onClick, variant = "primary", small, disabled }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  small?: boolean; disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "#1D4ED8", color: "#fff",    border: "none" },
    secondary: { background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" },
    danger:    { background: "#FEE2E2", color: "#DC2626", border: "none" },
    ghost:     { background: "none",   color: "#6B7280",  border: "1px solid #E5E7EB" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: small ? 30 : 36, padding: small ? "0 12px" : "0 16px",
      borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
      fontSize: small ? 12 : 13, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 5,
      opacity: disabled ? 0.6 : 1, ...styles[variant],
    }}>
      {children}
    </button>
  );
}

function Inp({ value, onChange, placeholder, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", height: 34, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box", ...style }} />
  );
}

// ── Alta especializada para Sacabocados / Perforado (nombre base + medida) ──
function FormularioAltaConMedida({
  prefijoNombre,
  placeholderMedida,
  tipoInsumoId,
  proveedores,
  onCreado,
  onCancelar,
}: {
  prefijoNombre: string;
  placeholderMedida: string;
  tipoInsumoId: number;
  proveedores: Proveedor[];
  onCreado: () => void;
  onCancelar: () => void;
}) {
  const [medida, setMedida] = useState("");
  const [codigo, setCodigo] = useState("");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleProveedor = (id: number) =>
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleGuardar = async () => {
    if (!medida.trim()) { showAlert("Indica la medida", "warning"); return; }
    setSaving(true);
    try {
      await registrarInsumoRapido({
        tipo_insumo_id: tipoInsumoId,
        nombre: `${prefijoNombre} ${medida.trim()}`,
        codigo: codigo.trim() || null,
        proveedores_ids: seleccionados,
      });
      showAlert(`"${prefijoNombre} ${medida.trim()}" registrado`, "success");
      onCreado();
    } catch (error: any) {
      showAlert(error?.response?.data?.error || "Error al registrar", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 14px" }}>
        Agregar {prefijoNombre.toLowerCase()}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase" }}>Medida</label>
          <Inp value={medida} onChange={setMedida} placeholder={placeholderMedida} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase" }}>Código (opcional)</label>
          <Inp value={codigo} onChange={setCodigo} placeholder="Ej. SB-003" />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6, textTransform: "uppercase" }}>
          Proveedores <span style={{ fontWeight: 400, textTransform: "none", color: "#9CA3AF" }}>(opcional, puedes marcar varios)</span>
        </label>
        <div style={{ border: "1px solid #D1D5DB", borderRadius: 6, maxHeight: 140, overflowY: "auto", background: "#fff" }}>
          {proveedores.length === 0 ? (
            <p style={{ fontSize: 12, color: "#9CA3AF", padding: "10px 12px", margin: 0 }}>No hay proveedores registrados.</p>
          ) : proveedores.map((p) => (
            <label key={p.idproveedor} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={seleccionados.includes(p.idproveedor)} onChange={() => toggleProveedor(p.idproveedor)} style={{ width: 14, height: 14 }} />
              {p.nombre}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onCancelar}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleGuardar} disabled={saving}>{saving ? "Guardando..." : "+ Agregar"}</Btn>
      </div>
    </div>
  );
}

// ── Fila: chips de proveedor con código, cada uno removible ─────────────────
function ChipProveedor({ nombre, codigo, onQuitar }: { nombre: string; codigo: string | null; onQuitar: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "3px 8px 3px 10px", fontSize: 11, color: "#1D4ED8", fontWeight: 500 }}>
      {nombre}{codigo ? ` · ${codigo}` : ""}
      <button onClick={onQuitar} title="Quitar proveedor"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", fontSize: 13, lineHeight: 1, padding: 0, display: "flex" }}>×</button>
    </span>
  );
}

// ── Selector rápido para agregar UN proveedor a un insumo ya existente ──────
function AgregarProveedorInline({
  proveedoresDisponibles,
  onAgregar,
  onCerrar,
  onNuevoProveedor,
  preseleccionarProveedorId,
}: {
  proveedoresDisponibles: Proveedor[];
  onAgregar: (idproveedor: number, codigo: string, precio: string) => Promise<void>;
  onCerrar: () => void;
  onNuevoProveedor: () => void;
  preseleccionarProveedorId?: number | null;
}) {
  const [idproveedor, setIdproveedor] = useState<number | "">("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState("");
  const [saving, setSaving] = useState(false);

  // Cuando se registra un proveedor nuevo desde este mismo renglón, se
  // preselecciona automáticamente para no obligar al usuario a buscarlo de nuevo.
  useEffect(() => {
    if (preseleccionarProveedorId) setIdproveedor(preseleccionarProveedorId);
  }, [preseleccionarProveedorId]);

  const handleGuardar = async () => {
    if (!idproveedor) { showAlert("Selecciona un proveedor", "warning"); return; }
    setSaving(true);
    try {
      await onAgregar(Number(idproveedor), codigo.trim(), precio.trim());
      onCerrar();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
      <select value={idproveedor} onChange={(e) => setIdproveedor(e.target.value ? Number(e.target.value) : "")}
        style={{ height: 30, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 12, color: "#111827" }}>
        <option value="">Proveedor...</option>
        {proveedoresDisponibles.map((p) => <option key={p.idproveedor} value={p.idproveedor}>{p.nombre}</option>)}
      </select>
      <button type="button" onClick={onNuevoProveedor} title="Registrar un proveedor nuevo"
        style={{ height: 30, padding: "0 8px", border: "1px dashed #1D4ED8", borderRadius: 5, fontSize: 11, color: "#1D4ED8", background: "#EFF6FF", cursor: "pointer", fontWeight: 600 }}>
        + Nuevo
      </button>
      <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código"
        style={{ width: 90, height: 30, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 12 }} />
      <input value={precio} onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setPrecio(e.target.value)} placeholder="Precio"
        style={{ width: 80, height: 30, padding: "0 8px", border: "1px solid #D1D5DB", borderRadius: 5, fontSize: 12 }} />
      <Btn variant="primary" small onClick={handleGuardar} disabled={saving}>{saving ? "..." : "OK"}</Btn>
      <Btn variant="ghost" small onClick={onCerrar}>×</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
interface Props {
  /** Nombre exacto del tipo_insumo (ej. "Pegamento", "Sacabocados") */
  tipoInsumoNombre: string;
  /** Para Sacabocados/Perforado: activa el formulario de alta con medida separada */
  conMedida?: boolean;
  prefijoNombre?: string;       // ej. "Sacabocado"
  placeholderMedida?: string;   // ej. "3 mm"
  /** ✅ NUEVO — se llama tras crear/desactivar/reactivar un registro, para que
   *  el padre (Catalogos.tsx) pueda refrescar el contador del sidebar. */
  onCambio?: () => void;
}

export default function InsumoCatalogoPanel({
  tipoInsumoNombre,
  conMedida = false,
  prefijoNombre = "",
  placeholderMedida = "",
  onCambio,
}: Props) {
  const [tipoInsumoId, setTipoInsumoId] = useState<number | null>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [agregandoProveedorA, setAgregandoProveedorA] = useState<number | null>(null);
  const [procesando, setProcesando] = useState<number | null>(null);
  // ✅ NUEVO — modal de registro de proveedor, llamable desde cualquier parte
  // de esta pantalla (botón general o el "+ Nuevo" de cada renglón).
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const [ultimoProveedorCreado, setUltimoProveedorCreado] = useState<number | null>(null);

  const cargarTipoId = useCallback(async () => {
    const tipos = await getTiposInsumo();
    const encontrado = tipos.find((t) => t.nombre.toLowerCase() === tipoInsumoNombre.toLowerCase());
    setTipoInsumoId(encontrado?.idtipo_insumo ?? null);
    return encontrado?.idtipo_insumo ?? null;
  }, [tipoInsumoNombre]);

  const cargarInsumos = useCallback(async (idTipo: number, q: string, inactivos: boolean) => {
    setLoading(true);
    try {
      const data = await buscarInsumos(idTipo, q || undefined, !inactivos);
      setInsumos(data);
    } catch {
      showAlert("Error al cargar el catálogo", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [idTipo] = await Promise.all([cargarTipoId(), getProveedores().then(setProveedores)]);
      if (idTipo) await cargarInsumos(idTipo, "", false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoInsumoNombre]);

  useEffect(() => {
    if (!tipoInsumoId) return;
    const t = setTimeout(() => cargarInsumos(tipoInsumoId, search, verInactivos), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, verInactivos, tipoInsumoId]);

  const recargar = () => {
    if (tipoInsumoId) cargarInsumos(tipoInsumoId, search, verInactivos);
    onCambio?.();
  };

  const handleDesactivar = async (idinsumo: number, nombre: string) => {
    if (!confirm(`¿Desactivar "${nombre}"? No se elimina, solo deja de aparecer para uso nuevo.`)) return;
    setProcesando(idinsumo);
    try {
      await desactivarInsumo(idinsumo);
      recargar();
    } catch {
      showAlert("Error al desactivar", "error");
    } finally {
      setProcesando(null);
    }
  };

  const handleReactivar = async (idinsumo: number) => {
    setProcesando(idinsumo);
    try {
      await reactivarInsumo(idinsumo);
      recargar();
    } catch {
      showAlert("Error al reactivar", "error");
    } finally {
      setProcesando(null);
    }
  };

  const handleQuitarProveedor = async (idproveedor: number, idinsumo_proveedor: number, nombreInsumo: string) => {
    if (!confirm(`¿Quitar este proveedor de "${nombreInsumo}"?`)) return;
    try {
      await eliminarProductoProveedor(idproveedor, idinsumo_proveedor);
      recargar();
    } catch {
      showAlert("Error al quitar proveedor", "error");
    }
  };

  const handleAgregarProveedor = async (idinsumo: number, nombreInsumo: string, idproveedor: number, codigo: string, precio: string) => {
    try {
      await crearProductoProveedor(idproveedor, {
        tipo_insumo_id: tipoInsumoId!,
        nombre: nombreInsumo,
        codigo: codigo || null,
        precio: precio ? parseFloat(precio) : null,
      });
      recargar();
    } catch (error: any) {
      showAlert(error?.response?.data?.error || "Error al agregar proveedor", "error");
    }
  };

  // ✅ NUEVO — al terminar de registrar el proveedor en FormularioProveedor,
  // se agrega a la lista local (para que aparezca ya en los selects) y se
  // marca como "recién creado" para que el renglón que lo pidió lo preseleccione.
  const handleProveedorCreado = (nuevo: Proveedor) => {
    setProveedores((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setUltimoProveedorCreado(nuevo.idproveedor);
    setMostrarNuevoProveedor(false);
    showAlert(`Proveedor "${nuevo.nombre}" registrado`, "success");
  };

  if (!tipoInsumoId && !loading) {
    return (
      <div style={{ padding: "24px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>
        No se encontró el tipo de insumo "{tipoInsumoNombre}". Corre la migración de catálogos unificados.
      </div>
    );
  }

  return (
    <div>
      {/* ✅ FormularioProveedor ya trae su propio card blanco/bordes — el
          overlay solo centra, sin envolverlo en otro contenedor con fondo. */}
      {mostrarNuevoProveedor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" }}>
          <FormularioProveedor
            proveedor={null}
            onGuardado={handleProveedorCreado}
            onCancel={() => setMostrarNuevoProveedor(false)}
          />
        </div>
      )}

      {mostrarAlta && tipoInsumoId && (
        conMedida ? (
          <FormularioAltaConMedida
            prefijoNombre={prefijoNombre}
            placeholderMedida={placeholderMedida}
            tipoInsumoId={tipoInsumoId}
            proveedores={proveedores}
            onCreado={() => { setMostrarAlta(false); recargar(); }}
            onCancelar={() => setMostrarAlta(false)}
          />
        ) : (
          <ModalRegistrarInsumo
            tipoInsumoInicial={tipoInsumoId}
            nombreInicial=""
            onRegistrado={() => { setMostrarAlta(false); recargar(); }}
            onCancelar={() => setMostrarAlta(false)}
          />
        )
      )}

      {/* ── Fila 1: botones de acción, igual que "+ Agregar foil" en Foil ── */}
      {!verInactivos && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
          <Btn variant="secondary" onClick={() => setMostrarNuevoProveedor(true)}>+ Nuevo proveedor</Btn>
          <Btn variant="primary" onClick={() => setMostrarAlta(true)}>+ Agregar nuevo</Btn>
        </div>
      )}

      {/* ── Fila 2: buscador a todo el ancho + toggle de inactivos, igual que Foil ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}>🔍</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            style={{ width: "100%", height: 36, paddingLeft: 32, paddingRight: 12, border: "1px solid #D1D5DB", borderRadius: 7, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{verInactivos ? "Mostrando inactivos" : "Mostrar inactivos"}</span>
          <button type="button" onClick={() => setVerInactivos((v) => !v)}
            style={{ width: 40, height: 22, borderRadius: 12, border: "none", cursor: "pointer", background: verInactivos ? "#DC2626" : "#D1D5DB", position: "relative" }}>
            <span style={{ position: "absolute", top: 2, left: verInactivos ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 2fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["Nombre", "Proveedores", ""].map((h) => (
            <div key={h} style={{ padding: "10px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Cargando...</div>
        ) : insumos.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            {search ? "Sin resultados." : verInactivos ? "No hay registros inactivos." : "No hay registros aún."}
          </div>
        ) : insumos.map((item, idx) => (
          <div key={item.idinsumo} style={{ display: "grid", gridTemplateColumns: "1.4fr 2fr auto", padding: "10px 16px", borderBottom: idx < insumos.length - 1 ? "1px solid #F3F4F6" : "none", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
            <div style={{ fontSize: 13, color: "#111827", fontWeight: 500, alignSelf: "center" }}>{item.nombre}</div>

            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {item.proveedores.length === 0 ? (
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>Sin proveedor</span>
                ) : item.proveedores.map((p) => (
                  <ChipProveedor key={p.idinsumo_proveedor} nombre={p.proveedor_nombre} codigo={p.codigo}
                    onQuitar={() => handleQuitarProveedor(p.idproveedor, p.idinsumo_proveedor, item.nombre)} />
                ))}
                {!verInactivos && (
                  <button onClick={() => setAgregandoProveedorA(agregandoProveedorA === item.idinsumo ? null : item.idinsumo)}
                    style={{ fontSize: 11, color: "#1D4ED8", background: "none", border: "1px dashed #BFDBFE", borderRadius: 20, padding: "3px 10px", cursor: "pointer" }}>
                    + Proveedor
                  </button>
                )}
              </div>
              {agregandoProveedorA === item.idinsumo && (
                <AgregarProveedorInline
                  proveedoresDisponibles={proveedores.filter((p) => !item.proveedores.some((ip) => ip.idproveedor === p.idproveedor))}
                  onAgregar={(idp, cod, pre) => handleAgregarProveedor(item.idinsumo, item.nombre, idp, cod, pre)}
                  onCerrar={() => setAgregandoProveedorA(null)}
                  onNuevoProveedor={() => setMostrarNuevoProveedor(true)}
                  preseleccionarProveedorId={ultimoProveedorCreado}
                />
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              {verInactivos ? (
                <Btn variant="primary" small onClick={() => handleReactivar(item.idinsumo)} disabled={procesando === item.idinsumo}>
                  {procesando === item.idinsumo ? "..." : "↩ Reactivar"}
                </Btn>
              ) : (
                <Btn variant="danger" small onClick={() => handleDesactivar(item.idinsumo, item.nombre)} disabled={procesando === item.idinsumo}>
                  {procesando === item.idinsumo ? "..." : "Desactivar"}
                </Btn>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, textAlign: "right", fontSize: 12, color: "#9CA3AF" }}>
        {insumos.length} registro{insumos.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}