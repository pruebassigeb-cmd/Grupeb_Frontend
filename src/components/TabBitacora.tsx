import { useState } from "react";
import BitacoraLocal from "./BitacoraLocal";
import BitacoraPaqueteria from "./BitacoraPaqueteria";
import BitacoraRecoleccion from "./BitacoraRecoleccion";
import BitacoraNotaRemision from "./BitacoraNotaRemision";

type Seccion = "local" | "paqueteria" | "recoleccion" | "nota_remision";

const SECCIONES: { value: Seccion; label: string }[] = [
  { value: "local", label: "Reparto Local" },
  { value: "paqueteria", label: "Paquetería" },
  { value: "recoleccion", label: "Recolección" },
  { value: "nota_remision", label: "Nota de Remisión" },
];

const COLOR_ACTIVO: Record<Seccion, string> = {
  local: "bg-blue-600 text-white",
  paqueteria: "bg-blue-600 text-white",
  recoleccion: "bg-purple-600 text-white",
  nota_remision: "bg-emerald-600 text-white",
};

export default function TabBitacora() {
  const [seccion, setSeccion] = useState<Seccion>("local");

  return (
    <div>
      {/* Selector de sección */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {SECCIONES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSeccion(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                seccion === s.value
                  ? COLOR_ACTIVO[s.value]
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-componente activo */}
      {seccion === "local" && <BitacoraLocal />}
      {seccion === "paqueteria" && <BitacoraPaqueteria />}
      {seccion === "recoleccion" && <BitacoraRecoleccion />}
      {seccion === "nota_remision" && <BitacoraNotaRemision />}
    </div>
  );
}