import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Dashboard from "../layouts/Sidebar";

// ── Types ──────────────────────────────────────────────────────────────────
interface CatItem {
  id: number;
  nombre: string;
  medida?: string;
}

type CatKey =
  | "tipoProducto"
  | "tipoPapel"
  | "tipoPegado"
  | "pegamento"
  | "tipoAsa"
  | "refuerzo"
  | "base"
  | "empaque";

interface Catalogs {
  tipoProducto: CatItem[];
  tipoPapel: CatItem[];
  tipoPegado: CatItem[];
  pegamento: CatItem[];
  tipoAsa: CatItem[];
  refuerzo: CatItem[];
  base: CatItem[];
  empaque: CatItem[];
}

// ── Datos iniciales ────────────────────────────────────────────────────────
const seed = (names: string[]): CatItem[] =>
  names.map((nombre, i) => ({ id: i + 1, nombre }));

const seedMedida = (items: [string, string][]): CatItem[] =>
  items.map(([nombre, medida], i) => ({ id: i + 1, nombre, medida }));

const initialData: Catalogs = {
  tipoProducto: seed([
    "Etiquetas", "Bolsas", "Cajas", "Sobres",
    "Carpetas", "Folders", "Formas continuas", "Papelería",
  ]),
  tipoPapel: seed([
    "Multicapa", "Bond", "Couché", "Kraft", "Cartulina",
    "Duplex", "Triplex", "Opalina", "Periódico", "Manila",
  ]),
  tipoPegado: seed([
    "Fuelle", "Esquina", "Armado automático", "Lineal",
    "Fondo automático", "4 Esquinas", "6 Esquinas", "Manual", "Empalmadora",
  ]),
  pegamento: seed([
    "Blanco 393", "Blanco 263", "Blanco 200",
    "Hot Melt", "Cinta doble cara", "Dextrina", "PVA",
  ]),
  tipoAsa: seed([
    "Cordel", "Listón satinado", "Listón popotillo",
    "Entorchado", "Cordel armado automático", "Especial",
  ]),
  refuerzo: seedMedida([
    ["Cartón gris", "5x5 cm"],
    ["Papel kraft", "10x10 cm"],
  ]),
  base: seedMedida([
    ["Cartón duplex", "15x20 cm"],
    ["Polipropileno", "12x12 cm"],
  ]),
  empaque: seed([
    "Caja 15x15x15", "Caja EB 61x40x60", "Tarima", "Paquetes", "Otro",
  ]),
};

// ── Tab config ─────────────────────────────────────────────────────────────
interface TabConfig {
  key: CatKey;
  label: string;
  hasMedida: boolean;
  icon: string;
}

const TABS: TabConfig[] = [
  { key: "tipoProducto", label: "Tipo de producto", hasMedida: false, icon: "📦" },
  { key: "tipoPapel",    label: "Tipo de papel",    hasMedida: false, icon: "📄" },
  { key: "tipoPegado",   label: "Tipo de pegado",   hasMedida: false, icon: "🔧" },
  { key: "pegamento",    label: "Pegamento",         hasMedida: false, icon: "🧴" },
  { key: "tipoAsa",      label: "Tipo de asa",       hasMedida: false, icon: "🪢" },
  { key: "refuerzo",     label: "Refuerzo",          hasMedida: true,  icon: "🔩" },
  { key: "base",         label: "Base",              hasMedida: true,  icon: "⬜" },
  { key: "empaque",      label: "Empaque",           hasMedida: false, icon: "📫" },
];

// ── Primitivos ─────────────────────────────────────────────────────────────
function Inp({
  placeholder, value, onChange, style,
}: {
  placeholder?: string; value: string;
  onChange: (v: string) => void; style?: React.CSSProperties;
}) {
  return (
    <input
      type="text" placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", height: 38, padding: "0 12px",
        border: "1px solid #D1D5DB", borderRadius: 7,
        fontSize: 13, color: "#111827", background: "#fff",
        outline: "none", boxSizing: "border-box", ...style,
      }}
    />
  );
}

function Btn({
  children, onClick, variant = "primary", small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  small?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "#1D4ED8", color: "#fff", border: "none" },
    secondary: { background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" },
    danger:    { background: "#FEE2E2", color: "#DC2626", border: "none" },
    ghost:     { background: "none",   color: "#6B7280", border: "1px solid #E5E7EB" },
  };
  return (
    <button
      onClick={onClick}
      style={{
        height: small ? 30 : 38,
        padding: small ? "0 12px" : "0 18px",
        borderRadius: 7, cursor: "pointer",
        fontSize: small ? 12 : 13, fontWeight: 600,
        display: "inline-flex", alignItems: "center", gap: 6,
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

// ── Modal de confirmación ──────────────────────────────────────────────────
function ConfirmModal({
  message, onConfirm, onCancel,
}: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "#fff", borderRadius: 12,
        padding: "28px 32px", maxWidth: 360, width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <p style={{ fontSize: 15, color: "#111827", margin: "0 0 20px", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn variant="danger" onClick={onConfirm}>Eliminar</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Panel de la tab activa ─────────────────────────────────────────────────
function CatPanel({
  tab, items, onChange,
}: {
  tab: TabConfig;
  items: CatItem[];
  onChange: (items: CatItem[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newMedida, setNewMedida] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editMedida, setEditMedida] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = items.filter((it) =>
    it.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (it.medida ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const nextId = () => Math.max(0, ...items.map((i) => i.id)) + 1;

  const handleAdd = () => {
    if (!newNombre.trim()) return;
    onChange([...items, {
      id: nextId(),
      nombre: newNombre.trim(),
      ...(tab.hasMedida ? { medida: newMedida.trim() } : {}),
    }]);
    setNewNombre("");
    setNewMedida("");
  };

  const startEdit = (item: CatItem) => {
    setEditId(item.id);
    setEditNombre(item.nombre);
    setEditMedida(item.medida ?? "");
  };

  const saveEdit = () => {
    if (!editNombre.trim()) return;
    onChange(items.map((it) =>
      it.id === editId
        ? { ...it, nombre: editNombre.trim(), medida: tab.hasMedida ? editMedida.trim() : undefined }
        : it
    ));
    setEditId(null);
  };

  const confirmDelete = () => {
    onChange(items.filter((it) => it.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div>
      {deleteId !== null && (
        <ConfirmModal
          message="¿Eliminar este registro? Esta acción no se puede deshacer."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Formulario para agregar */}
      <div style={{
        background: "#F9FAFB", border: "1px dashed #D1D5DB",
        borderRadius: 9, padding: "16px 18px", marginBottom: 20,
      }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px",
        }}>
          Agregar nuevo
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: tab.hasMedida ? "1fr 1fr auto" : "1fr auto",
          gap: "0 10px", alignItems: "end",
        }}>
          <div>
            <label style={labelStyle}>Material / Nombre</label>
            <Inp
              placeholder={`Nombre del ${tab.label.toLowerCase()}…`}
              value={newNombre}
              onChange={setNewNombre}
            />
          </div>
          {tab.hasMedida && (
            <div>
              <label style={labelStyle}>Medida</label>
              <Inp placeholder="ej: 10x10 cm" value={newMedida} onChange={setNewMedida} />
            </div>
          )}
          <Btn variant="primary" onClick={handleAdd}>+ Agregar</Btn>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: 14, position: "relative" }}>
        <span style={{
          position: "absolute", left: 12, top: "50%",
          transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF",
        }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", height: 38, paddingLeft: 36, paddingRight: 12,
            border: "1px solid #D1D5DB", borderRadius: 7,
            fontSize: 13, color: "#111827", background: "#fff",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Tabla */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: tab.hasMedida ? "40px 1fr 1fr auto" : "40px 1fr auto",
          background: "#F9FAFB",
          borderBottom: "1px solid #E5E7EB",
          padding: "0 16px",
        }}>
          {["#", "Material / Nombre", ...(tab.hasMedida ? ["Medida"] : []), ""].map((h) => (
            <div key={h} style={{
              padding: "10px 0",
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#6B7280",
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Filas */}
        {filtered.length === 0 ? (
          <div style={{
            padding: "32px 16px", textAlign: "center",
            color: "#9CA3AF", fontSize: 13,
          }}>
            {search ? "Sin resultados para esa búsqueda." : "No hay registros aún."}
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: tab.hasMedida ? "40px 1fr 1fr auto" : "40px 1fr auto",
                padding: "0 16px",
                borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
                background: editId === item.id ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA",
                alignItems: "center",
                minHeight: 48,
              }}
            >
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{item.id}</span>

              {editId === item.id ? (
                <Inp value={editNombre} onChange={setEditNombre} style={{ height: 32, fontSize: 13 }}/>
              ) : (
                <span style={{ fontSize: 13, color: "#111827" }}>{item.nombre}</span>
              )}

              {tab.hasMedida && (
                editId === item.id ? (
                  <Inp value={editMedida} onChange={setEditMedida}
                    placeholder="ej: 10x10 cm" style={{ height: 32, fontSize: 13 }}/>
                ) : (
                  <span style={{ fontSize: 13, color: "#6B7280" }}>{item.medida ?? "—"}</span>
                )
              )}

              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", padding: "6px 0" }}>
                {editId === item.id ? (
                  <>
                    <Btn variant="primary" small onClick={saveEdit}>✓ Guardar</Btn>
                    <Btn variant="ghost" small onClick={() => setEditId(null)}>Cancelar</Btn>
                  </>
                ) : (
                  <>
                    <Btn variant="secondary" small onClick={() => startEdit(item)}>✎ Editar</Btn>
                    <Btn variant="danger" small onClick={() => setDeleteId(item.id)}>× Eliminar</Btn>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 10, textAlign: "right", fontSize: 12, color: "#9CA3AF" }}>
        {filtered.length} de {items.length} registro{items.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Catalogos() {
  useAuth();
  const [data, setData] = useState<Catalogs>(initialData);
  const [activeTab, setActiveTab] = useState<CatKey>("tipoProducto");

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  const updateCat = (key: CatKey, items: CatItem[]) =>
    setData((prev) => ({ ...prev, [key]: items }));

  return (
    <Dashboard>
      <div style={{
        maxWidth: 960, margin: "0 auto",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#111827",
      }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{
            fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#9CA3AF", margin: "0 0 4px", fontWeight: 600,
          }}>
            Configuración
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#111827" }}>
            Gestión de catálogos
          </h1>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
            Administra los valores disponibles en el formulario de alta de productos.
          </p>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Sidebar de tabs */}
          <div style={{
            width: 200, flexShrink: 0,
            background: "#fff", border: "1px solid #E5E7EB",
            borderRadius: 10, overflow: "hidden",
          }}>
            {TABS.map((tab) => {
              const active = tab.key === activeTab;
              const count = data[tab.key].length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    width: "100%", padding: "11px 14px",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8, border: "none",
                    borderLeft: active ? "3px solid #1D4ED8" : "3px solid transparent",
                    background: active ? "#EFF6FF" : "#fff",
                    cursor: "pointer",
                    borderBottom: "1px solid #F3F4F6",
                    transition: "background 0.1s",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{tab.icon}</span>
                    <span style={{
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      color: active ? "#1D4ED8" : "#374151",
                      whiteSpace: "nowrap", overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {tab.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: active ? "#1D4ED8" : "#9CA3AF",
                    background: active ? "#DBEAFE" : "#F3F4F6",
                    borderRadius: 10, padding: "1px 7px",
                    flexShrink: 0,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Panel principal */}
          <div style={{
            flex: 1, background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 10, padding: "20px 22px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
              paddingBottom: 14, borderBottom: "1px solid #E5E7EB",
            }}>
              <span style={{ fontSize: 20 }}>{activeTabConfig.icon}</span>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#111827" }}>
                  {activeTabConfig.label}
                </h2>
                {activeTabConfig.hasMedida && (
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                    Incluye material y medida
                  </p>
                )}
              </div>
            </div>

            <CatPanel
              key={activeTab}
              tab={activeTabConfig}
              items={data[activeTab]}
              onChange={(items) => updateCat(activeTab, items)}
            />
          </div>
        </div>
      </div>
    </Dashboard>
  );
}

// ── Shared ─────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "#6B7280", marginBottom: 4,
  letterSpacing: "0.04em", textTransform: "uppercase",
};