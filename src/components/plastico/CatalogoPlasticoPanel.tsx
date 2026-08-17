import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useCatalogosPlastico } from "../../hooks/plastico/useCatalogosPlastico";
import type {
  TipoProductoAdminItem,
  MaterialAdminItem,
  CalibreAdminItem,
  TroquelAdminItem,
  SuajeAdminItem,
  CintaSeguridadAdminItem,
} from "../../types/plastico/productos-plastico.types";
import ImagenCatalogo, { SelectorImagenPendiente } from "../papel/ImagenCatalogo";
import type { UseImagenesCatalogo } from "../../hooks/papel/useImagenesCatalogo";

// ═══════════════════════════════════════════════════════════════════════
// Catálogos propios de plástico: tipo de producto, material y calibre.
// A diferencia de los catálogos "esInsumo" de papel, estos NO están
// vinculados a proveedores — no representan un insumo (bobina, materia
// prima, tintas, etc.), son características propias de la línea de
// plástico. Por eso el patrón aquí es CRUD simple (alta/editar/desactivar/
// reactivar), igual que CatPanel en catalogos.tsx, y no el de
// InsumoCatalogoPanel (que sí maneja proveedores).
// ═══════════════════════════════════════════════════════════════════════

// ── Primitivos visuales (mismo lenguaje que CatPanel/InsumoCatalogoPanel) ──
const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#6B7280",
  marginBottom: 4,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

function Btn({ children, onClick, variant = "primary", small, disabled }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  small?: boolean;
  disabled?: boolean;
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: "#1D4ED8", color: "#fff", border: "none" },
    secondary: { background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" },
    danger: { background: "#FEE2E2", color: "#DC2626", border: "none" },
    ghost: { background: "none", color: "#6B7280", border: "1px solid #E5E7EB" },
  };
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        height: small ? 30 : 38,
        padding: small ? "0 12px" : "0 18px",
        borderRadius: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

function Inp({ value, onChange, placeholder, inputMode, style }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  style?: CSSProperties;
}) {
  return (
    <input
      type="text"
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        height: 38,
        padding: "0 12px",
        border: "1px solid #D1D5DB",
        borderRadius: 7,
        fontSize: 13,
        color: "#111827",
        background: "#fff",
        outline: "none",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14, position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF" }}>🔍</span>
      <input
        type="text"
        placeholder="Buscar…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", height: 38, paddingLeft: 36, paddingRight: 12, border: "1px solid #D1D5DB", borderRadius: 7, fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return <div style={{ padding: "10px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>{children}</div>;
}

function EmptyRows({ search }: { search: string }) {
  return <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{search ? "Sin resultados." : "No hay registros aún."}</div>;
}

function Counter({ filtered, total }: { filtered: number; total: number }) {
  return <div style={{ marginTop: 10, textAlign: "right", fontSize: 12, color: "#9CA3AF" }}>{filtered} de {total} registro{total !== 1 ? "s" : ""}</div>;
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <p style={{ fontSize: 15, color: "#111827", margin: "0 0 20px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn variant="danger" onClick={onConfirm}>Desactivar</Btn>
        </div>
      </div>
    </div>
  );
}

function Actions({ verInactivos, editando, saving, onReactivar, onGuardar, onCancelar, onEditar, onEliminar }: {
  verInactivos?: boolean;
  editando: boolean;
  saving: boolean;
  onReactivar?: () => void;
  onGuardar: () => void;
  onCancelar: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", padding: "6px 0" }}>
      {verInactivos ? (
        <Btn variant="primary" small onClick={onReactivar}>↩ Reactivar</Btn>
      ) : editando ? (
        <>
          <Btn variant="primary" small onClick={onGuardar} disabled={saving}>{saving ? "…" : "✓ Guardar"}</Btn>
          <Btn variant="ghost" small onClick={onCancelar}>Cancelar</Btn>
        </>
      ) : (
        <>
          <Btn variant="secondary" small onClick={onEditar}>✎ Editar</Btn>
          <Btn variant="danger" small onClick={onEliminar}>× Desactivar</Btn>
        </>
      )}
    </div>
  );
}

const cajaInactivos = (loadingInactivos?: boolean) => (
  <div style={{ background: "#FEF2F2", border: "1px dashed #FECACA", borderRadius: 9, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontSize: 14 }}>⚠️</span>
    <p style={{ margin: 0, fontSize: 12, color: "#DC2626", fontWeight: 500 }}>
      {loadingInactivos ? "Cargando inactivos…" : "Registros desactivados — puedes reactivarlos."}
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// TIPO DE PRODUCTO
// ═══════════════════════════════════════════════════════════════════════
function TipoProductoPanel({
  items, itemsInactivos, verInactivos, loadingInactivos,
  onAdd, onEdit, onDesactivar, onReactivar, imgApi,
}: {
  items: TipoProductoAdminItem[];
  itemsInactivos: TipoProductoAdminItem[];
  verInactivos: boolean;
  loadingInactivos: boolean;
  onAdd: (nombre: string) => Promise<{ id: number } | unknown>;
  onEdit: (id: number, nombre: string) => Promise<unknown>;
  onDesactivar: (id: number) => Promise<unknown>;
  onReactivar: (id: number) => Promise<unknown>;
  imgApi: UseImagenesCatalogo;
}) {
  const [search, setSearch] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newImagenFile, setNewImagenFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const lista = verInactivos ? itemsInactivos : items;
  const filtered = lista.filter((it) => it.nombre.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!newNombre.trim()) return;
    setSaving(true);
    try {
      const creado = await onAdd(newNombre.trim());
      if (newImagenFile) {
        const id = (creado as { id?: number } | undefined)?.id;
        if (id != null) {
          try { await imgApi.subir("tipo_producto_plastico", id, newImagenFile); }
          catch { /* la imagen se puede volver a subir después desde el renglón */ }
        }
      }
      setNewNombre("");
      setNewImagenFile(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar el tipo de producto");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (editId === null || !editNombre.trim()) return;
    setSaving(true);
    try {
      await onEdit(editId, editNombre.trim());
      setEditId(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al editar el tipo de producto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await onDesactivar(deleteId);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al desactivar");
    }
    setDeleteId(null);
  };

  return (
    <div>
      {deleteId !== null && (
        <ConfirmModal message="¿Desactivar este tipo de producto?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      {!verInactivos && (
        <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 9, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px" }}>Agregar nuevo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0 10px", alignItems: "end" }}>
            <div><label style={labelStyle}>Nombre</label><Inp placeholder="Ej. Bolsa camiseta" value={newNombre} onChange={setNewNombre} /></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SelectorImagenPendiente file={newImagenFile} onChange={setNewImagenFile} size={38} />
              <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
            </div>
          </div>
        </div>
      )}

      {verInactivos && cajaInactivos(loadingInactivos)}

      <SearchBox value={search} onChange={setSearch} />
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["", "#", "Nombre", ""].map((h, i) => <HeaderCell key={i}>{h}</HeaderCell>)}
        </div>
        {filtered.length === 0 ? <EmptyRows search={search} /> : filtered.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr auto", padding: "0 16px", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: editId === item.id ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center", minHeight: 48 }}>
            <div style={{ alignSelf: "center" }}>
              <ImagenCatalogo api={imgApi} catalogoKey="tipo_producto_plastico" catalogoId={item.id} size={32} />
            </div>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{idx + 1}</span>
            {editId === item.id
              ? <div style={{ paddingRight: 8 }}><Inp value={editNombre} onChange={setEditNombre} /></div>
              : <span style={{ fontSize: 13, color: "#111827" }}>{item.nombre}</span>}
            <Actions
              verInactivos={verInactivos} editando={editId === item.id} saving={saving}
              onReactivar={() => onReactivar(item.id)} onGuardar={handleEdit}
              onCancelar={() => setEditId(null)}
              onEditar={() => { setEditId(item.id); setEditNombre(item.nombre); }}
              onEliminar={() => setDeleteId(item.id)}
            />
          </div>
        ))}
      </div>
      <Counter filtered={filtered.length} total={lista.length} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TIPO DE TROQUEL (medidas_troquel — mismo shape simple que TipoProducto)
// ═══════════════════════════════════════════════════════════════════════
function TroquelPanel({
  items, itemsInactivos, verInactivos, loadingInactivos,
  onAdd, onEdit, onDesactivar, onReactivar, imgApi,
}: {
  items: TroquelAdminItem[];
  itemsInactivos: TroquelAdminItem[];
  verInactivos: boolean;
  loadingInactivos: boolean;
  onAdd: (nombre: string) => Promise<{ id: number } | unknown>;
  onEdit: (id: number, nombre: string) => Promise<unknown>;
  onDesactivar: (id: number) => Promise<unknown>;
  onReactivar: (id: number) => Promise<unknown>;
  imgApi: UseImagenesCatalogo;
}) {
  const [search, setSearch] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newImagenFile, setNewImagenFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const lista = verInactivos ? itemsInactivos : items;
  const filtered = lista.filter((it) => it.nombre.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!newNombre.trim()) return;
    setSaving(true);
    try {
      const creado = await onAdd(newNombre.trim());
      if (newImagenFile) {
        const id = (creado as { id?: number } | undefined)?.id;
        if (id != null) {
          try { await imgApi.subir("medidas_troquel", id, newImagenFile); }
          catch { /* la imagen se puede volver a subir después desde el renglón */ }
        }
      }
      setNewNombre("");
      setNewImagenFile(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar el tipo de troquel");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (editId === null || !editNombre.trim()) return;
    setSaving(true);
    try {
      await onEdit(editId, editNombre.trim());
      setEditId(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al editar el tipo de troquel");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await onDesactivar(deleteId);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al desactivar");
    }
    setDeleteId(null);
  };

  return (
    <div>
      {deleteId !== null && (
        <ConfirmModal message="¿Desactivar este tipo de troquel?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      {!verInactivos && (
        <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 9, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px" }}>Agregar nuevo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0 10px", alignItems: "end" }}>
            <div><label style={labelStyle}>Medida</label><Inp placeholder="Ej. 10x15 cm" value={newNombre} onChange={setNewNombre} /></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SelectorImagenPendiente file={newImagenFile} onChange={setNewImagenFile} size={38} />
              <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
            </div>
          </div>
        </div>
      )}

      {verInactivos && cajaInactivos(loadingInactivos)}

      <SearchBox value={search} onChange={setSearch} />
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["", "#", "Medida", ""].map((h, i) => <HeaderCell key={i}>{h}</HeaderCell>)}
        </div>
        {filtered.length === 0 ? <EmptyRows search={search} /> : filtered.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr auto", padding: "0 16px", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: editId === item.id ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center", minHeight: 48 }}>
            <div style={{ alignSelf: "center" }}>
              <ImagenCatalogo api={imgApi} catalogoKey="medidas_troquel" catalogoId={item.id} size={32} />
            </div>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{idx + 1}</span>
            {editId === item.id
              ? <div style={{ paddingRight: 8 }}><Inp value={editNombre} onChange={setEditNombre} /></div>
              : <span style={{ fontSize: 13, color: "#111827" }}>{item.nombre}</span>}
            <Actions
              verInactivos={verInactivos} editando={editId === item.id} saving={saving}
              onReactivar={() => onReactivar(item.id)} onGuardar={handleEdit}
              onCancelar={() => setEditId(null)}
              onEditar={() => { setEditId(item.id); setEditNombre(item.nombre); }}
              onEliminar={() => setDeleteId(item.id)}
            />
          </div>
        ))}
      </div>
      <Counter filtered={filtered.length} total={lista.length} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ASA / SUAJE (asa_suaje — mismo shape simple que TipoProducto)
// ═══════════════════════════════════════════════════════════════════════
function SuajePanel({
  items, itemsInactivos, verInactivos, loadingInactivos,
  onAdd, onEdit, onDesactivar, onReactivar, imgApi,
}: {
  items: SuajeAdminItem[];
  itemsInactivos: SuajeAdminItem[];
  verInactivos: boolean;
  loadingInactivos: boolean;
  onAdd: (nombre: string) => Promise<{ id: number } | unknown>;
  onEdit: (id: number, nombre: string) => Promise<unknown>;
  onDesactivar: (id: number) => Promise<unknown>;
  onReactivar: (id: number) => Promise<unknown>;
  imgApi: UseImagenesCatalogo;
}) {
  const [search, setSearch] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newImagenFile, setNewImagenFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const lista = verInactivos ? itemsInactivos : items;
  const filtered = lista.filter((it) => it.nombre.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!newNombre.trim()) return;
    setSaving(true);
    try {
      const creado = await onAdd(newNombre.trim());
      if (newImagenFile) {
        const id = (creado as { id?: number } | undefined)?.id;
        if (id != null) {
          try { await imgApi.subir("asa_suaje", id, newImagenFile); }
          catch { /* la imagen se puede volver a subir después desde el renglón */ }
        }
      }
      setNewNombre("");
      setNewImagenFile(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar el asa/suaje");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (editId === null || !editNombre.trim()) return;
    setSaving(true);
    try {
      await onEdit(editId, editNombre.trim());
      setEditId(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al editar el asa/suaje");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await onDesactivar(deleteId);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al desactivar");
    }
    setDeleteId(null);
  };

  return (
    <div>
      {deleteId !== null && (
        <ConfirmModal message="¿Desactivar este asa/suaje?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      {!verInactivos && (
        <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 9, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px" }}>Agregar nuevo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0 10px", alignItems: "end" }}>
            <div><label style={labelStyle}>Nombre</label><Inp placeholder="Ej. Asa flexible chica" value={newNombre} onChange={setNewNombre} /></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SelectorImagenPendiente file={newImagenFile} onChange={setNewImagenFile} size={38} />
              <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
            </div>
          </div>
        </div>
      )}

      {verInactivos && cajaInactivos(loadingInactivos)}

      <SearchBox value={search} onChange={setSearch} />
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["", "#", "Nombre", ""].map((h, i) => <HeaderCell key={i}>{h}</HeaderCell>)}
        </div>
        {filtered.length === 0 ? <EmptyRows search={search} /> : filtered.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr auto", padding: "0 16px", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: editId === item.id ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center", minHeight: 48 }}>
            <div style={{ alignSelf: "center" }}>
              <ImagenCatalogo api={imgApi} catalogoKey="asa_suaje" catalogoId={item.id} size={32} />
            </div>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{idx + 1}</span>
            {editId === item.id
              ? <div style={{ paddingRight: 8 }}><Inp value={editNombre} onChange={setEditNombre} /></div>
              : <span style={{ fontSize: 13, color: "#111827" }}>{item.nombre}</span>}
            <Actions
              verInactivos={verInactivos} editando={editId === item.id} saving={saving}
              onReactivar={() => onReactivar(item.id)} onGuardar={handleEdit}
              onCancelar={() => setEditId(null)}
              onEditar={() => { setEditId(item.id); setEditNombre(item.nombre); }}
              onEliminar={() => setDeleteId(item.id)}
            />
          </div>
        ))}
      </div>
      <Counter filtered={filtered.length} total={lista.length} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CINTA DE SEGURIDAD (nombre + medida separados)
// ═══════════════════════════════════════════════════════════════════════
function CintaSeguridadPanel({
  items, itemsInactivos, verInactivos, loadingInactivos,
  onAdd, onEdit, onDesactivar, onReactivar, imgApi,
}: {
  items: CintaSeguridadAdminItem[];
  itemsInactivos: CintaSeguridadAdminItem[];
  verInactivos: boolean;
  loadingInactivos: boolean;
  onAdd: (nombre: string, medida?: string | null) => Promise<{ id: number } | unknown>;
  onEdit: (id: number, nombre: string, medida?: string | null) => Promise<unknown>;
  onDesactivar: (id: number) => Promise<unknown>;
  onReactivar: (id: number) => Promise<unknown>;
  imgApi: UseImagenesCatalogo;
}) {
  const [search, setSearch] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newMedida, setNewMedida] = useState("");
  const [newImagenFile, setNewImagenFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editMedida, setEditMedida] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const lista = verInactivos ? itemsInactivos : items;
  const filtered = lista.filter((it) =>
    it.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (it.medida ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newNombre.trim()) return;
    setSaving(true);
    try {
      const creado = await onAdd(newNombre.trim(), newMedida.trim() || null);
      if (newImagenFile) {
        const id = (creado as { id?: number } | undefined)?.id;
        if (id != null) {
          try { await imgApi.subir("cinta_seguridad", id, newImagenFile); }
          catch { /* la imagen se puede volver a subir después desde el renglón */ }
        }
      }
      setNewNombre(""); setNewMedida("");
      setNewImagenFile(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar la cinta de seguridad");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (editId === null || !editNombre.trim()) return;
    setSaving(true);
    try {
      await onEdit(editId, editNombre.trim(), editMedida.trim() || null);
      setEditId(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al editar la cinta de seguridad");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await onDesactivar(deleteId);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al desactivar");
    }
    setDeleteId(null);
  };

  return (
    <div>
      {deleteId !== null && (
        <ConfirmModal message="¿Desactivar esta cinta de seguridad?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      {!verInactivos && (
        <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 9, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px" }}>Agregar nuevo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0 10px", alignItems: "end" }}>
            <div><label style={labelStyle}>Nombre</label><Inp placeholder="Ej. Cinta roja" value={newNombre} onChange={setNewNombre} /></div>
            <div><label style={labelStyle}>Medida</label><Inp placeholder="Ej. 5 cm" value={newMedida} onChange={setNewMedida} /></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SelectorImagenPendiente file={newImagenFile} onChange={setNewImagenFile} size={38} />
              <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
            </div>
          </div>
        </div>
      )}

      {verInactivos && cajaInactivos(loadingInactivos)}

      <SearchBox value={search} onChange={setSearch} />
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["", "#", "Nombre", "Medida", ""].map((h, i) => <HeaderCell key={i}>{h}</HeaderCell>)}
        </div>
        {filtered.length === 0 ? <EmptyRows search={search} /> : filtered.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr 1fr auto", padding: "0 16px", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: editId === item.id ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center", minHeight: 48 }}>
            <div style={{ alignSelf: "center" }}>
              <ImagenCatalogo api={imgApi} catalogoKey="cinta_seguridad" catalogoId={item.id} size={32} />
            </div>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{idx + 1}</span>
            {editId === item.id
              ? <div style={{ paddingRight: 8 }}><Inp value={editNombre} onChange={setEditNombre} /></div>
              : <span style={{ fontSize: 13, color: "#111827" }}>{item.nombre}</span>}
            {editId === item.id
              ? <div style={{ paddingRight: 8 }}><Inp value={editMedida} onChange={setEditMedida} /></div>
              : <span style={{ fontSize: 13, color: "#6B7280" }}>{item.medida ?? "—"}</span>}
            <Actions
              verInactivos={verInactivos} editando={editId === item.id} saving={saving}
              onReactivar={() => onReactivar(item.id)} onGuardar={handleEdit}
              onCancelar={() => setEditId(null)}
              onEditar={() => { setEditId(item.id); setEditNombre(item.nombre); setEditMedida(item.medida ?? ""); }}
              onEliminar={() => setDeleteId(item.id)}
            />
          </div>
        ))}
      </div>
      <Counter filtered={filtered.length} total={lista.length} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MATERIAL
// ═══════════════════════════════════════════════════════════════════════
function MaterialPanel({
  items, itemsInactivos, verInactivos, loadingInactivos,
  onAdd, onEdit, onDesactivar, onReactivar,
}: {
  items: MaterialAdminItem[];
  itemsInactivos: MaterialAdminItem[];
  verInactivos: boolean;
  loadingInactivos: boolean;
  onAdd: (nombre: string, valor: number) => Promise<unknown>;
  onEdit: (id: number, nombre: string, valor: number) => Promise<unknown>;
  onDesactivar: (id: number) => Promise<unknown>;
  onReactivar: (id: number) => Promise<unknown>;
}) {
  const [search, setSearch] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newValor, setNewValor] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editValor, setEditValor] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const lista = verInactivos ? itemsInactivos : items;
  const filtered = lista.filter((it) => it.nombre.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!newNombre.trim()) return;
    const v = parseFloat(newValor);
    if (isNaN(v) || v <= 0) {
      alert("El valor (factor de cálculo) debe ser un número mayor a 0");
      return;
    }
    setSaving(true);
    try {
      await onAdd(newNombre.trim(), v);
      setNewNombre("");
      setNewValor("");
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar el material");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (editId === null || !editNombre.trim()) return;
    const v = parseFloat(editValor);
    if (isNaN(v) || v <= 0) {
      alert("El valor (factor de cálculo) debe ser un número mayor a 0");
      return;
    }
    setSaving(true);
    try {
      await onEdit(editId, editNombre.trim(), v);
      setEditId(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al editar el material");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await onDesactivar(deleteId);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al desactivar");
    }
    setDeleteId(null);
  };

  return (
    <div>
      {deleteId !== null && (
        <ConfirmModal message="¿Desactivar este material?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      {!verInactivos && (
        <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 9, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px" }}>Agregar nuevo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0 10px", alignItems: "end" }}>
            <div><label style={labelStyle}>Nombre</label><Inp placeholder="Ej. HDPE" value={newNombre} onChange={setNewNombre} /></div>
            <div>
              <label style={labelStyle}>Valor (factor de cálculo)</label>
              <Inp inputMode="decimal" placeholder="Ej. 0.92" value={newValor} onChange={(v) => /^\d*\.?\d*$/.test(v) && setNewValor(v)} />
            </div>
            <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
          </div>
        </div>
      )}

      {verInactivos && cajaInactivos(loadingInactivos)}

      <SearchBox value={search} onChange={setSearch} />
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["#", "Nombre", "Valor", ""].map((h, i) => <HeaderCell key={i}>{h}</HeaderCell>)}
        </div>
        {filtered.length === 0 ? <EmptyRows search={search} /> : filtered.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px auto", padding: "0 16px", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: editId === item.id ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center", minHeight: 48 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{idx + 1}</span>
            {editId === item.id
              ? <div style={{ paddingRight: 8 }}><Inp value={editNombre} onChange={setEditNombre} /></div>
              : <span style={{ fontSize: 13, color: "#111827" }}>{item.nombre}</span>}
            {editId === item.id
              ? <div style={{ paddingRight: 8 }}><Inp inputMode="decimal" value={editValor} onChange={(v) => /^\d*\.?\d*$/.test(v) && setEditValor(v)} /></div>
              : <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "monospace" }}>{item.valor}</span>}
            <Actions
              verInactivos={verInactivos} editando={editId === item.id} saving={saving}
              onReactivar={() => onReactivar(item.id)} onGuardar={handleEdit}
              onCancelar={() => setEditId(null)}
              onEditar={() => { setEditId(item.id); setEditNombre(item.nombre); setEditValor(String(item.valor)); }}
              onEliminar={() => setDeleteId(item.id)}
            />
          </div>
        ))}
      </div>
      <Counter filtered={filtered.length} total={lista.length} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CALIBRE
// Mismo criterio "Normal" vs "Celofán + BOPP" que AgregarCalibreInline: si
// es BOPP, el calibre "normal" (columna NOT NULL en BD) se refleja
// internamente con el mismo valor del calibre BOPP — nunca se pide aparte.
// ═══════════════════════════════════════════════════════════════════════
function CalibrePanel({
  items, itemsInactivos, verInactivos, loadingInactivos,
  onAdd, onEdit, onDesactivar, onReactivar,
}: {
  items: CalibreAdminItem[];
  itemsInactivos: CalibreAdminItem[];
  verInactivos: boolean;
  loadingInactivos: boolean;
  onAdd: (calibre: number, calibre_bopp?: number | null, gramos?: number | null) => Promise<unknown>;
  onEdit: (id: number, calibre: number, calibre_bopp?: number | null, gramos?: number | null) => Promise<unknown>;
  onDesactivar: (id: number) => Promise<unknown>;
  onReactivar: (id: number) => Promise<unknown>;
}) {
  const [search, setSearch] = useState("");
  const [tipoNuevo, setTipoNuevo] = useState<"normal" | "bopp">("normal");
  const [newCalibre, setNewCalibre] = useState("");
  const [newCalibreBopp, setNewCalibreBopp] = useState("");
  const [newGramos, setNewGramos] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editTipo, setEditTipo] = useState<"normal" | "bopp">("normal");
  const [editCalibre, setEditCalibre] = useState("");
  const [editCalibreBopp, setEditCalibreBopp] = useState("");
  const [editGramos, setEditGramos] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const lista = verInactivos ? itemsInactivos : items;
  const filtered = lista.filter((it) =>
    String(it.calibre).includes(search) ||
    String(it.calibre_bopp ?? "").includes(search) ||
    String(it.gramos ?? "").includes(search)
  );

  const limpiarNuevo = () => {
    setNewCalibre(""); setNewCalibreBopp(""); setNewGramos(""); setTipoNuevo("normal");
  };

  const handleAdd = async () => {
    if (tipoNuevo === "bopp") {
      const cb = parseInt(newCalibreBopp, 10);
      const g = parseFloat(newGramos);
      if (isNaN(cb) || cb <= 0) { alert("El calibre BOPP es obligatorio para este tipo"); return; }
      if (isNaN(g) || g <= 0) { alert("Los gramos son obligatorios para este tipo"); return; }
      setSaving(true);
      try {
        await onAdd(cb, cb, g);
        limpiarNuevo();
      } catch (e: any) {
        alert(e.response?.data?.error ?? "Error al agregar el calibre");
      } finally {
        setSaving(false);
      }
      return;
    }
    const c = parseInt(newCalibre, 10);
    if (isNaN(c) || c <= 0) { alert("El calibre debe ser un número entero mayor a 0"); return; }
    setSaving(true);
    try {
      await onAdd(c, null, null);
      limpiarNuevo();
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al agregar el calibre");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: CalibreAdminItem) => {
    setEditId(item.id);
    const esBopp = item.calibre_bopp != null && item.gramos != null;
    setEditTipo(esBopp ? "bopp" : "normal");
    setEditCalibre(String(item.calibre));
    setEditCalibreBopp(item.calibre_bopp != null ? String(item.calibre_bopp) : "");
    setEditGramos(item.gramos != null ? String(item.gramos) : "");
  };

  const handleEdit = async () => {
    if (editId === null) return;
    if (editTipo === "bopp") {
      const cb = parseInt(editCalibreBopp, 10);
      const g = parseFloat(editGramos);
      if (isNaN(cb) || cb <= 0) { alert("El calibre BOPP es obligatorio para este tipo"); return; }
      if (isNaN(g) || g <= 0) { alert("Los gramos son obligatorios para este tipo"); return; }
      setSaving(true);
      try {
        await onEdit(editId, cb, cb, g);
        setEditId(null);
      } catch (e: any) {
        alert(e.response?.data?.error ?? "Error al editar el calibre");
      } finally {
        setSaving(false);
      }
      return;
    }
    const c = parseInt(editCalibre, 10);
    if (isNaN(c) || c <= 0) { alert("El calibre debe ser un número entero mayor a 0"); return; }
    setSaving(true);
    try {
      await onEdit(editId, c, null, null);
      setEditId(null);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al editar el calibre");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await onDesactivar(deleteId);
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Error al desactivar");
    }
    setDeleteId(null);
  };

  return (
    <div>
      {deleteId !== null && (
        <ConfirmModal message="¿Desactivar este calibre?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      {!verInactivos && (
        <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 9, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px" }}>Agregar nuevo</p>

          <label style={labelStyle}>¿Para qué es este calibre?</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, maxWidth: 360 }}>
            <button
              type="button"
              onClick={() => setTipoNuevo("normal")}
              style={{
                height: 34, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: tipoNuevo === "normal" ? "1px solid #1D4ED8" : "1px solid #D1D5DB",
                background: tipoNuevo === "normal" ? "#1D4ED8" : "#fff",
                color: tipoNuevo === "normal" ? "#fff" : "#6B7280",
              }}
            >
              Calibre normal
            </button>
            <button
              type="button"
              onClick={() => setTipoNuevo("bopp")}
              style={{
                height: 34, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: tipoNuevo === "bopp" ? "1px solid #1D4ED8" : "1px solid #D1D5DB",
                background: tipoNuevo === "bopp" ? "#1D4ED8" : "#fff",
                color: tipoNuevo === "bopp" ? "#fff" : "#6B7280",
              }}
            >
              Celofán + BOPP
            </button>
          </div>

          {tipoNuevo === "normal" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0 10px", alignItems: "end" }}>
              <div><label style={labelStyle}>Calibre</label><Inp inputMode="numeric" placeholder="Ej. 200" value={newCalibre} onChange={(v) => /^\d*$/.test(v) && setNewCalibre(v)} /></div>
              <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0 10px", alignItems: "end" }}>
              <div><label style={labelStyle}>Calibre BOPP</label><Inp inputMode="numeric" placeholder="Ej. 30" value={newCalibreBopp} onChange={(v) => /^\d*$/.test(v) && setNewCalibreBopp(v)} /></div>
              <div><label style={labelStyle}>Gramos</label><Inp inputMode="decimal" placeholder="Ej. 28" value={newGramos} onChange={(v) => /^\d*\.?\d*$/.test(v) && setNewGramos(v)} /></div>
              <Btn variant="primary" onClick={handleAdd} disabled={saving}>{saving ? "…" : "+ Agregar"}</Btn>
            </div>
          )}
        </div>
      )}

      {verInactivos && cajaInactivos(loadingInactivos)}

      <SearchBox value={search} onChange={setSearch} />
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr auto", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", padding: "0 16px" }}>
          {["#", "Calibre", "Calibre BOPP", "Gramos", ""].map((h, i) => <HeaderCell key={i}>{h}</HeaderCell>)}
        </div>
        {filtered.length === 0 ? <EmptyRows search={search} /> : filtered.map((item, idx) => {
          const editando = editId === item.id;
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr auto", padding: "0 16px", borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: editando ? "#FFFBEB" : idx % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center", minHeight: 48 }}>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{idx + 1}</span>

              {editando ? (
                editTipo === "bopp"
                  ? <span style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>(= calibre BOPP)</span>
                  : <div style={{ paddingRight: 8 }}><Inp inputMode="numeric" value={editCalibre} onChange={(v) => /^\d*$/.test(v) && setEditCalibre(v)} /></div>
              ) : (
                <span style={{ fontSize: 13, color: "#111827" }}>{item.calibre}</span>
              )}

              {editando && editTipo === "bopp"
                ? <div style={{ paddingRight: 8 }}><Inp inputMode="numeric" value={editCalibreBopp} onChange={(v) => /^\d*$/.test(v) && setEditCalibreBopp(v)} /></div>
                : <span style={{ fontSize: 13, color: "#6B7280" }}>{item.calibre_bopp ?? "—"}</span>}

              {editando && editTipo === "bopp"
                ? <div style={{ paddingRight: 8 }}><Inp inputMode="decimal" value={editGramos} onChange={(v) => /^\d*\.?\d*$/.test(v) && setEditGramos(v)} /></div>
                : <span style={{ fontSize: 13, color: "#6B7280" }}>{item.gramos ?? "—"}</span>}

              <Actions
                verInactivos={verInactivos} editando={editando} saving={saving}
                onReactivar={() => onReactivar(item.id)} onGuardar={handleEdit}
                onCancelar={() => setEditId(null)}
                onEditar={() => startEdit(item)}
                onEliminar={() => setDeleteId(item.id)}
              />
            </div>
          );
        })}
      </div>
      <Counter filtered={filtered.length} total={lista.length} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PANEL PRINCIPAL — switcher de 3 secciones, igual patrón que
// RefuerzoBasePanel (medidas/material) pero para plástico.
// ═══════════════════════════════════════════════════════════════════════
export type PlasticoCatalogoTipo = "tipoProducto" | "material" | "calibre" | "troquel" | "asaSuaje" | "cintaSeguridad";

export default function CatalogoPlasticoPanel({
  tipo,
  onCambio,
  imgApi,
}: {
  /** Cuál de los 6 sub-catálogos mostrar — cada uno es su propio renglón en
   * el sidebar (igual formato que el resto), no un switcher interno. */
  tipo: PlasticoCatalogoTipo;
  /** Notifica los 6 conteos cada vez que cambian, para los badges del
   * sidebar en catalogos.tsx (se mantienen sincronizados aunque solo uno
   * esté visible, porque el hook ya trae todos juntos). */
  onCambio?: (counts: { tipoProducto: number; material: number; calibre: number; troquel: number; asaSuaje: number; cintaSeguridad: number }) => void;
  imgApi: UseImagenesCatalogo;
}) {
  const {
    tiposProducto, materiales, calibres, troqueles, suajes, cintaSeguridad,
    tiposProductoInactivos, materialesInactivos, calibresInactivos,
    troquelesInactivos, suajesInactivos, cintaSeguridadInactivos,
    loading, loadingInactivos, loadInactivos,
    agregarTipoProducto, editarTipoProducto, desactivarTipoProducto, reactivarTipoProducto,
    agregarMaterial, editarMaterial, desactivarMaterial, reactivarMaterial,
    agregarCalibre, editarCalibre, desactivarCalibre, reactivarCalibre,
    agregarTroquel, editarTroquel, desactivarTroquel, reactivarTroquel,
    agregarSuaje, editarSuaje, desactivarSuaje, reactivarSuaje,
    agregarCintaSeguridad, editarCintaSeguridad, desactivarCintaSeguridad, reactivarCintaSeguridad,
  } = useCatalogosPlastico();

  const [verInactivos, setVerInactivos] = useState(false);

  // Al cambiar de sub-catálogo se resetea "ver inactivos" — cada uno es una
  // pestaña independiente.
  useEffect(() => {
    setVerInactivos(false);
  }, [tipo]);

  useEffect(() => {
    onCambio?.({
      tipoProducto: tiposProducto.length, material: materiales.length, calibre: calibres.length,
      troquel: troqueles.length, asaSuaje: suajes.length, cintaSeguridad: cintaSeguridad.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiposProducto.length, materiales.length, calibres.length, troqueles.length, suajes.length, cintaSeguridad.length]);

  const handleToggleInactivos = () => {
    if (!verInactivos) loadInactivos();
    setVerInactivos((v) => !v);
  };

  if (loading) {
    return <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Cargando…</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{verInactivos ? "Mostrando inactivos" : "Mostrar inactivos"}</span>
        <button
          type="button"
          onClick={handleToggleInactivos}
          style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: verInactivos ? "#DC2626" : "#D1D5DB", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
        >
          <span style={{ position: "absolute", top: 2, left: verInactivos ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </div>

      {tipo === "tipoProducto" && (
        <TipoProductoPanel
          items={tiposProducto} itemsInactivos={tiposProductoInactivos}
          verInactivos={verInactivos} loadingInactivos={loadingInactivos}
          onAdd={agregarTipoProducto} onEdit={editarTipoProducto}
          onDesactivar={desactivarTipoProducto} onReactivar={reactivarTipoProducto}
          imgApi={imgApi}
        />
      )}
      {tipo === "material" && (
        <MaterialPanel
          items={materiales} itemsInactivos={materialesInactivos}
          verInactivos={verInactivos} loadingInactivos={loadingInactivos}
          onAdd={agregarMaterial} onEdit={editarMaterial}
          onDesactivar={desactivarMaterial} onReactivar={reactivarMaterial}
        />
      )}
      {tipo === "calibre" && (
        <CalibrePanel
          items={calibres} itemsInactivos={calibresInactivos}
          verInactivos={verInactivos} loadingInactivos={loadingInactivos}
          onAdd={agregarCalibre} onEdit={editarCalibre}
          onDesactivar={desactivarCalibre} onReactivar={reactivarCalibre}
        />
      )}
      {tipo === "troquel" && (
        <TroquelPanel
          items={troqueles} itemsInactivos={troquelesInactivos}
          verInactivos={verInactivos} loadingInactivos={loadingInactivos}
          onAdd={agregarTroquel} onEdit={editarTroquel}
          onDesactivar={desactivarTroquel} onReactivar={reactivarTroquel}
          imgApi={imgApi}
        />
      )}
      {tipo === "asaSuaje" && (
        <SuajePanel
          items={suajes} itemsInactivos={suajesInactivos}
          verInactivos={verInactivos} loadingInactivos={loadingInactivos}
          onAdd={agregarSuaje} onEdit={editarSuaje}
          onDesactivar={desactivarSuaje} onReactivar={reactivarSuaje}
          imgApi={imgApi}
        />
      )}
      {tipo === "cintaSeguridad" && (
        <CintaSeguridadPanel
          items={cintaSeguridad} itemsInactivos={cintaSeguridadInactivos}
          verInactivos={verInactivos} loadingInactivos={loadingInactivos}
          onAdd={agregarCintaSeguridad} onEdit={editarCintaSeguridad}
          onDesactivar={desactivarCintaSeguridad} onReactivar={reactivarCintaSeguridad}
          imgApi={imgApi}
        />
      )}
    </div>
  );
}