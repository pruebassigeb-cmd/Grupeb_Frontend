interface Props {
  procesando: boolean;
  onEjecutar: (opciones: { imprimir: boolean; correo: boolean }) => void;
}

const BOTON: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #C9922A55",
  color: "#C9922A",
  fontSize: 11,
  fontWeight: 700,
  padding: "8px 10px",
  borderRadius: 6,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

export default function BotonAccionesPdf({ procesando, onEjecutar }: Props) {
  const ejecutar = (imprimir: boolean, correo: boolean) => {
    if (procesando) return;
    onEjecutar({ imprimir, correo });
  };

  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
      <button
        type="button"
        disabled={procesando}
        onClick={() => ejecutar(true, false)}
        title="Generar e imprimir/descargar el PDF"
        style={{ ...BOTON, cursor: procesando ? "not-allowed" : "pointer", opacity: procesando ? .5 : 1 }}
      >
        {procesando ? "⏳" : "🖨 Imprimir"}
      </button>

      <button
        type="button"
        disabled={procesando}
        onClick={() => ejecutar(false, true)}
        title="Enviar el PDF por correo"
        style={{ ...BOTON, cursor: procesando ? "not-allowed" : "pointer", opacity: procesando ? .5 : 1 }}
      >
        {procesando ? "⏳" : "📧 Enviar"}
      </button>

      <button
        type="button"
        disabled={procesando}
        onClick={() => ejecutar(true, true)}
        title="Generar el PDF y enviarlo por correo"
        style={{ ...BOTON, cursor: procesando ? "not-allowed" : "pointer", opacity: procesando ? .5 : 1 }}
      >
        {procesando ? "⏳" : "🖨📧 Ambos"}
      </button>
    </div>
  );
}
