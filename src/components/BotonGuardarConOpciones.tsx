import { useState, useRef, useEffect } from "react";

interface Props {
  guardando: boolean;
  onEjecutar: (opciones: { imprimir: boolean; correo: boolean }) => void;
  variant?: "light" | "dark";
}

export default function BotonGuardarConOpciones({ guardando, onEjecutar, variant = "dark" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [imprimir, setImprimir] = useState(false);
  const [correo, setCorreo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const etiqueta = (() => {
    if (imprimir && correo) return "💾 Guardar, Enviar e Imprimir";
    if (correo) return "💾 Guardar y Enviar";
    if (imprimir) return "💾 Guardar e Imprimir";
    return "💾 Guardar";
  })();

  const colorFondo = variant === "dark" ? "#C9922A" : "#2563EB";
  const colorFondoHover = variant === "dark" ? "#b8811f" : "#1d4ed8";
  const colorTexto = variant === "dark" ? "#0D0D0D" : "#FFF";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        disabled={guardando}
        onClick={() => onEjecutar({ imprimir, correo })}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: "8px 0 0 8px", border: "none",
          fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
          background: guardando ? `${colorFondo}55` : colorFondo,
          color: guardando ? `${colorTexto}88` : colorTexto,
          cursor: guardando ? "not-allowed" : "pointer",
          transition: "background .15s",
        }}
        onMouseEnter={e => { if (!guardando) e.currentTarget.style.background = colorFondoHover; }}
        onMouseLeave={e => { if (!guardando) e.currentTarget.style.background = colorFondo; }}
      >
        {guardando ? "Guardando..." : etiqueta}
      </button>

      <button
        type="button"
        disabled={guardando}
        onClick={() => setAbierto(v => !v)}
        title="Más opciones"
        style={{
          padding: "8px 10px", borderRadius: "0 8px 8px 0", border: "none",
          borderLeft: "1px solid rgba(0,0,0,.25)",
          background: guardando ? `${colorFondo}55` : colorFondo,
          color: colorTexto, cursor: guardando ? "not-allowed" : "pointer",
          fontSize: 11,
        }}
      >
        ▾
      </button>

      {abierto && (
        <div
          style={{
            position: "absolute", right: 0, top: "100%", marginTop: 6, width: 230,
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.5)", zIndex: 50, padding: 6,
          }}
        >
          <label style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 10px",
            borderRadius: 8, cursor: "pointer", fontSize: 12.5, color: "#DDD",
          }}>
            <input type="checkbox" checked={imprimir} onChange={e => setImprimir(e.target.checked)} />
            🖨 Imprimir (PDF membretado)
          </label>
          <label style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 10px",
            borderRadius: 8, cursor: "pointer", fontSize: 12.5, color: "#DDD",
          }}>
            <input type="checkbox" checked={correo} onChange={e => setCorreo(e.target.checked)} />
            📧 Enviar por correo
          </label>
        </div>
      )}
    </div>
  );
}