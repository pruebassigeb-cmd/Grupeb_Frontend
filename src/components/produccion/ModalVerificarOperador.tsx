import { useState } from "react";
import api from "../../services/api";
import type { NombreProcesoPapel } from "../../types/papel/seguimientoPapel.types";
import { NOMBRES_PROCESO_PAPEL } from "../../types/papel/seguimientoPapel.types";

// ==========================
// TIPOS
// ==========================
type ProcesoPlastico = "extrusion" | "impresion" | "bolseo" | "asa_flexible";
export type Proceso = ProcesoPlastico | NombreProcesoPapel | "orden_diseno";

interface Operador {
  id:       number;
  nombre:   string;
  apellido: string;
}

interface ModalVerificarOperadorProps {
  proceso:      Proceso;
  // Requerido para todo lo que no sea "orden_diseno" — es lo que acota el
  // token de proceso a esta orden específica (ver fase 5 del plan).
  idproduccion?: number | null;
  onSuccess:    (operador: Operador, tokenProceso: string | null) => void;
  onCancel:     () => void;
}

const NOMBRE_PROCESO: Record<Proceso, string> = {
  extrusion:    "Extrusión",
  impresion:    "Impresión",
  bolseo:       "Bolseo",
  asa_flexible: "Asa Flexible",
  orden_diseno: "Orden de Diseño",
  ...NOMBRES_PROCESO_PAPEL,
};

// ==========================
// COMPONENTE
// ==========================
export default function ModalVerificarOperador({
  proceso,
  idproduccion,
  onSuccess,
  onCancel,
}: ModalVerificarOperadorProps) {
  const [correo,  setCorreo]  = useState("");
  const [codigo,  setCodigo]  = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerificar = async () => {
    setError("");

    if (!correo || !correo.includes("@")) {
      setError("Ingresa un correo válido");
      return;
    }

    if (!/^\d{5}$/.test(codigo)) {
      setError("El código debe tener exactamente 5 dígitos");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/verificar-operador", {
        correo:  correo.trim().toLowerCase(),
        codigo,
        proceso,
        idproduccion,
      });

      if (response.data.autorizado) {
        onSuccess(response.data.operador, response.data.tokenProceso ?? null);
      }
    } catch (err: any) {
      const mensaje =
        err.response?.data?.error || "Error al verificar credenciales";
      setError(mensaje);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">
            Verificar operador
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Ingresa tus credenciales para acceder a{" "}
            <span className="text-blue-400 font-medium">
              {NOMBRE_PROCESO[proceso]}
            </span>
          </p>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          {/* Correo */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value.trim().toLowerCase());
                setError("");
              }}
              placeholder="operador@grupoeb.com"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600
                         focus:border-blue-500 focus:outline-none transition-colors placeholder-slate-500"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {/* Código */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Código de acceso
            </label>
            <input
              type="password"
              value={codigo}
              inputMode="numeric"
              maxLength={5}
              onChange={(e) => {
                setCodigo(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              placeholder="5 dígitos"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600
                         focus:border-blue-500 focus:outline-none transition-colors placeholder-slate-500"
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300
                       hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleVerificar}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white
                       font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}