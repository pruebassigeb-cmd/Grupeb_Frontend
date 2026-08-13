// src/pages/papel/MermaPapel.tsx
// ═══════════════════════════════════════════════════════════════════════════
// Matriz de merma de papel. Filas = escalones de cantidad, columnas =
// conceptos que aportan merma. Diseño sobrio a propósito (patrón de
// PrecioPlastico.tsx), con la estructura de PreciosAcabadosPapel.tsx.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../../layouts/Sidebar";
import BotonAuditoria from "../../components/auditoria/BotonAuditoria";
import { showAlert } from "../../components/CustomAlert";
import {
  createEscalaMerma,
  getMatrizMerma,
  simularMerma,
  toggleEscalaMerma,
  updateMatrizMerma,
} from "../../services/papel/mermaPapel.service";
import type {
  CeldaMermaPayload,
  FilaMerma,
  MatrizMermaResponse,
  SimulacionMerma,
} from "../../types/papel/merma.types";
import {
  leerBorrador,
  limpiarBorrador,
  useAutoguardarBorrador,
} from "../../hooks/useBorradorFormulario";

const CLAVE_BORRADOR = "merma-papel";

/** Texto por celda: clave = `${idEscala}:${idProceso}` */
type TextoMap = Record<string, string>;

export default function MermaPapel() {
  const [matriz, setMatriz] = useState<MatrizMermaResponse | null>(null);
  const [textos, setTextos] = useState<TextoMap>({});
  const [textosBackup, setTextosBackup] = useState<TextoMap>({});

  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const [cantidadSimular, setCantidadSimular] = useState("");
  const [simulacion, setSimulacion] = useState<SimulacionMerma | null>(null);
  const [simulando, setSimulando] = useState(false);

  const borradorAplicado = useRef(false);
  useAutoguardarBorrador(CLAVE_BORRADOR, textos, editando);

  const construirTextos = (data: MatrizMermaResponse): TextoMap => {
    const map: TextoMap = {};
    data.filas.forEach((fila) => {
      data.procesos.forEach((proceso) => {
        const celda = fila.celdas[String(proceso.id)];
        map[`${fila.idEscala}:${proceso.id}`] =
          celda?.piezas == null ? "" : String(celda.piezas);
      });
    });
    return map;
  };

  const cargarMatriz = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMatrizMerma();
      setMatriz(data);

      const siguiente = construirTextos(data);

      if (!borradorAplicado.current) {
        borradorAplicado.current = true;
        const borrador = leerBorrador<TextoMap>(CLAVE_BORRADOR);
        if (borrador) {
          setTextosBackup(siguiente);
          setTextos(borrador);
          setEditando(true);
          return;
        }
      }

      setTextos(siguiente);
    } catch (err: any) {
      showAlert(err?.response?.data?.error || "No se pudo cargar la matriz de merma");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarMatriz();
  }, [cargarMatriz]);

  const resumen = useMemo(() => {
    if (!matriz) return { escalasActivas: 0, conceptosActivos: 0, celdasCapturadas: 0 };
    return {
      escalasActivas: matriz.escalas.filter((e) => e.activo).length,
      conceptosActivos: matriz.procesos.filter((p) => p.activo && !p.inerte).length,
      celdasCapturadas: Object.values(textos).filter((v) => v.trim() !== "").length,
    };
  }, [matriz, textos]);

  // ── Edición ─────────────────────────────────────────────────────────────
  const actualizarTexto = (idEscala: number, idProceso: number, valor: string) => {
    // Piezas: enteros, sin decimales ni signos.
    if (!/^\d*$/.test(valor)) return;
    setTextos((prev) => ({ ...prev, [`${idEscala}:${idProceso}`]: valor }));
  };

  const iniciarEdicion = () => {
    setTextosBackup({ ...textos });
    setEditando(true);
  };

  const cancelarCambios = () => {
    setTextos(textosBackup);
    setEditando(false);
    setMostrarConfirmacion(false);
    limpiarBorrador(CLAVE_BORRADOR);
  };

  const confirmarCambios = async () => {
    if (!matriz) return;
    setGuardando(true);
    try {
      const celdas: CeldaMermaPayload[] = matriz.filas.flatMap((fila) =>
        matriz.procesos.map((proceso) => {
          const valor = textos[`${fila.idEscala}:${proceso.id}`] ?? "";
          return {
            idProceso: proceso.id,
            idEscala: fila.idEscala,
            piezas: valor.trim() === "" ? null : Number(valor),
          };
        })
      );

      const resultado = await updateMatrizMerma(celdas);

      setEditando(false);
      setMostrarConfirmacion(false);
      limpiarBorrador(CLAVE_BORRADOR);
      await cargarMatriz();
      showAlert(`${resultado.message}. Celdas procesadas: ${resultado.actualizadas}.`);
    } catch (err: any) {
      showAlert(err?.response?.data?.error || "No se pudo guardar la matriz de merma");
    } finally {
      setGuardando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && editando) setMostrarConfirmacion(true);
  };

  // ── Escalas ─────────────────────────────────────────────────────────────
  const agregarEscala = async () => {
    const valor = window.prompt("Nueva cantidad (piezas):");
    if (valor === null) return;

    const cantidad = Number(valor.replace(/,/g, "").trim());
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      showAlert("La cantidad debe ser un entero mayor que cero.");
      return;
    }

    try {
      await createEscalaMerma(cantidad);
      await cargarMatriz();
      showAlert(`Escala de ${cantidad} piezas creada.`);
    } catch (err: any) {
      showAlert(err?.response?.data?.error || "No se pudo crear la escala");
    }
  };

  const cambiarEstadoEscala = async (fila: FilaMerma) => {
    try {
      await toggleEscalaMerma(fila.idEscala, !fila.activo);
      await cargarMatriz();
    } catch (err: any) {
      showAlert(err?.response?.data?.error || "No se pudo cambiar el estado");
    }
  };

  // ── Simulador ───────────────────────────────────────────────────────────
  const ejecutarSimulacion = async () => {
    const cantidad = Number(cantidadSimular);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      showAlert("Escribe una cantidad válida para simular.");
      return;
    }

    setSimulando(true);
    try {
      // Sin procesos: muestra el escalón resuelto y solo la merma base.
      setSimulacion(await simularMerma(cantidad));
    } catch (err: any) {
      showAlert(err?.response?.data?.error || "No se pudo simular");
    } finally {
      setSimulando(false);
    }
  };

  if (loading) {
    return (
      <Dashboard>
        <div className="flex h-96 items-center justify-center">
          <p className="text-gray-500">Cargando matriz de merma...</p>
        </div>
      </Dashboard>
    );
  }

  if (!matriz) {
    return (
      <Dashboard>
        <div className="flex h-96 items-center justify-center">
          <p className="text-gray-500">No hay datos de merma disponibles.</p>
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      <h1 className="mb-2 text-2xl font-bold">Merma de Producción - Papel</h1>
      <p className="mb-6 text-sm text-gray-600">
        Piezas adicionales que se producen para absorber el margen de error y poder
        entregar completo el pedido. Los valores son <strong>piezas</strong>, no
        porcentajes.
      </p>

      {/* ── Tabla ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Matriz de merma</h2>
            <p className="text-xs text-gray-500">
              {resumen.escalasActivas} escalas activas · {resumen.conceptosActivos}{" "}
              conceptos con efecto · {resumen.celdasCapturadas} celdas capturadas
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={agregarEscala}
              disabled={editando || guardando}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Agregar escala
            </button>

            {editando && (
              <button
                onClick={cancelarCambios}
                disabled={guardando}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
            )}

            <button
              onClick={() => (editando ? setMostrarConfirmacion(true) : iniciarEdicion())}
              disabled={guardando}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                editando ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Modificar merma"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border px-3 py-2 text-left">Cantidad</th>
                {matriz.procesos.map((proceso) => (
                  <th key={proceso.id} className="border px-3 py-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{proceso.nombre.replace(/^Merma /, "")}</span>
                      {proceso.siempre_aplica && (
                        <span className="text-[10px] font-normal text-blue-100">
                          siempre aplica
                        </span>
                      )}
                      {proceso.inerte && (
                        <span className="text-[10px] font-normal text-amber-200">
                          sin efecto aún
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="border px-3 py-2">Estado</th>
              </tr>
            </thead>

            <tbody>
              {matriz.filas.map((fila) => (
                <tr
                  key={fila.idEscala}
                  className={fila.activo ? "even:bg-gray-50" : "bg-gray-100 text-gray-400"}
                >
                  <td className="border bg-gray-100 px-3 py-2 font-medium">
                    {fila.cantidad.toLocaleString("es-MX")}
                  </td>

                  {matriz.procesos.map((proceso) => {
                    const clave = `${fila.idEscala}:${proceso.id}`;
                    const celda = fila.celdas[String(proceso.id)];

                    return (
                      <td
                        key={clave}
                        className={`border px-3 py-2 text-center ${
                          proceso.inerte ? "bg-amber-50/60" : ""
                        }`}
                      >
                        {editando ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={textos[clave] ?? ""}
                            onChange={(e) =>
                              actualizarTexto(fila.idEscala, proceso.id, e.target.value)
                            }
                            onKeyDown={handleKeyDown}
                            className="w-20 rounded-lg border px-2 py-1 text-center focus:border-blue-500 focus:outline-none"
                            placeholder="0"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={
                                celda?.piezas == null
                                  ? "text-gray-300"
                                  : "font-semibold text-gray-700"
                              }
                            >
                              {celda?.piezas == null ? "—" : celda.piezas.toLocaleString("es-MX")}
                            </span>
                            {celda?.id && (
                              <BotonAuditoria
                                tabla="merma_config"
                                id={celda.id}
                                etiqueta={`Historial de ${proceso.nombre} para ${fila.cantidad} piezas`}
                              />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="border px-3 py-2 text-center">
                    <button
                      onClick={() => cambiarEstadoEscala(fila)}
                      disabled={editando}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        fila.activo
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      } disabled:opacity-50`}
                    >
                      {fila.activo ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editando && (
          <p className="mt-4 text-sm text-gray-500">
            Presiona <strong>Enter</strong> o <strong>Guardar cambios</strong> para
            confirmar. Deja la celda vacía si ese concepto no aporta merma.
          </p>
        )}

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <p className="mb-1 font-semibold text-gray-700">Cómo se aplica</p>
          <p>
            Se toma el escalón <strong>más cercano</strong> a la cantidad pedida; desde
            el punto medio sube al siguiente (749 → 500, 750 → 1000). Se suma siempre la{" "}
            <strong>merma base</strong> más los conceptos de los procesos que lleve el
            producto. El total se suma una sola vez al crear la orden de producción.
          </p>
        </div>
      </div>

      {/* ── Simulador ────────────────────────────────────────────────────── */}
      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-1 text-lg font-semibold">Simulador</h2>
        <p className="mb-4 text-xs text-gray-500">
          Verifica qué escalón le toca a una cantidad. Sin orden asociada solo se
          considera la merma base.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            inputMode="numeric"
            value={cantidadSimular}
            onChange={(e) => /^\d*$/.test(e.target.value) && setCantidadSimular(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ejecutarSimulacion()}
            placeholder="Cantidad, ej. 750"
            className="w-44 rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={ejecutarSimulacion}
            disabled={simulando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {simulando ? "Calculando..." : "Simular"}
          </button>
        </div>

        {simulacion && (
          <div className="mt-4 rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Dato etiqueta="Cantidad" valor={simulacion.cantidad_pedida.toLocaleString("es-MX")} />
              <Dato
                etiqueta="Escalón aplicado"
                valor={simulacion.escala ? simulacion.escala.cantidad.toLocaleString("es-MX") : "—"}
              />
              <Dato etiqueta="Merma" valor={`+${simulacion.merma_total.toLocaleString("es-MX")}`} />
              <Dato
                etiqueta="A producir"
                valor={simulacion.cantidad_a_producir.toLocaleString("es-MX")}
                destacado
              />
            </div>

            {simulacion.desglose.length > 0 && (
              <div className="mt-3 border-t border-gray-200 pt-3">
                <p className="mb-1.5 text-xs font-semibold text-gray-700">Desglose</p>
                <ul className="space-y-0.5 text-xs text-gray-600">
                  {simulacion.desglose.map((d) => (
                    <li key={d.clave} className="flex justify-between">
                      <span>{d.nombre}</span>
                      <span className="font-medium">+{d.piezas.toLocaleString("es-MX")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {simulacion.advertencias.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-xs text-amber-700">
                {simulacion.advertencias.map((a, i) => (
                  <li key={i}>· {a}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de confirmación ────────────────────────────────────────── */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[380px] rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-red-600">Confirmar cambios</h3>
            <p className="mb-4 text-sm text-gray-700">
              Estás a punto de modificar la merma de producción. Las órdenes ya creadas
              no cambian, solo las nuevas.
              <br />
              <strong>¿Deseas continuar?</strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                disabled={guardando}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambios}
                disabled={guardando}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
}

function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{etiqueta}</p>
      <p className={`text-lg ${destacado ? "font-bold text-blue-700" : "font-semibold text-gray-800"}`}>
        {valor}
      </p>
    </div>
  );
}