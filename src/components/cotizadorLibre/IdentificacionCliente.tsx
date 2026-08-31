// src/components/cotizadorLibre/IdentificacionCliente.tsx
import { useEffect, useState } from "react";
import { showAlert } from "../CustomAlert";
import {
  buscarClienteCotizadorLibre,
  enviarCodigoVerificacion,
  confirmarCodigoVerificacion,
  buscarClientesInterno,
  buscarClientesExactoInterno,
} from "../../services/cotizadorLibre/cotizadorLibreClientes.service";
import { createClienteLigero } from "../../services/clientesService";
import type {
  ImpresionCliente,
  ClienteBusquedaInterno,
} from "../../types/cotizadorLibre/cotizadorLibreClientes.types";

type Paso =
  | "buscar-interno" // ✅ NUEVO — solo para uso interno (esInterno=true)
  | "formulario"
  | "confirmar-existente" // ✅ NUEVO — solo interno: candidatos reales encontrados por coincidencia exacta
  | "codigo-solicitar"
  | "codigo-ingresar"
  | "completado";

interface IdentificacionClienteProps {
  abierto: boolean;
  // ✅ NUEVO — true cuando lo usa staff interno (no la cuenta compartida del
  // cliente externo). Cambia el flujo por completo: en vez de un formulario
  // + verificación por código, arranca con un buscador del catálogo real de
  // clientes; si no lo encuentra, cae al mismo formulario de registro pero
  // sin pedir código (el staff ya es de confianza).
  esInterno: boolean;
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
  esInterno,
  onCerrar,
  onCompletado,
}: IdentificacionClienteProps) {
  const [paso, setPaso] = useState<Paso>(esInterno ? "buscar-interno" : "formulario");
  const [loading, setLoading] = useState(false);

  // ── Búsqueda interna (solo esInterno) ───────────────────────────────────
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ClienteBusquedaInterno[]>([]);
  const [buscandoInterno, setBuscandoInterno] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  // ✅ NUEVO — candidatos reales encontrados por coincidencia exacta
  // (correo/teléfono/RFC/empresa) al registrar un cliente nuevo en modo
  // interno — para poder confirmar/elegir en vez de crear un duplicado.
  const [candidatosExistentes, setCandidatosExistentes] = useState<ClienteBusquedaInterno[]>([]);

  // ── Formulario — 9 campos base (antes solo eran 4: empresa/rfc/
  // teléfono/correo). Son los indispensables para que la cotización o el
  // pedido salgan completos en cuanto a datos del cliente. `rfc` aquí se
  // guarda como clientes.rfc_rs — ya no se toca datos_facturacion desde
  // este flujo ligero.
  const [empresa, setEmpresa] = useState("");
  const [rfc, setRfc] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [atencion, setAtencion] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [cpRs, setCpRs] = useState("");
  const [impresionDoc, setImpresionDoc] = useState("");
  const [celular, setCelular] = useState("");

  // Resultado de la búsqueda (flujo externo — fuzzy match + verificación)
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [impresionMask, setImpresionMask] = useState<ImpresionCliente | null>(null);

  // Código de verificación
  const [codigo, setCodigo] = useState("");
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<{ verificado: boolean } | null>(null);

  const reiniciar = () => {
    setPaso(esInterno ? "buscar-interno" : "formulario");
    setLoading(false);
    setTerminoBusqueda("");
    setResultadosBusqueda([]);
    setBuscandoInterno(false);
    setBusquedaRealizada(false);
    setCandidatosExistentes([]);
    setEmpresa("");
    setRfc("");
    setTelefono("");
    setCorreo("");
    setAtencion("");
    setRazonSocial("");
    setCpRs("");
    setImpresionDoc("");
    setCelular("");
    setClienteId(null);
    setImpresionMask(null);
    setCodigo("");
    setIntentosRestantes(null);
    setResultadoFinal(null);
  };

  // Cerrar (❌ o clic fuera) NO debe perder el progreso — si el cliente ya
  // buscó, ya le mandamos el código, o ya está por escribirlo, todo eso debe
  // seguir ahí cuando vuelva a abrir el panel. Solo se resetea de verdad
  // cuando el flujo termina con éxito (ver handleContinuar).
  const cerrarSinReiniciar = () => {
    onCerrar();
  };

  // ── Búsqueda interna con debounce — solo corre en modo interno y en el
  // paso correspondiente, para no disparar peticiones de más.
  useEffect(() => {
    if (!esInterno || paso !== "buscar-interno") return;

    if (terminoBusqueda.trim() === "") {
      setResultadosBusqueda([]);
      setBusquedaRealizada(false);
      return;
    }

    setBuscandoInterno(true);
    const timeout = setTimeout(async () => {
      try {
        const resultados = await buscarClientesInterno(terminoBusqueda.trim());
        setResultadosBusqueda(resultados);
      } catch (err) {
        console.error("Error al buscar clientes:", err);
        setResultadosBusqueda([]);
      } finally {
        setBuscandoInterno(false);
        setBusquedaRealizada(true);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [terminoBusqueda, esInterno, paso]);

  const handleSeleccionarClienteInterno = (cliente: ClienteBusquedaInterno) => {
    // Staff interno seleccionando un cliente real del catálogo — se
    // considera verificado de inmediato, sin código por correo.
    onCompletado({
      clienteId: cliente.idclientes,
      verificado: true,
      datosContacto: {
        empresa: cliente.empresa || "",
        telefono: cliente.telefono || cliente.celular || "",
        correoMostrar: cliente.correo || "",
      },
    });
    reiniciar();
    onCerrar();
  };

  const handleBuscar = async () => {
    if (!empresa && !rfc && !telefono && !correo && !atencion) {
      showAlert("Captura al menos un dato.");
      return;
    }

    setLoading(true);

    try {
      if (esInterno) {
        // Búsqueda exacta SIN enmascarar (staff de confianza) — muestra los
        // datos reales para que el usuario confirme/elija, en vez de crear
        // un duplicado silenciosamente si el correo/teléfono/RFC ya
        // pertenece a otro cliente.
        const candidatos = await buscarClientesExactoInterno({
          empresa: empresa || undefined,
          rfc: rfc || undefined,
          telefono: telefono || undefined,
          correo: correo || undefined,
        });

        if (candidatos.length > 0) {
          setCandidatosExistentes(candidatos);
          setPaso("confirmar-existente");
          return;
        }

        // Sin coincidencias — cliente nuevo, sin necesidad de verificar.
        const creado = await createClienteLigero({
          empresa: empresa || undefined,
          telefono: telefono || undefined,
          correo: correo || undefined,
          atencion: atencion || undefined,
          razon_social: razonSocial || undefined,
          rfc_rs: rfc || undefined,
          cp_rs: cpRs || undefined,
          impresion: impresionDoc || undefined,
          celular: celular || undefined,
        });
        setClienteId(creado.cliente.id);
        setResultadoFinal({ verificado: true });
        setPaso("completado");
        return;
      }

      // Externo — fuzzy match enmascarado + verificación por código, sin cambios.
      const resultado = await buscarClienteCotizadorLibre({
        empresa: empresa || undefined,
        rfc: rfc || undefined,
        telefono: telefono || undefined,
        correo: correo || undefined,
      });

      if (resultado.match) {
        setClienteId(resultado.cliente_id);
        setImpresionMask(resultado.impresion);
        setPaso("codigo-solicitar");
        return;
      }

      // Sin coincidencia — cliente nuevo, sin necesidad de verificar.
      const creado = await createClienteLigero({
        empresa: empresa || undefined,
        telefono: telefono || undefined,
        correo: correo || undefined,
        atencion: atencion || undefined,
        razon_social: razonSocial || undefined,
        rfc_rs: rfc || undefined,
        cp_rs: cpRs || undefined,
        impresion: impresionDoc || undefined,
        celular: celular || undefined,
      });
      setClienteId(creado.cliente.id);
      setResultadoFinal({ verificado: true });
      setPaso("completado");
    } catch (err: any) {
      console.error("Error al buscar/crear cliente:", err);
      showAlert(err?.response?.data?.error || "No se pudo procesar tu información. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Staff eligió uno de los candidatos existentes — se usa ese cliente
  // directo, verificado (ya se confirmó visualmente que es el correcto).
  const handleSeleccionarCandidatoExistente = (cliente: ClienteBusquedaInterno) => {
    onCompletado({
      clienteId: cliente.idclientes,
      verificado: true,
      datosContacto: {
        empresa: cliente.empresa || "",
        telefono: cliente.telefono || cliente.celular || "",
        correoMostrar: cliente.correo || "",
      },
    });
    reiniciar();
    onCerrar();
  };

  // Staff confirmó que ninguno de los candidatos es el cliente correcto —
  // ahora sí se crea uno nuevo con los datos ya capturados en el formulario.
  const handleNingunoEsElCliente = async () => {
    setLoading(true);
    try {
      const creado = await createClienteLigero({
        empresa: empresa || undefined,
        telefono: telefono || undefined,
        correo: correo || undefined,
        atencion: atencion || undefined,
        razon_social: razonSocial || undefined,
        rfc_rs: rfc || undefined,
        cp_rs: cpRs || undefined,
        impresion: impresionDoc || undefined,
        celular: celular || undefined,
      });
      setClienteId(creado.cliente.id);
      setResultadoFinal({ verificado: true });
      setCandidatosExistentes([]);
      setPaso("completado");
    } catch (err: any) {
      console.error("Error al crear cliente:", err);
      showAlert(err?.response?.data?.error || "No se pudo crear el cliente. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarCodigo = async () => {
    if (!clienteId) return;
    setLoading(true);

    try {
      await enviarCodigoVerificacion(clienteId);
      setPaso("codigo-ingresar");
    } catch (err: any) {
      console.error("Error al enviar código:", err);
      showAlert(err?.response?.data?.error || "No se pudo enviar el código. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarCodigo = async () => {
    if (!clienteId || !codigo.trim()) return;
    setLoading(true);

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
        showAlert(
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
      showAlert(err?.response?.data?.error || "No se pudo validar el código. Intenta de nuevo.");
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
        correoMostrar: impresionMask?.correo_mask || correo || "",
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
          <h3 className="font-bold text-[#1e3a2b]">
            {paso === "buscar-interno" ? "Buscar cliente" : "Identifícate para continuar"}
          </h3>
          <button onClick={cerrarSinReiniciar} className="text-[#6b6f63] hover:text-[#1e3a2b]">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* ---- PASO 0 (solo interno): Buscar cliente existente ---- */}
          {paso === "buscar-interno" && (
            <>
              <p className="text-sm text-[#6b6f63]">
                Busca al cliente por nombre, empresa, teléfono o correo.
              </p>
              <input
                autoFocus
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar cliente..."
                className="border border-[#e2ddd0] rounded-lg px-3 py-2"
              />

              {buscandoInterno && <p className="text-sm text-[#6b6f63]">Buscando...</p>}

              {!buscandoInterno && resultadosBusqueda.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto">
                  {resultadosBusqueda.map((c) => (
                    <button
                      key={c.idclientes}
                      onClick={() => handleSeleccionarClienteInterno(c)}
                      className="text-left border border-[#e2ddd0] rounded-lg px-3 py-2.5 hover:border-[#1e3a2b] hover:bg-[#f7f4ee] transition-colors"
                    >
                      <p className="text-sm font-semibold text-[#1e3a2b]">
                        {c.empresa || c.atencion || `Cliente #${c.idclientes}`}
                      </p>
                      <p className="text-xs text-[#6b6f63]">
                        {[c.atencion, c.correo, c.telefono || c.celular].filter(Boolean).join(" · ")}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {!buscandoInterno && busquedaRealizada && resultadosBusqueda.length === 0 && (
                <p className="text-sm text-[#6b6f63]">No se encontraron clientes con ese criterio.</p>
              )}

              <button
                onClick={() => setPaso("formulario")}
                className="text-sm text-[#1e3a2b] hover:underline font-semibold text-left mt-2"
              >
                + No lo encuentro, registrar cliente nuevo
              </button>
            </>
          )}

          {/* ---- PASO 1: Formulario (9 campos base) ---- */}
          {paso === "formulario" && (
            <>
              {esInterno ? (
                <button
                  onClick={() => setPaso("buscar-interno")}
                  className="text-sm text-[#1e3a2b] hover:underline font-semibold text-left"
                >
                  ← Volver a buscar
                </button>
              ) : (
                <p className="text-sm text-[#6b6f63]">
                  Cuéntanos quién eres para guardar tu cotización. Captura al menos un dato.
                </p>
              )}

              <label className="text-sm flex flex-col gap-1">
                Empresa
                <input
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="border border-[#e2ddd0] rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm flex flex-col gap-1">
                Razón social
                <input
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
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
                Atención (nombre de contacto)
                <input
                  value={atencion}
                  onChange={(e) => setAtencion(e.target.value)}
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
                Celular
                <input
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
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
              <label className="text-sm flex flex-col gap-1">
                Código postal
                <input
                  value={cpRs}
                  onChange={(e) => setCpRs(e.target.value)}
                  className="border border-[#e2ddd0] rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm flex flex-col gap-1">
                Impresión
                <input
                  value={impresionDoc}
                  onChange={(e) => setImpresionDoc(e.target.value)}
                  className="border border-[#e2ddd0] rounded-lg px-3 py-2"
                />
              </label>

              <button
                onClick={handleBuscar}
                disabled={loading}
                className="bg-[#1e3a2b] text-white rounded-lg py-3 font-semibold disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Continuar"}
              </button>
            </>
          )}

          {/* ---- PASO 1.5 (solo interno): Confirmar cliente existente ---- */}
          {paso === "confirmar-existente" && (
            <>
              <button
                onClick={() => {
                  setCandidatosExistentes([]);
                  setPaso("formulario");
                }}
                className="text-sm text-[#1e3a2b] hover:underline font-semibold text-left"
              >
                ← Volver a editar datos
              </button>

              <p className="text-sm text-[#6b6f63]">
                {candidatosExistentes.length === 1
                  ? "Encontramos un cliente con datos similares. ¿Es este?"
                  : "Encontramos estos clientes con datos similares. ¿Es alguno de estos?"}
              </p>
              <div className="flex flex-col gap-1.5">
                {candidatosExistentes.map((c) => (
                  <button
                    key={c.idclientes}
                    onClick={() => handleSeleccionarCandidatoExistente(c)}
                    className="text-left border border-[#e2ddd0] rounded-lg px-3 py-2.5 hover:border-[#1e3a2b] hover:bg-[#f7f4ee] transition-colors"
                  >
                    <p className="text-sm font-semibold text-[#1e3a2b]">
                      {c.empresa || c.atencion || `Cliente #${c.idclientes}`}
                    </p>
                    <p className="text-xs text-[#6b6f63]">
                      {[c.atencion, c.correo, c.telefono || c.celular].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleNingunoEsElCliente}
                disabled={loading}
                className="text-sm text-[#1e3a2b] hover:underline font-semibold text-left mt-2 disabled:opacity-50"
              >
                {loading ? "Creando..." : "Ninguno es — crear cliente nuevo"}
              </button>
            </>
          )}

          {/* ---- PASO 2: Solicitar código ---- */}
          {paso === "codigo-solicitar" && impresionMask && (
            <>
              <button
                onClick={() => setPaso("formulario")}
                className="text-sm text-[#1e3a2b] hover:underline font-semibold text-left"
              >
                ← Volver
              </button>

              <p className="text-sm text-[#6b6f63]">
                Ya tenemos un registro con estos datos. Para confirmar que eres tú, te
                mandamos un código a:
              </p>
              <div className="bg-[#eee9db] rounded-lg px-4 py-3 text-sm font-semibold">
                {impresionMask.correo_mask && <div>✉️ {impresionMask.correo_mask}</div>}
                {impresionMask.telefono_mask && <div>📱 {impresionMask.telefono_mask}</div>}
              </div>


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
              <button
                onClick={() => {
                  setCodigo("");
                  setIntentosRestantes(null);
                  setPaso("codigo-solicitar");
                }}
                className="text-sm text-[#1e3a2b] hover:underline font-semibold text-left"
              >
                ← Volver
              </button>

              <p className="text-sm text-[#6b6f63]">
                Ingresa el código de 6 dígitos que te enviamos. Es válido por 20 minutos.
              </p>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="border border-[#e2ddd0] rounded-lg px-3 py-2 text-center text-2xl tracking-widest font-bold"
              />


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