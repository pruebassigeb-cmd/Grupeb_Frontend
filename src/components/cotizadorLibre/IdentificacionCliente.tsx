// src/components/cotizadorLibre/IdentificacionCliente.tsx
import { useState } from "react";
import {
  buscarClienteCotizadorLibre,
  enviarCodigoVerificacion,
  confirmarCodigoVerificacion,
} from "../../services/cotizadorLibre/cotizadorLibreClientes.service";
import { createClienteLigero } from "../../services/clientesService";
import type { ImpresionCliente } from "../../types/cotizadorLibre/cotizadorLibreClientes.types";

type Paso =
  | "formulario"
  | "codigo-solicitar"
  | "codigo-ingresar"
  | "completado";

interface IdentificacionClienteProps {
  abierto: boolean;
  onCerrar: () => void;
  // Se llama cuando el flujo de identificación termina — con el cliente ya
  // sea existente (verificado o no) o recién creado. El paso de GUARDAR la
  // cotización/pedido en sí (Fase 4.5) recibe este resultado y decide el
  // estado final (cotizacion/pedido normal, o en_revision si no verificó).
  // `datosContacto` trae lo que el propio usuario tecleó en el formulario —
  // útil solo para MOSTRAR en el PDF (nunca para decidir a dónde se manda
  // el correo real, eso lo resuelve el backend por clienteId). Si el
  // cliente ya existía, `correoMostrar` es la versión enmascarada, nunca
  // el correo completo.
  onCompletado: (resultado: {
    clienteId: number;
    verificado: boolean;
    datosContacto: { empresa: string; telefono: string; correoMostrar: string };
  }) => void;
}

export default function IdentificacionCliente({
  abierto,
  onCerrar,
  onCompletado,
}: IdentificacionClienteProps) {
  const [paso, setPaso] = useState<Paso>("formulario");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario inicial
  const [empresa, setEmpresa] = useState("");
  const [rfc, setRfc] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  // Resultado de la búsqueda
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [impresion, setImpresion] = useState<ImpresionCliente | null>(null);

  // Código de verificación
  const [codigo, setCodigo] = useState("");
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<{ verificado: boolean } | null>(null);

  const reiniciar = () => {
    setPaso("formulario");
    setLoading(false);
    setError(null);
    setEmpresa("");
    setRfc("");
    setTelefono("");
    setCorreo("");
    setClienteId(null);
    setImpresion(null);
    setCodigo("");
    setIntentosRestantes(null);
    setResultadoFinal(null);
  };

  // Cerrar (❌ o clic fuera) NO debe perder el progreso — si el cliente ya
  // buscó, ya le mandamos el código, o ya está por escribirlo, todo eso debe
  // seguir ahí cuando vuelva a abrir el panel. Solo se resetea de verdad
  // cuando el flujo termina con éxito (ver handleContinuar).
  const cerrarSinReiniciar = () => {
    setError(null);
    onCerrar();
  };

  const handleBuscar = async () => {
    if (!empresa && !rfc && !telefono && !correo) {
      setError("Captura al menos un dato (empresa, RFC, teléfono o correo).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resultado = await buscarClienteCotizadorLibre({
        empresa: empresa || undefined,
        rfc: rfc || undefined,
        telefono: telefono || undefined,
        correo: correo || undefined,
      });

      if (resultado.match) {
        setClienteId(resultado.cliente_id);
        setImpresion(resultado.impresion);
        setPaso("codigo-solicitar");
      } else {
        // Sin coincidencia — cliente nuevo, sin necesidad de verificar.
        const creado = await createClienteLigero({
          empresa: empresa || undefined,
          telefono: telefono || undefined,
          correo: correo || undefined,
        });
        setClienteId(creado.cliente.id);
        setResultadoFinal({ verificado: true });
        setPaso("completado");
      }
    } catch (err: any) {
      console.error("Error al buscar/crear cliente:", err);
      setError(err?.response?.data?.error || "No se pudo procesar tu información. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarCodigo = async () => {
    if (!clienteId) return;
    setLoading(true);
    setError(null);

    try {
      await enviarCodigoVerificacion(clienteId);
      setPaso("codigo-ingresar");
    } catch (err: any) {
      console.error("Error al enviar código:", err);
      setError(err?.response?.data?.error || "No se pudo enviar el código. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarCodigo = async () => {
    if (!clienteId || !codigo.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const resultado = await confirmarCodigoVerificacion(clienteId, codigo.trim());

      if (resultado.verificado) {
        setResultadoFinal({ verificado: true });
        setPaso("completado");
        return;
      }

      // No verificado — según el motivo, se puede reintentar o se cierra el
      // flujo como "en revisión" (la cotización se guarda igual más adelante).
      if (resultado.motivo === "codigo_incorrecto") {
        setIntentosRestantes(resultado.intentos_restantes ?? null);
        setError(
          `Código incorrecto${
            resultado.intentos_restantes !== undefined
              ? ` (${resultado.intentos_restantes} intento${resultado.intentos_restantes === 1 ? "" : "s"} restante${resultado.intentos_restantes === 1 ? "" : "s"})`
              : ""
          }.`
        );
      } else {
        // expirado / demasiados_intentos / sin_codigo_activo → se cierra el
        // flujo, la cotización quedará en_revision al guardarla (Fase 4.5).
        setResultadoFinal({ verificado: false });
        setPaso("completado");
      }
    } catch (err: any) {
      console.error("Error al confirmar código:", err);
      setError(err?.response?.data?.error || "No se pudo validar el código. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = () => {
    if (clienteId === null || resultadoFinal === null) return;
    onCompletado({
      clienteId,
      verificado: resultadoFinal.verificado,
      datosContacto: {
        empresa,
        telefono,
        correoMostrar: impresion?.correo_mask || correo || "",
      },
    });
    // Aquí sí se reinicia — el flujo terminó con éxito, la próxima vez que
    // se abra el panel (si acaso) debe empezar limpio, no seguir donde
    // quedó esta identificación ya usada.
    reiniciar();
    onCerrar();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={cerrarSinReiniciar}
        className={`fixed inset-0 bg-black/30 transition-opacity z-40 ${
          abierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel deslizable */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 transition-transform duration-300 flex flex-col ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2ddd0]">
          <h3 className="font-bold text-[#1e3a2b]">Identifícate para continuar</h3>
          <button onClick={cerrarSinReiniciar} className="text-[#6b6f63] hover:text-[#1e3a2b]">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* ---- PASO 1: Formulario ---- */}
          {paso === "formulario" && (
            <>
              <p className="text-sm text-[#6b6f63]">
                Cuéntanos quién eres para guardar tu cotización. Captura al menos un dato.
              </p>
              <label className="text-sm flex flex-col gap-1">
                Empresa
                <input
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="border border-[#e2ddd0] rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm flex flex-col gap-1">
                RFC
                <input
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value)}
                  className="border border-[#e2ddd0] rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm flex flex-col gap-1">
                Teléfono
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="border border-[#e2ddd0] rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm flex flex-col gap-1">
                Correo
                <input
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="border border-[#e2ddd0] rounded-lg px-3 py-2"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleBuscar}
                disabled={loading}
                className="bg-[#1e3a2b] text-white rounded-lg py-3 font-semibold disabled:opacity-50"
              >
                {loading ? "Buscando..." : "Continuar"}
              </button>
            </>
          )}

          {/* ---- PASO 2: Solicitar código ---- */}
          {paso === "codigo-solicitar" && impresion && (
            <>
              <p className="text-sm text-[#6b6f63]">
                Ya tenemos un registro con estos datos. Para confirmar que eres tú, te
                mandamos un código a:
              </p>
              <div className="bg-[#eee9db] rounded-lg px-4 py-3 text-sm font-semibold">
                {impresion.correo_mask && <div>✉️ {impresion.correo_mask}</div>}
                {impresion.telefono_mask && <div>📱 {impresion.telefono_mask}</div>}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleEnviarCodigo}
                disabled={loading}
                className="bg-[#1e3a2b] text-white rounded-lg py-3 font-semibold disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </>
          )}

          {/* ---- PASO 3: Ingresar código ---- */}
          {paso === "codigo-ingresar" && (
            <>
              <p className="text-sm text-[#6b6f63]">
                Ingresa el código de 6 dígitos que te enviamos. Es válido por 20 minutos.
              </p>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="border border-[#e2ddd0] rounded-lg px-3 py-2 text-center text-2xl tracking-widest font-bold"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleConfirmarCodigo}
                disabled={loading || codigo.length !== 6}
                className="bg-[#1e3a2b] text-white rounded-lg py-3 font-semibold disabled:opacity-50"
              >
                {loading ? "Verificando..." : "Confirmar código"}
              </button>

              <button
                onClick={handleEnviarCodigo}
                disabled={loading}
                className="text-sm text-[#6b6f63] hover:text-[#1e3a2b] underline"
              >
                Reenviar código
              </button>
            </>
          )}

          {/* ---- PASO 4: Completado ---- */}
          {paso === "completado" && resultadoFinal && (
            <>
              {resultadoFinal.verificado ? (
                <div className="bg-[#eafaf0] border border-[#3f7a52] rounded-lg px-4 py-4 text-sm text-[#1e3a2b]">
                  ✅ Todo listo, ya podemos continuar con tu cotización.
                </div>
              ) : (
                <div className="bg-[#fff8e6] border border-[#e8d38a] rounded-lg px-4 py-4 text-sm text-[#7a5c00] flex flex-col gap-2">
                  <p>
                    No pudimos verificar tu identidad a tiempo, pero tu cotización se
                    guardó de todos modos. Un asesor se pondrá en contacto contigo
                    para confirmar tus datos.
                  </p>
                  {/* ⚠️ Pendiente: mostrar aquí el teléfono/correo real de
                      contacto_empresa — falta un endpoint pequeño para
                      traerlo. Por ahora referimos al botón de ayuda. */}
                  <p className="font-semibold">
                    Si prefieres, usa el botón de ayuda para contactarnos de inmediato.
                  </p>
                </div>
              )}

              <button
                onClick={handleContinuar}
                className="bg-[#1e3a2b] text-white rounded-lg py-3 font-semibold"
              >
                Continuar
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}