import { useEffect, useRef, useState } from "react";
import type { CatKey } from "../../types/papel/papel.types";

interface SelConAltaProps {
  catKey: CatKey;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onAdd: (key: CatKey, nombre: string) => Promise<unknown>;
  placeholder?: string;
}

export default function SelConAlta({
  catKey,
  options,
  value,
  onChange,
  onAdd,
  placeholder = "Selecciona o escribe…",
}: SelConAltaProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [saving, setSaving] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const inputNuevoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setNuevo("");
      }
    };

    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  useEffect(() => {
    if (adding) inputNuevoRef.current?.focus();
  }, [adding]);

  const opcionesFiltradas = options.filter((o) =>
    o.toLowerCase().includes((value ?? "").toLowerCase())
  );

  const handleAgregar = async () => {
    const nombre = nuevo.trim();
    if (!nombre) return;

    setSaving(true);
    try {
      await onAdd(catKey, nombre);
      onChange(nombre);
      setNuevo("");
      setAdding(false);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          height: 34,
          border: "1px solid #D1D5DB",
          borderRadius: 5,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "0 8px",
            border: "none",
            outline: "none",
            fontSize: 13,
            color: "#111827",
            background: "transparent",
          }}
        />

        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setAdding(false);
          }}
          style={{
            width: 28,
            flexShrink: 0,
            border: "none",
            borderLeft: "1px solid #E5E7EB",
            background: "#F9FAFB",
            cursor: "pointer",
            color: "#6B7280",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ▾
        </button>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 38,
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #D1D5DB",
            borderRadius: 6,
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            padding: "4px 0",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {opcionesFiltradas.length > 0 ? (
            opcionesFiltradas.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => {
                  onChange(opcion);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  border: "none",
                  background: value === opcion ? "#EFF6FF" : "transparent",
                  color: value === opcion ? "#1D4ED8" : "#111827",
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: value === opcion ? 600 : 400,
                }}
              >
                {opcion}
              </button>
            ))
          ) : (
            <div
              style={{
                padding: "8px 12px",
                fontSize: 12,
                color: "#9CA3AF",
              }}
            >
              Sin resultados
            </div>
          )}

          <div
            style={{
              borderTop: "1px solid #F3F4F6",
              marginTop: 2,
              paddingTop: 2,
            }}
          >
            {adding ? (
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: "5px 8px",
                  alignItems: "center",
                }}
              >
                <input
                  ref={inputNuevoRef}
                  type="text"
                  value={nuevo}
                  onChange={(e) => setNuevo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAgregar();
                    if (e.key === "Escape") {
                      setAdding(false);
                      setNuevo("");
                    }
                  }}
                  placeholder="Nuevo valor…"
                  style={{
                    flex: 1,
                    height: 28,
                    padding: "0 8px",
                    border: "1px solid #1D4ED8",
                    borderRadius: 4,
                    fontSize: 12,
                    color: "#111827",
                    outline: "none",
                    background: "#fff",
                  }}
                />

                <button
                  type="button"
                  onClick={handleAgregar}
                  disabled={saving}
                  style={{
                    height: 28,
                    padding: "0 8px",
                    background: "#1D4ED8",
                    border: "none",
                    borderRadius: 4,
                    cursor: saving ? "wait" : "pointer",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {saving ? "…" : "✓"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setNuevo("");
                  }}
                  style={{
                    height: 28,
                    padding: "0 6px",
                    background: "#F3F4F6",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    color: "#6B7280",
                    fontSize: 13,
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  border: "none",
                  background: "transparent",
                  color: "#1D4ED8",
                  fontSize: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 14 }}>+</span> Agregar nuevo…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}