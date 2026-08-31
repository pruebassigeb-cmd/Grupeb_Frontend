// src/components/papel/especiales/disenoEspeciales.tsx
//
// Lenguaje visual del módulo de productos especiales, en UN SOLO archivo
// (era la Fase 6 del plan: "se aplica el lenguaje visual del diseño con los
// tokens en un solo archivo").
//
// Todo lo de aquí sale del diseño que mandó el cliente: los colores se
// midieron directamente sobre las imágenes (muestreo de los iconos de
// proceso, los encabezados de las tarjetas OP y los chips), y la maqueta se
// reprodujo en HTML y se comparó contra el mockup antes de portarla a React
// — ver preview-productoespecial.html.
//
// Este archivo NO importa nada del formulario normal de papel: el módulo de
// especiales es independiente a propósito (decisión de Jose: "necesito
// módulos propios y no alimentarlo con lo que ya cuento").

import type React from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TOKENS
// ═══════════════════════════════════════════════════════════════════════════
export const T = {
  bg: "#F7F9FC",
  card: "#FFFFFF",
  border: "#E4E9F2",
  borderSoft: "#EDF1F7",
  ink: "#1B3A8F",          // texto azul principal (casi todo el diseño es azul)
  inkStrong: "#142E75",    // títulos y valores
  inkSoft: "#4A66B4",      // texto secundario / descripciones
  muted: "#7C8DB5",
  primary: "#1D4ED8",
  danger: "#DC2626",
  green: "#16A34A",
  greenDeep: "#15803D",
  greenBg: "#E7F5EC",
  greenBorder: "#9AD3B4",
  orange: "#F59220",
  orangeText: "#C2710C",
  orangeBg: "#FEF3E2",
  orangeBorder: "#F7C182",
  blueBg: "#EAF2FC",
  purple: "#6C4FC7",
  purpleBg: "#F1EDF8",
  purpleText: "#4B2E9E",
  dash: "#A9BADB",
  radius: 10,
  radiusLg: 14,
  shadow: "0 1px 2px rgba(21,42,102,.05)",
  font: "'Poppins','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// COLOR POR PROCESO
// ═══════════════════════════════════════════════════════════════════════════
// El diseño le da un color a cada proceso. Los nombres del mockup son los
// "ideales" del cliente (Impresión Offset, Armado / Pegado...); aquí se usan
// los nombres REALES de proceso_cat que ya existen en la base — ver
// NOMBRE_PROCESO_CAT_PAPEL en procesosPapel.controller.ts — para no inventar
// catálogo. Cualquier proceso que no esté en el mapa cae al color neutro.
export const COLOR_POR_PROCESO: Record<string, string> = {
  "Hojeado": "#6C4FC7",
  "Guillotina": "#4A79C9",
  "Impresión Papel": "#1D5DB8",
  "Laminación": "#F59220",
  "Barniz UV Papel": "#3A3F4A",
  "Hot Stamping": "#D98324",
  "Texturizado": "#A2571F",
  "Alto Relieve": "#3A3F4A",
  "Suaje Papel": "#15803D",
  "Armado": "#EC4989",
  "Empaque Papel": "#F0629B",
  "Litolaminado": "#16A34A",
  "Almacén / Despacho": "#3A3F4A",
};

export const colorProceso = (nombre: string): string =>
  COLOR_POR_PROCESO[nombre] ?? "#64748B";

// Color por material — el diseño numera los materiales M1, M2, M3... con un
// badge de color. Se asigna por posición, ciclando si hubiera más de 6.
export const COLORES_MATERIAL = ["#1D5DB8", "#6C4FC7", "#15803D", "#F59220", "#EC4989", "#3A3F4A"];
export const colorMaterial = (indice: number): string =>
  COLORES_MATERIAL[indice % COLORES_MATERIAL.length];

// Paleta por tipo de componente (encabezado de la tarjeta OP y su chip).
// 'inicio' alterna azul/lavanda según su posición, igual que en el mockup
// (OP DE INICIO 1 azul, OP DE INICIO 2 lavanda).
export interface PaletaOP {
  headBg: string;
  headText: string;
  chipBg: string;
  chipText: string;
  punto: string;
}

export const paletaOP = (tipo: "unica" | "inicio" | "union", indiceInicio = 0): PaletaOP => {
  if (tipo === "union") {
    return { headBg: T.greenBg, headText: T.greenDeep, chipBg: "#DCF2E4", chipText: T.greenDeep, punto: T.greenDeep };
  }
  if (tipo === "unica") {
    return { headBg: T.greenBg, headText: T.greenDeep, chipBg: "#DCF2E4", chipText: T.greenDeep, punto: T.greenDeep };
  }
  const par = indiceInicio % 2 === 1;
  return par
    ? { headBg: T.purpleBg, headText: T.purpleText, chipBg: "#EAE2F6", chipText: T.purple, punto: T.purple }
    : { headBg: T.blueBg, headText: T.inkStrong, chipBg: "#DCE8F8", chipText: T.primary, punto: "#1D5DB8" };
};

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVOS DE UI
// ═══════════════════════════════════════════════════════════════════════════
export function Etiqueta({ children, requerido }: { children: React.ReactNode; requerido?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
      {children}{requerido && <span style={{ color: T.danger, marginLeft: 2 }}>*</span>}
    </label>
  );
}

export function Campo({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ minWidth: 0, ...style }}>{children}</div>;
}

const baseControl: React.CSSProperties = {
  width: "100%", height: 42, padding: "0 13px",
  border: `1px solid ${T.border}`, borderRadius: 9, background: "#fff",
  fontSize: 13.5, fontWeight: 500, color: T.inkStrong,
  fontFamily: "inherit", outline: "none", boxShadow: T.shadow, boxSizing: "border-box",
};

export function Entrada({ value, onChange, readOnly, placeholder, style }: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type="text" value={value} readOnly={readOnly} placeholder={placeholder}
      onChange={e => onChange?.(e.target.value)}
      style={{
        ...baseControl,
        background: readOnly ? "#F5F7FB" : "#fff",
        color: readOnly ? T.inkSoft : T.inkStrong,
        ...style,
      }}
    />
  );
}

const FLECHA_SELECT =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%231D4ED8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")";

export function Selector({ value, onChange, children, style, disabled }: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <select
      value={value} disabled={disabled}
      onChange={e => onChange(e.target.value)}
      style={{
        ...baseControl,
        appearance: "none",
        backgroundImage: FLECHA_SELECT,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 34,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </select>
  );
}

export function Boton({ children, onClick, variante = "normal", disabled, title, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  variante?: "normal" | "primario";
  disabled?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  const primario = variante === "primario";
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={title}
      style={{
        height: 38, padding: "0 16px", borderRadius: 9,
        fontSize: 13, fontWeight: 600, fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 7,
        border: `1px solid ${primario ? T.primary : T.border}`,
        background: disabled ? "#F1F4F9" : primario ? T.primary : "#fff",
        color: disabled ? T.muted : primario ? "#fff" : T.ink,
        boxShadow: T.shadow, whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Tarjeta({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
      boxShadow: T.shadow, padding: "18px 20px", marginBottom: 16, ...style,
    }}>
      {children}
    </div>
  );
}

export function TituloSeccion({ titulo, subtitulo, mayusculas = true, accion }: {
  titulo: string;
  subtitulo?: string;
  mayusculas?: boolean;
  accion?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: subtitulo ? 16 : 12 }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{
          fontSize: mayusculas ? 14 : 15, fontWeight: 700, margin: "0 0 3px", color: T.inkStrong,
          letterSpacing: mayusculas ? "0.03em" : 0,
          textTransform: mayusculas ? "uppercase" : "none",
        }}>{titulo}</h2>
        {subtitulo && <p style={{ fontSize: 12.5, color: T.inkSoft, margin: 0, fontWeight: 400 }}>{subtitulo}</p>}
      </div>
      {accion && <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>{accion}</div>}
    </div>
  );
}

export function Chip({ texto, bg, color }: { texto: string; bg: string; color: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "5px 11px", borderRadius: 7,
      fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", background: bg, color,
    }}>{texto}</span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ICONOS (SVG en línea — sin dependencias nuevas)
// ═══════════════════════════════════════════════════════════════════════════
type IcoProps = { size?: number; color?: string; ancho?: number };

export const IcoProceso = ({ size = 15 }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.7}>
    <rect x="6" y="3" width="12" height="18" rx="3" />
    <path d="M10 8h4" strokeLinecap="round" />
  </svg>
);

export const IcoCadena = ({ size = 34, color = T.inkStrong }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
    <path d="M10.6 13.4a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.7 1.7" />
    <path d="M13.4 10.6a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.7-1.7" />
  </svg>
);

export const IcoRamificar = ({ size = 34, color = T.inkStrong }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
    <circle cx="18" cy="6" r="2.6" /><circle cx="18" cy="18" r="2.6" /><circle cx="5.5" cy="12" r="2.6" />
    <path d="M8.1 10.8l7.4-3.6M8.1 13.2l7.4 3.6" />
  </svg>
);

export const IcoPalomita = ({ size = 13, color = "#fff", ancho = 3.4 }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 12.5 10 17.5 19 7" />
  </svg>
);

export const IcoBote = ({ size = 15, color = "currentColor" }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IcoLista = ({ size = 15, color = "currentColor" }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

export const IcoLapiz = ({ size = 17, color = T.primary }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const IcoAgarre = ({ color = "#C3CEE4" }: IcoProps) => (
  <svg width={9} height={15} viewBox="0 0 6 16" fill={color}>
    <circle cx="1.5" cy="2" r="1.3" /><circle cx="4.5" cy="2" r="1.3" />
    <circle cx="1.5" cy="8" r="1.3" /><circle cx="4.5" cy="8" r="1.3" />
    <circle cx="1.5" cy="14" r="1.3" /><circle cx="4.5" cy="14" r="1.3" />
  </svg>
);

export const IcoFlecha = ({ ancho = 34, color = T.inkStrong }: IcoProps) => (
  <svg width={ancho} height={20} viewBox="0 0 34 20" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 10h30" /><path d="M25 4l6 6-6 6" />
  </svg>
);

export const IcoGuardar = ({ size = 15, color = "currentColor" }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);

export const IcoCheckCirculo = ({ size = 15, color = "currentColor" }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="8 12.5 11 15.5 16 9.5" />
  </svg>
);

// Caja de línea del recuadro "PRODUCTO TERMINADO" del diseño.
export const IlustracionCaja = () => (
  <svg width={112} height={76} viewBox="0 0 112 76" fill="none" stroke="#22377F" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
    <path d="M18 32 L54 22 L94 33 L58 44 Z" />
    <path d="M18 32 V60 L58 72 V44" />
    <path d="M94 33 V61 L58 72" />
    <path d="M54 22 L60 6 L86 14 L94 33" />
    <path d="M18 32 L24 14 L54 22" />
  </svg>
);

// Cuadrito de color con el glifo del proceso.
export function IconoProcesoCuadro({ nombre, size = 29 }: { nombre: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 8, display: "grid", placeItems: "center",
      flexShrink: 0, background: colorProceso(nombre),
    }}>
      <IcoProceso size={Math.round(size * 0.52)} />
    </span>
  );
}

// Círculo verde con palomita (estado "seleccionado" / "cumple").
export function Palomita({ size = 22 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", background: T.green,
      display: "grid", placeItems: "center", flexShrink: 0,
    }}>
      <IcoPalomita size={Math.round(size * 0.58)} />
    </span>
  );
}