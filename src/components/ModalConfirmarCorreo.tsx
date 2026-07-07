import { useState } from "react";

interface Props {
  correoInicial: string;
  nombreDocumento: string;
  onConfirmar: (correo: string) => void;
  onCancelar: () => void;
  enviando: boolean;
}

export default function ModalConfirmarCorreo({
  correoInicial, nombreDocumento, onConfirmar, onCancelar, enviando,
}: Props) {
  const [correo, setCorreo] = useState(correoInicial || "");
  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={enviando ? undefined : onCancelar}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16,
          width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,.6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          background: "#0D0D0D", borderBottom: "2px solid #C9922A",
          padding: "18px 22px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: "#C9922A18",
            border: "1px solid #C9922A44", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18, flexShrink: 0,
          }}>
            📧
          </div>
          <div>
            <div style={{ color: "#FFF", fontSize: 14, fontWeight: 700 }}>Enviar por correo</div>
            <div style={{ color: "#666", fontSize: 10.5, marginTop: 2 }}>
              Documento: <span style={{ color: "#C9922A", fontWeight: 600 }}>{nombreDocumento}</span>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: "22px" }}>
          <label style={{
            display: "block", color: "#888", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: .5, marginBottom: 8,
          }}>
            Correo destinatario
          </label>

          <input
            type="email"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            placeholder="cliente@empresa.com"
            autoFocus
            disabled={enviando}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 10,
              background: "#0D0D0D", border: `1.5px solid ${!correoValido && correo.length > 0 ? "#EF444488" : "#2A2A2A"}`,
              color: "#EEE", fontSize: 13.5, outline: "none",
              opacity: enviando ? .6 : 1,
            }}
            onFocus={e => { e.target.style.borderColor = "#C9922A"; }}
            onBlur={e => { e.target.style.borderColor = !correoValido && correo.length > 0 ? "#EF444488" : "#2A2A2A"; }}
          />

          {!correoValido && correo.length > 0 && (
            <p style={{ marginTop: 8, color: "#EF4444", fontSize: 11.5, display: "flex", alignItems: "center", gap: 5 }}>
              ⚠ Ingresa un correo válido.
            </p>
          )}

          <p style={{ marginTop: 14, color: "#555", fontSize: 11, lineHeight: 1.5 }}>
            Se enviará el PDF adjunto a este correo. Puedes editarlo antes de confirmar.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "16px 22px", borderTop: "1px solid #222", background: "#111",
        }}>
          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            style={{
              padding: "9px 18px", borderRadius: 8, border: "1px solid #333",
              background: "transparent", color: "#999", fontSize: 12.5, fontWeight: 600,
              cursor: enviando ? "not-allowed" : "pointer", opacity: enviando ? .5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!correoValido || enviando}
            onClick={() => onConfirmar(correo.trim())}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: correoValido && !enviando ? "#C9922A" : "#C9922A33",
              color: correoValido && !enviando ? "#0D0D0D" : "#0D0D0D88",
              fontSize: 12.5, fontWeight: 700,
              cursor: correoValido && !enviando ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 6,
              transition: "background .15s",
            }}
          >
            {enviando ? (
              <>
                <span style={{
                  width: 12, height: 12, borderRadius: "50%",
                  border: "2px solid #0D0D0D55", borderTopColor: "#0D0D0D",
                  animation: "spin-correo .7s linear infinite",
                }} />
                Enviando...
              </>
            ) : "📧 Enviar correo"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin-correo { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}