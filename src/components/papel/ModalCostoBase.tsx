// src/components/papel/ModalCostoBase.tsx
//
// Modal ligero para registrar o editar el "costo base" (precio_sugerido) de
// un producto SIN abrir el formulario completo de edición. Un producto
// puede tener 1 o N grupos (opciones de material), y cada uno tiene su
// propio costo base — por eso se muestra una fila por grupo.
import { useState, useEffect } from "react";
import { leerBorrador, useAutoguardarBorrador, limpiarBorrador } from "../../hooks/useBorradorFormulario";

interface GrupoCosto {
  idgrupo_papel: number;
  label: string;
  precio: string; // string controlado para el input; "" = sin costo capturado
}

interface Props {
  idProducto: number;
  nombreProducto: string;
  onClose: () => void;
  // Se llama con los grupos que el backend confirmó como actualizados,
  // en el mismo orden en que se mandaron (orden ASC, igual que en la tabla).
  onSaved: (grupos: { idgrupo_papel: number; precio_sugerido: number | null }[]) => void;
}

function formatearLabelGrupo(materiales: any[] | undefined, index: number): string {
  if (!materiales || materiales.length === 0) return `Opción ${index + 1}`;
  const nombres = materiales
    .map((m) => [m.tipo_papel, m.calibre].filter(Boolean).join(" "))
    .filter(Boolean);
  return nombres.length > 0 ? nombres.join(" + ") : `Opción ${index + 1}`;
}

export default function ModalCostoBase({ idProducto, nombreProducto, onClose, onSaved }: Props) {
  const claveBorrador = `costo-base-${idProducto}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<GrupoCosto[]>([]);

  useAutoguardarBorrador(claveBorrador, grupos, grupos.length > 0);

  useEffect(() => {
    let cancelado = false;
    const BASE = (import.meta as any).env.VITE_API_URL;

    fetch(`${BASE}/productos-papel/${idProducto}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelado) return;
        const borrador = leerBorrador<GrupoCosto[]>(claveBorrador);
        if (borrador) { setGrupos(borrador); return; }
        const lista: GrupoCosto[] = (d.grupos ?? []).map((g: any, i: number) => ({
          idgrupo_papel: g.idgrupo_papel,
          label: formatearLabelGrupo(g.materiales, i),
          precio: g.precio_sugerido != null ? String(g.precio_sugerido) : "",
        }));
        setGrupos(lista);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar la información del producto.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => { cancelado = true; };
  }, [idProducto, claveBorrador]);

  const actualizarPrecio = (idgrupo_papel: number, valor: string) => {
    // Mismo criterio que el input de "Costo" en GrupoBlock: solo dígitos y un punto.
    const limpio = valor.replace(/[^0-9.]/g, "");
    setGrupos((prev) =>
      prev.map((g) => (g.idgrupo_papel === idgrupo_papel ? { ...g, precio: limpio } : g))
    );
  };

  const handleGuardar = async () => {
    setSaving(true);
    setError(null);
    try {
      const BASE = (import.meta as any).env.VITE_API_URL;
      const payload = {
        grupos: grupos.map((g) => ({
          idgrupo_papel: g.idgrupo_papel,
          precio_sugerido: g.precio.trim() === "" ? null : Number(g.precio),
        })),
      };

      const res = await fetch(`${BASE}/productos-papel/${idProducto}/costo-base`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar el costo base");
      }

      const data = await res.json();
      limpiarBorrador(claveBorrador);
      onSaved(data.grupos ?? []);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Error al guardar el costo base");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, padding: "22px 26px",
          maxWidth: 420, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        }}
      >
        <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 2px", fontWeight: 700 }}>
          Costo base
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>
          {nombreProducto}
        </p>

        {loading ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Cargando...</div>
        ) : grupos.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            Este producto todavía no tiene opciones de material registradas.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {grupos.map((g, i) => (
              <div key={g.idgrupo_papel} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Opción {i + 1}
                  </p>
                  <p
                    style={{ margin: 0, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={g.label}
                  >
                    {g.label}
                  </p>
                </div>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9CA3AF", pointerEvents: "none" }}>
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={g.precio}
                    onChange={(e) => actualizarPrecio(g.idgrupo_papel, e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: 110, height: 34, paddingLeft: 18, paddingRight: 8,
                      border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 13,
                      color: "#111827", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>MXN</span>
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 12px" }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ height: 34, padding: "0 14px", border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff", color: "#6B7280", fontSize: 12, cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving || loading || grupos.length === 0}
            style={{
              height: 34, padding: "0 16px", border: "none", borderRadius: 6,
              background: saving ? "#93C5FD" : "#1D4ED8", color: "#fff",
              fontSize: 12, fontWeight: 600, cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Guardando..." : "Guardar costo base"}
          </button>
        </div>
      </div>
    </div>
  );
}