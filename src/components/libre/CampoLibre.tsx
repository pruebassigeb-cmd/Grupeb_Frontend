// src/components/libre/CampoLibre.tsx
//
// Input genérico para Cotización Libre: cada campo con catálogo se
// puede "Seleccionar" (de las opciones reales) o "Escribir" (texto
// libre). Un solo componente reutilizado para material, calibre,
// laminado, textura, asa, etc. — en vez de repetir el patrón en cada
// campo del formulario.

import { useState } from "react";

export interface OpcionCampoLibre {
  id: number;
  nombre: string;
}

interface CampoLibreProps {
  label: string;
  opciones: OpcionCampoLibre[];
  valorId: number | null;
  valorTexto: string | null;
  onChange: (siguiente: { id: number | null; texto: string | null }) => void;
  placeholder?: string;
}

export default function CampoLibre({
  label,
  opciones,
  valorId,
  valorTexto,
  onChange,
  placeholder,
}: CampoLibreProps) {
  const [modo, setModo] = useState<"seleccionar" | "escribir">(
    valorTexto ? "escribir" : "seleccionar"
  );

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-700 truncate">{label}</label>
        <div className="flex items-center bg-gray-100 rounded-full p-0.5 shrink-0">
          <button
            type="button"
            title="Seleccionar del catálogo"
            onClick={() => {
              setModo("seleccionar");
              onChange({ id: valorId, texto: null });
            }}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all ${
              modo === "seleccionar" ? "bg-white text-purple-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            ▾
          </button>
          <button
            type="button"
            title="Escribir a mano"
            onClick={() => {
              setModo("escribir");
              onChange({ id: null, texto: valorTexto ?? "" });
            }}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all ${
              modo === "escribir" ? "bg-white text-purple-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            ✏️
          </button>
        </div>
      </div>

      {modo === "seleccionar" ? (
        <select
          value={valorId ?? ""}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            // Guardamos también el nombre visible junto con el id — así no
            // hace falta ningún JOIN para mostrarlo después (lista, PDF,
            // tarjeta de detalle): ya lo tenemos aquí mismo al elegirlo.
            const opcion = opciones.find((o) => o.id === id);
            onChange({ id, texto: opcion ? opcion.nombre : null });
          }}
          className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm w-full min-w-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
        >
          <option value="">— {label} —</option>
          {opciones.map((op) => (
            <option key={op.id} value={op.id}>
              {op.nombre}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={valorTexto ?? ""}
          onChange={(e) => onChange({ id: null, texto: e.target.value })}
          placeholder={placeholder ?? `Escribe ${label.toLowerCase()}`}
          className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm w-full min-w-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
        />
      )}
    </div>
  );
}
