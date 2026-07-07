import { useState, useRef, useEffect } from "react";

interface Props {
  procesando: boolean;
  onEjecutar: (opciones: { imprimir: boolean; correo: boolean }) => void;
  variant?: "light" | "dark";
  label?: string; // texto base, ej. "PDF Pedido"
}

export default function BotonAccionesPdf({ procesando, onEjecutar, variant = "dark", label = "PDF" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [imprimir, setImprimir] = useState(true); // por defecto sí imprime, como el botón actual
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
    if (imprimir && correo) return `🖨📧 ${label}`;
    if (correo) return `📧 Enviar`;
    return `🖨 ${label}`;
  })();

  const claseBase = variant === "dark"
    ? "bg-[#C9922A] text-[#1A1A1A] hover:bg-[#b8811f]"
    : "bg-green-600 text-white hover:bg-green-700";

  return (
    <div ref={ref} className="relative inline-flex" style={{ flexShrink: 0 }}>
      <button
        type="button"
        disabled={procesando}
        onClick={() => onEjecutar({ imprimir, correo })}
        style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: "6px 0 0 6px", border: "none", cursor: procesando ? "not-allowed" : "pointer" }}
        className={`transition disabled:opacity-50 ${claseBase}`}
      >
        {procesando ? "⏳" : etiqueta}
      </button>

      <button
        type="button"
        disabled={procesando}
        onClick={() => setAbierto(v => !v)}
        style={{ fontSize: 10, padding: "6px 6px", borderRadius: "0 6px 6px 0", border: "none", borderLeft: "1px solid rgba(255,255,255,.25)", cursor: procesando ? "not-allowed" : "pointer" }}
        className={`transition disabled:opacity-50 ${claseBase}`}
        title="Más opciones"
      >
        ▾
      </button>

      {abierto && (
        <div
          style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, width: 210, background: "#1A1A1A", border: "1px solid #333", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.5)", zIndex: 50, padding: 6 }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#DDD" }}>
            <input type="checkbox" checked={imprimir} onChange={e => setImprimir(e.target.checked)} />
            🖨 Imprimir
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#DDD" }}>
            <input type="checkbox" checked={correo} onChange={e => setCorreo(e.target.checked)} />
            📧 Enviar por correo
          </label>
        </div>
      )}
    </div>
  );
}